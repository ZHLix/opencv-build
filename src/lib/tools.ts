import { opencvModules } from './env'
import { dirs } from './dirs'
import { AutoBuildFile } from './types'
import log from 'npmlog'
import { existsSync, readFileSync } from 'fs'
import { getLibsFactory } from './getLibsFactory'
import { exec, execSync, spawn, SpawnOptions } from 'child_process'

export const isWin = () => process.platform == 'win32'
export const isOSX = () => process.platform == 'darwin'
export const isUnix = () => !isWin() && !isOSX()

/**
 * 读取自动构建文件
 */
export const readAutoBuildFile = (): AutoBuildFile | undefined => {
  try {
    if (!existsSync(dirs.autoBuildFile)) {
      log.info('readAutoBuildFile', 'file does not exists: %s', dirs.autoBuildFile)
      return
    }

    const autoBuildFile = JSON.parse(readFileSync(dirs.autoBuildFile, { encoding: 'utf-8' })) as AutoBuildFile
    if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
      throw new Error('auto-build.json has invalid contents')
    }
    return autoBuildFile
  } catch (err: any) {
    log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', dirs.autoBuildFile, err.toString())
  }
}

export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules })

/**
 * 检查已安装的库
 */
export const checkInstalledLibs = (autoBuildFile: AutoBuildFile) => {
  let hasLibs = true

  log.info('install', 'checking for opencv libraries')

  if (!existsSync(dirs.opencvLibDir)) {
    log.info('install', 'library dir does not exist:', dirs.opencvLibDir)
    return
  }
  const installedLibs = getLibs(dirs.opencvLibDir)

  autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
    if (!libPath) {
      log.info('install', '%s: %s', opencvModule, 'ignored')
      return
    }
    const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule)
    hasLibs = hasLibs && !!foundLib
    log.info('install', '%s: %s', opencvModule, foundLib ? foundLib.libPath : 'not found')
  })

  return hasLibs
}

export const execCmd = async (cmd: string, args: ReadonlyArray<string> = [], options: SpawnOptions = {}) => {
  return new Promise((resolve, reject) => {
    const res = spawn(cmd, args, options)
    res.stdout?.pipe(process.stdout)
    res.stderr?.pipe(process.stderr)
    res.on('error', err => reject(err))
    res.on('close', code => resolve(code))
  })
}

/**
 * 检查命令行工具是否存在
 */
function requireCmd(cmd: string, hint: string) {
  log.info('install', `executing: ${cmd}`)
  try {
    const res = execSync(cmd)
    log.info('install', `${cmd}: ${res.toString()}`)
    log.info('install', hint)
  } catch (err: any) {
    const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`
    throw new Error(errMessage)
  }
}

/**
 * 检查 git 是否已安装
 */
export async function requireGit() {
  await requireCmd('git --version', 'git is required')
}

/**
 * 检查 cmake 是否已安装
 */
export async function requireCmake() {
  await requireCmd('cmake --version', 'cmake is required to build opencv')
}
