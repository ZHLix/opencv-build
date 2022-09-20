import { existsSync, readdirSync, realpathSync } from 'fs';
import { resolve } from 'path';
import { OpencvModule } from './types';

const worldModule = 'world';

export function getLibsFactory(
  args: { opencvModules: string[], isWin: () => boolean, isOSX: () => boolean }
): (libDir: string) => OpencvModule[] {

  const { opencvModules, isWin, isOSX } = args

  function getLibPrefix() {
    return isWin() ? 'opencv_' : 'libopencv_'
  }

  function getLibSuffix() {
    return isWin() ? 'lib' : (isOSX() ? 'dylib' : 'so')
  }

  function getLibNameRegex(opencvModuleName: string) {
    return new RegExp(`^${getLibPrefix()}${opencvModuleName}[0-9]{0,3}.${getLibSuffix()}$`)
  }

  function createLibResolver(libDir: string): (libFile: string) => string | undefined {
    function getLibAbsPath(libFile: string | undefined): string | undefined {
      return (
        libFile
          ? realpathSync(resolve(libDir, libFile))
          : undefined
      )
    }

    function matchLibName(libFile: string, opencvModuleName: string) {
      return !!(libFile.match(getLibNameRegex(opencvModuleName)) || [])[0]
    }

    const libFiles = readdirSync(libDir) as string[]

    return function (opencvModuleName: string) {
      return getLibAbsPath(libFiles.find(libFile => matchLibName(libFile, opencvModuleName)))
    }
  }

  return function (libDir: string) {
    if (!existsSync(libDir)) {
      throw new Error(`specified lib dir does not exist: ${libDir}`)
    }

    const resolveLib = createLibResolver(libDir)

    const worldLibPath = resolveLib(worldModule)
    if (worldLibPath) {
      return [{
        opencvModule: worldModule,
        libPath: worldLibPath
      }]
    }

    return (opencvModules as string[]).map(
      opencvModule => ({
        opencvModule,
        libPath: resolveLib(opencvModule)
      })
    )
  }
}
