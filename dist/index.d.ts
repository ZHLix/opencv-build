/// <reference types="node" />

/**
 * All available module fron openCV 4.5.5
 */
export declare const ALL_OPENCV_MODULES: readonly ["apps", "aruco", "bgsegm", "bioinspired", "calib3d", "ccalib", "core", "datasets", "dnn", "dnn_objdetect", "dpm", "features2d", "flann", "fuzzy", "gapi", "hfs", "highgui", "img_hash", "imgcodecs", "imgproc", "java_bindings_generator", "js", "js_bindings_generator", "line_descriptor", "ml", "objc_bindings_generator", "objdetect", "optflow", "phase_unwrapping", "photo", "python3", "python_bindings_generator", "python_tests", "reg", "rgbd", "saliency", "shape", "stereo", "stitching", "structured_light", "superres", "surface_matching", "ts", "video", "videoio", "wechat_qrcode", "world", "xobjdetect", "xphoto", "videostab", "face", "text", "tracking", "xfeatures2d", "ximgproc"];

/**
 * arguments data
 * key must be === arg
 */
export declare const ALLARGS: {
    version: ArgInfo;
    flags: ArgInfo;
    root: ArgInfo;
    buildRoot: ArgInfo;
    cuda: ArgInfo;
    nocontrib: ArgInfo;
    nobuild: ArgInfo;
    incDir: ArgInfo;
    libDir: ArgInfo;
    binDir: ArgInfo;
    keepsources: ArgInfo;
    'dry-run': ArgInfo;
    'git-cache': ArgInfo;
};

/**
 * local args parser model
 */
declare interface ArgInfo {
    arg: string;
    conf: keyof OpenCVPackageBuildOptions;
    env: string;
    isBool: boolean;
    doc: string;
}

/**
 * A basic args parser
 * @returns and openCVBuildEnvParams object containing an extra object with all unknown args
 */
export declare const args2Option: (args: string[]) => OpenCVBuildEnvParams;

export declare type AutoBuildFile = {
    opencvVersion: string;
    autoBuildFlags: string;
    modules: OpencvModule[];
    env: EnvSummery;
};

declare type boolKey = keyof OpenCVBuildEnvParamsBool;

declare class Constant {
    private readonly builder;
    constructor(builder: OpenCVBuilder);
    repoBaseUrl: string;
    opencvRepoUrl: string;
    opencvContribRepoUrl: string;
    opencv3rdPartyRepoUrl: string;
    cmakeVsCompilers: {
        [version: string]: string;
    };
    cmakeArchs: {
        [arch: string]: string;
    };
}

declare interface EnvSummery {
    opencvVersion: string;
    buildWithCuda: boolean;
    isWithoutContrib: boolean;
    isAutoBuildDisabled: boolean;
    buildRoot: string;
    autoBuildFlags: string;
    OPENCV_INCLUDE_DIR: string;
    OPENCV_LIB_DIR: string;
    OPENCV_BIN_DIR: string;
}

/**
 * generate help message
 * @returns help message as text with colors
 */
export declare const genHelp: () => string;

export declare class getLibsFactory {
    private builder;
    libFiles: string[];
    syncPath: boolean;
    constructor(builder: OpenCVBuilder);
    /**
     * list en cache file in lib folder
     * @returns files in lib directory
     */
    private listFiles;
    /**
     * lib files are prefixed differently on Unix / Windows base system.
     * @returns current OS prefix
     */
    get getLibPrefix(): string;
    /**
     * @returns lib extention based on current OS
     */
    get getLibSuffix(): 'lib' | 'dylib' | 'so';
    /**
     * build a regexp matching os lib file
     * @returns
     */
    getLibNameRegex(opencvModuleName: string): RegExp;
    /**
     * find a lib
     */
    resolveLib(opencvModuleName: OpencvModulesType): string;
    /**
     * Match lib file names in a folder, was part of resolveLib, but was splitted for easy testing
     * @returns full path to looked up lib file
     */
    matchLib(opencvModuleName: string, libDir: string, libFiles: string[]): string;
    getLibs(): OpencvModule[];
}

