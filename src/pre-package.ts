import { randomUUID } from 'crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readlinkSync, renameSync, statSync, symlinkSync } from 'fs'
import { basename, dirname, join } from 'path'
import rimraf from 'rimraf'
import glob from 'tiny-glob'

const getList = (baseDir: string, tmpDir: string) => {
  const list = {
    // mac
    // linux
    linux: [
      { source: join(baseDir, 'lib/*.*'), dest: join(tmpDir, 'lib') },
      { source: join(baseDir, 'include/opencv4'), dest: join(tmpDir, 'include/opencv4') },
      { source: join(baseDir, 'share/opencv4/haarcascades'), dest: join(tmpDir, 'etc/haarcascades') },
      { source: join(baseDir, 'share/opencv4/lbpcascades'), dest: join(tmpDir, 'etc/lbpcascades') },
      { source: join(baseDir, 'share/opencv4/quality'), dest: join(tmpDir, 'etc/quality') },
    ],
    // win
    win32: [
      { source: join(baseDir, 'bin/Release/*.dll'), dest: join(tmpDir, 'bin') },
      { source: join(baseDir, 'lib/Release/*.lib'), dest: join(tmpDir, 'lib') },
      { source: join(baseDir, 'include/opencv2'), dest: join(tmpDir, 'include/opencv2') },
      { source: join(baseDir, 'etc/haarcascades'), dest: join(tmpDir, 'etc/haarcascades') },
      { source: join(baseDir, 'etc/lbpcascades'), dest: join(tmpDir, 'etc/lbpcascades') },
      { source: join(baseDir, 'etc/quality'), dest: join(tmpDir, 'etc/quality') },
    ],
  }
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return list.linux
    case 'win32':
      return list.win32
    default:
      throw new Error('不支持的操作系统')
  }
}

const mkdirIfNotExist = (path: string) => !existsSync(path) && mkdirSync(path, { recursive: true })

const getType = (path: string) => {
  try {
    readlinkSync(path)
    return 'link'
  } catch (e) {
    const stat = statSync(path)
    if (stat.isFile()) return 'file'
    if (stat.isDirectory()) return 'dir'
    return undefined
  }
}

const copy = async (source: string, dest: string) => {
  let sources: string[]
  if (process.platform == 'win32' && source.indexOf('*') > -1) {
    sources = await glob(basename(source), { cwd: dirname(source) }).then(res => res.map(v => join(dirname(source), v)))
  } else {
    sources = await glob(source)
  }
  console.log({ [source]: sources })
  mkdirIfNotExist(dest)
  return Promise.all(
    sources.map(async v => {
      switch (getType(v)) {
        case 'link':
          symlinkSync(readlinkSync(v), join(dest, basename(v)))
          break
        case 'file':
          copyFileSync(v, join(dest, basename(v)))
          break
        case 'dir':
          cpSync(v, dest, { recursive: true })
          break
        default:
          throw new Error('不支持的文件类型')
      }
    }),
  )
}

const main = async () => {
  // 操作基础路径
  const baseDir = join('build/opencv/build')
  const tmpDir = join('build/opencv', 'build_' + randomUUID())
  const list = getList(baseDir, tmpDir)

  mkdirIfNotExist(tmpDir)
  await Promise.all(list.map(async ({ source, dest }) => copy(source, dest)))
  rimraf.sync(baseDir)
  renameSync(tmpDir, baseDir)
}

main()

// import rimraf from 'rimraf'

// const CleanUseless = () => {
//   const ignore = ['build/opencv/build/lib', 'build/opencv/build/include']
//   if (process.platform == 'win32') ignore.push('build/opencv/build/bin')
//   rimraf.sync('build/opencv/build/*', {
//     glob: {
//       ignore,
//     },
//   })
// }

// CleanUseless()
