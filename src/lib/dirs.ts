import { join, resolve } from 'path'

/**
 * 根路径（工作目录）
 */
const rootDir = process.cwd()
/**
 * 包路径
 */
const packDir = resolve(__dirname, '..')

const opencvRoot = join(rootDir, 'opencv')
const opencvSrc = join(opencvRoot, 'opencv')
const opencvContribSrc = join(opencvRoot, 'opencv_contrib')
const opencvContribModules = join(opencvContribSrc, 'modules')
const opencvBuild = join(opencvRoot, 'build')
const opencvInclude = join(opencvBuild, 'include')
const opencv4Include = join(opencvInclude, 'opencv4')
const opencvLibDir = process.platform == 'win32' ? join(opencvBuild, 'lib/Release') : join(opencvBuild, 'lib')
const opencvBinDir = process.platform == 'win32' ? join(opencvBuild, 'bin/Release') : join(opencvBuild, 'bin')
const autoBuildFile = join(opencvRoot, 'auto-build.json')

export const dirs = {
  rootDir,
  packDir,
  opencvRoot,
  opencvSrc,
  opencvContribSrc,
  opencvContribModules,
  opencvBuild,
  opencvInclude,
  opencv4Include,
  opencvLibDir,
  opencvBinDir,
  autoBuildFile,
}
