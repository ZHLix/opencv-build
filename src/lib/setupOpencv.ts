import { execSync, spawn, spawnSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import log from 'npmlog'
import { join } from 'path'
import { dirs } from './dirs'
import { defaultCmakeFlags, numberOfCoresAvailable, opencvContribRepoUrl, opencvRepoUrl, version } from './env'
import { execCmd, getLibs, isWin } from './tools'
import { AutoBuildFile } from './types'

function getIfExistsDirCmd(dirname: string, exists: boolean = true): string {
  return isWin() ? `if ${!exists ? 'not ' : ''}exist ${dirname}` : ''
}

function getMkDirCmd(dirname: string): string {
  return isWin() ? `${getIfExistsDirCmd(dirname, false)} mkdir ${dirname}` : `mkdir -p ${dirname}`
}

function getRmDirCmd(dirname: string): string {
  return isWin() ? `${getIfExistsDirCmd(dirname)} rd /s /q ${dirname}` : `rm -rf ${dirname}`
}

function getSharedCmakeFlags() {
  let conditionalFlags = ['-DOPENCV_ENABLE_NONFREE=ON', `-DOPENCV_EXTRA_MODULES_PATH=${dirs.opencvContribModules}`]
  return defaultCmakeFlags.concat(conditionalFlags) // .concat(parseAutoBuildFlags())
}

function getCmakeArgs(cmakeFlags: string[]) {
  return [dirs.opencvSrc].concat(cmakeFlags)
}

function getRunBuildCmd(): () => Promise<void> {
  return async () => {
    await execCmd('make', ['install', `-j${numberOfCoresAvailable()}`], { cwd: dirs.opencvBuild })
    // revert the strange archiving of libopencv.so going on with make install
    await execCmd('make', ['all', `-j${numberOfCoresAvailable()}`], { cwd: dirs.opencvBuild })
  }
}

function writeAutoBuildFile() {
  const autoBuildFile: AutoBuildFile = {
    opencvVersion: version(),
    autoBuildFlags: '',
    modules: getLibs(dirs.opencvLibDir),
  }
  log.info('install', 'writing auto-build file into directory: %s', dirs.autoBuildFile)
  // log.info('install', JSON.stringify(autoBuildFile))
  writeFileSync(dirs.autoBuildFile, JSON.stringify(autoBuildFile, null, 2))
}

async function updateOpencvRawDownloadPath() {
  const files = [
    dirs.opencvRoot + '/opencv/3rdparty/ffmpeg/ffmpeg-download.ps1.in',
    dirs.opencvRoot + '/opencv/3rdparty/ffmpeg/ffmpeg.cmake',
    dirs.opencvRoot + '/opencv/3rdparty/ippicv/ippicv.cmake',
    dirs.opencvRoot + '/opencv_contrib/modules/face/CMakeLists.txt',
    dirs.opencvRoot + '/opencv_contrib/modules/xfeatures2d/cmake/download_boostdesc.cmake',
    dirs.opencvRoot + '/opencv_contrib/modules/xfeatures2d/cmake/download_vgg.cmake',
  ]
  files.forEach(v => {
    let content = readFileSync(v, { encoding: 'utf-8' })
    content = content
      //
      .replace(/https:\/\/raw.githubusercontent.com\/opencv\/opencv_3rdparty\//g, 'http://localhost:7100/opencv/opencv_3rdparty/raw/')

    writeFileSync(v, content)
  })
}

export default async () => {
  const cMakeFlags = getSharedCmakeFlags()

  const tag = version()
  log.info('install', 'installing opencv version %s into directory: %s', tag, dirs.opencvRoot)

  execSync(getMkDirCmd('opencv'), { cwd: dirs.rootDir })
  execSync(getRmDirCmd('build'), { cwd: dirs.opencvRoot })
  execSync(getMkDirCmd('build'), { cwd: dirs.opencvRoot })
  execSync(getRmDirCmd('opencv'), { cwd: dirs.opencvRoot })
  execSync(getRmDirCmd('opencv_contrib'), { cwd: dirs.opencvRoot })

  log.info('install', `clone ${opencvContribRepoUrl}`)
  await execCmd('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvContribRepoUrl], {
    cwd: dirs.opencvRoot,
  })
  log.info('install', `clone ${opencvRepoUrl}`)
  await execCmd('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvRepoUrl], { cwd: dirs.opencvRoot })

  await updateOpencvRawDownloadPath()

  const cmakeArgs = getCmakeArgs(cMakeFlags)
  log.info('install', 'running cmake %s', cmakeArgs)
  await execCmd('cmake', cmakeArgs, { cwd: dirs.opencvBuild })
  log.info('install', 'starting build...')
  await getRunBuildCmd()()

  writeAutoBuildFile()

  try {
    execSync(getRmDirCmd('opencv'), { cwd: dirs.opencvRoot })
  } catch (err) {
    log.error('install', 'failed to clean opencv source folder:', err)
    log.error('install', 'command was: %s', getRmDirCmd('opencv'))
    log.error('install', 'consider removing the folder yourself: %s', join(dirs.opencvRoot, 'opencv'))
  }

  try {
    await execSync(getRmDirCmd('opencv_contrib'), { cwd: dirs.opencvRoot })
  } catch (err) {
    log.error('install', 'failed to clean opencv_contrib source folder:', err)
    log.error('install', 'command was: %s', getRmDirCmd('opencv_contrib'))
    log.error('install', 'consider removing the folder yourself: %s', join(dirs.opencvRoot, 'opencv_contrib'))
  }
}
