import log from 'npmlog'
import { version } from './lib/env'
import { dirs } from './lib/dirs'
import { checkInstalledLibs, readAutoBuildFile, requireCmake, requireGit } from './lib/tools'
import setupOpencv from './lib/setupOpencv'

export const install = async () => {
  try {
    // 防止每次安装时重建
    const autoBuildFile = readAutoBuildFile()
    // 检查 opencv 是否已安装
    if (!autoBuildFile) {
      log.info('install', `failed to find auto-build.json: ${dirs.autoBuildFile}`)
      throw 'running install script'
    }

    log.info('install', `found auto-build.json: ${dirs.autoBuildFile}`)

    // 检查 opencv 版本
    if (autoBuildFile.opencvVersion !== version()) {
      log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=${version()}`)
      throw 'reinstall'
    }
    // 检查 opencv 库文件
    if (!checkInstalledLibs(autoBuildFile)) {
      log.info('install', 'missing some libraries')
      throw 'reinstall'
    }

    log.info('install', 'found all libraries')
    return
  } catch (e) {
    log.info('install', '')
    log.info('install', 'running install script...')
    log.info('install', '')
    log.info('install', 'opencv version: %s', version())
    log.info('install', 'with opencv contrib: %s', 'yes')
    log.info('install', 'custom build flags: %s', '')
    log.info('install', '')

    try {
      await requireGit()
      await requireCmake()
      await setupOpencv()
    } catch (err: any) {
      log.error('error', err)
      process.exit(1)
    }
  }
}