export declare class OpenCVBuildEnv implements OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString {
    #private;
    private opts;
    prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion';
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION , or --version or autoBuildOpencvVersion option in package.json
     */
    opencvVersion: string;
    /**
     * set using env OPENCV4NODEJS_BUILD_CUDA , or --cuda or autoBuildBuildCuda option in package.json
     */
    buildWithCuda: boolean;
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB, or --nocontrib arg, or autoBuildWithoutContrib option in package.json
     */
    isWithoutContrib: boolean;
    /**
     * set using env OPENCV4NODEJS_DISABLE_AUTOBUILD, or --nobuild arg or disableAutoBuild option in package.json
     */
    isAutoBuildDisabled: boolean;
    /**
     * set using --keepsources arg or keepsources option in package.json
     */
    keepsources: boolean;
    /**
     * set using --dry-run arg or dry-run option in package.json
     */
    dryRun: boolean;
    gitCache: boolean;
    autoBuildFlags: string;
    rootcwd?: string;
    buildRoot: string;
    packageRoot: string;
    protected _platform: NodeJS.Platform;
    private no_autobuild;
    private resolveValue;
    constructor(opts?: OpenCVBuildEnvParams);
    /**
     * complet initialisation.
     */
    private getReady;
    get enabledModules(): OpencvModulesType[];
    enableModule(mod: OpencvModulesType): void;
    disableModule(mod: OpencvModulesType): void;
    /**
     * @returns return cmake flags like: -DBUILD_opencv_modules=ON ...
     */
    getCmakeBuildFlags(): string[];
    getSharedCmakeFlags(): string[];
    getCongiguredCmakeFlags(): string[];
    dumpEnv(): EnvSummery;
    private static getPackageJson;
    /**
     * extract opencv4nodejs section from package.json if available
     */
    private static parsePackageJson;
    numberOfCoresAvailable(): number;
    /**
     * get opencv4nodejs section from package.json if available
     * @returns opencv4nodejs customs
     */
    static readEnvsFromPackageJson(): {
        [key: string]: string | boolean | number;
    } | null;
    /**
     * openCV uniq version prostfix, used to avoid build path colision.
     */
    get optHash(): string;
    listBuild(): Array<{
        autobuild: string;
        dir: string;
        date: Date;
    }>;
    get platform(): NodeJS.Platform;
    get isWin(): boolean;
    get rootDir(): string;
    get opencvRoot(): string;
    get opencvGitCache(): string;
    get opencvContribGitCache(): string;
    get opencvSrc(): string;
    get opencvContribSrc(): string;
    get opencvContribModules(): string;
    get opencvBuild(): string;
    get opencvInclude(): string;
    get opencv4Include(): string;
    get opencvIncludeDir(): string;
    get opencvLibDir(): string;
    get opencvBinDir(): string;
    get autoBuildFile(): string;
    readAutoBuildFile(): AutoBuildFile | undefined;
    private readAutoBuildFile2;
}

export declare interface OpenCVBuildEnvParams extends OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString {
    /**
     * Allow speedup API usage by allowing direct access to a preexisting build
     */
    prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion';
    extra?: {
        [key: string]: string;
    };
}

/**
 * options passed to OpenCVBuildEnv constructor
 * highest priority values
 */
declare interface OpenCVBuildEnvParamsBool {
    autoBuildBuildCuda?: boolean;
    autoBuildWithoutContrib?: boolean;
    disableAutoBuild?: boolean;
    keepsources?: boolean;
    'dry-run'?: boolean;
    'git-cache'?: boolean;
}

declare interface OpenCVBuildEnvParamsString {
    /**
     * OpenCV-build root directory, deprecated in favor of buildRoot
     */
    rootcwd?: string;
    /**
     * OpenCV build directory, this directory will be populate with a folder per build, permiting to reused previous build.
     */
    buildRoot?: string;
    /**
     * OpenCV version to build
     */
    autoBuildOpencvVersion?: string;
    /**
     * OpenCV cMake Build flags
     */
    autoBuildFlags?: string;
    /**
     * OpenCV include directory
     * looks like: opencv/build/include
     */
    opencvIncludeDir?: string;
    /**
     * OpenCV library directory
     * looks like: opencv/build/.../lib
     */
    opencvLibDir?: string;
    /**
     * OpenCV bin directory
     * looks like: opencv/build/.../bin
     */
    opencvBinDir?: string;
}

declare class OpenCVBuilder {
    readonly constant: Constant;
    readonly getLibs: getLibsFactory;
    readonly env: OpenCVBuildEnv;
    constructor(opts?: OpenCVBuildEnv | OpenCVBuildEnvParams | string[]);
    private checkInstalledLibs;
    install(): Promise<void>;
}
export { OpenCVBuilder }
export default OpenCVBuilder;

export declare type OpencvModule = {
    opencvModule: string;
    libPath: string | undefined;
};

/**
 * type of valid openCV Modules
 */
export declare type OpencvModulesType = typeof ALL_OPENCV_MODULES[number];

/**
 * Options as usable in opencv4nodejs section from package.json
 * Middle priority values
 */
declare type OpenCVPackageBuildOptions = {
    [key in boolKey | stringKey]?: string;
};

declare type stringKey = keyof OpenCVBuildEnvParamsString;

export { }
