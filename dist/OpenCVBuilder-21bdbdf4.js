'use strict';

var utils = require('./utils-9d03e134.js');
var fs = require('fs');
var log = require('npmlog');
var path = require('path');
var os = require('os');
var blob = require('tiny-glob');
var rimraf = require('rimraf');
var util = require('util');
var crypto = require('crypto');
var blob$1 = require('tiny-glob/sync');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var log__default = /*#__PURE__*/_interopDefaultLegacy(log);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var blob__default = /*#__PURE__*/_interopDefaultLegacy(blob);
var rimraf__default = /*#__PURE__*/_interopDefaultLegacy(rimraf);
var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);
var blob__default$1 = /*#__PURE__*/_interopDefaultLegacy(blob$1);

class getLibsFactory {
    builder;
    libFiles = [];
    syncPath = true;
    constructor(builder) {
        this.builder = builder;
    }
    /**
     * list en cache file in lib folder
     * @returns files in lib directory
     */
    listFiles() {
        if (this.libFiles && this.libFiles.length)
            return this.libFiles;
        const libDir = this.builder.env.opencvLibDir;
        this.libFiles = fs__default["default"].readdirSync(libDir);
        return this.libFiles;
    }
    /**
     * lib files are prefixed differently on Unix / Windows base system.
     * @returns current OS prefix
     */
    get getLibPrefix() {
        return this.builder.env.isWin ? 'opencv_' : 'libopencv_';
    }
    /**
     * @returns lib extention based on current OS
     */
    get getLibSuffix() {
        switch (this.builder.env.platform) {
            case 'win32':
                return 'lib';
            case 'darwin':
                return 'dylib';
            default:
                return 'so';
        }
    }
    /**
     * build a regexp matching os lib file
     * @returns
     */
    getLibNameRegex(opencvModuleName) {
        const regexp = `^${this.getLibPrefix}${opencvModuleName}[0-9.]*\\.${this.getLibSuffix}$`;
        return new RegExp(regexp);
    }
    /**
     * find a lib
     */
    resolveLib(opencvModuleName) {
        const libDir = this.builder.env.opencvLibDir;
        const libFiles = this.listFiles();
        return this.matchLib(opencvModuleName, libDir, libFiles);
    }
    /**
     * Match lib file names in a folder, was part of resolveLib, but was splitted for easy testing
     * @returns full path to looked up lib file
     */
    matchLib(opencvModuleName, libDir, libFiles) {
        const regexp = this.getLibNameRegex(opencvModuleName);
        const match = libFiles.find((libFile) => !!(libFile.match(regexp) || [])[0]);
        if (!match)
            return '';
        let fullpath = path__default["default"].resolve(libDir, match);
        if (this.syncPath)
            fullpath = fs__default["default"].realpathSync(fullpath);
        return fullpath;
    }
    getLibs() {
        const libDir = this.builder.env.opencvLibDir;
        if (!fs__default["default"].existsSync(libDir)) {
            throw new Error(`specified lib dir does not exist: ${libDir}`);
        }
        const worldModule = 'world';
        const worldLibPath = this.resolveLib(worldModule);
        if (worldLibPath) {
            return [{
                    opencvModule: worldModule,
                    libPath: worldLibPath,
                }];
        }
        return [...this.builder.env.enabledModules].map((opencvModule) => ({
            opencvModule,
            libPath: this.resolveLib(opencvModule),
        }));
    }
}

/**
 * @returns take the last MSBuild.exe version in PROGRAMFILES
 */
async function findMSBuild() {
    const progFiles = new Set([process.env.programfiles, process.env.ProgramW6432, process.env['programfiles(x86)']]);
    const matches = [];
    for (const progFile of progFiles) {
        if (progFile) {
            try {
                const cwd = `${progFile.replace(/\\/g, '/')}/Microsoft Visual Studio`;
                const reg = `*/*/MSBuild/*/Bin/MSBuild.exe`;
                for (const m of await blob__default["default"](reg, { cwd })) {
                    matches.push(path.join(cwd, m));
                }
            }
            catch (e) {
                continue;
            }
        }
    }
    matches.sort();
    if (!matches.length) {
        return Promise.reject('no Microsoft Visual Studio found in program files directorys');
    }
    if (matches.length > 1) {
        log__default["default"].warn('find-msbuild', `find ${utils.formatNumber('' + matches.length)} MSBuild version: [${matches.map(path => utils.light(path)).join(', ')}]`);
    }
    log__default["default"].silly('find-msbuild', matches.join(', '));
    const selected = matches[matches.length - 1];
    const txt = await utils.execFile(selected, ['/version']);
    const m = txt.match(/(\d+)\.\d+/);
    if (!m)
        return Promise.reject('fail to get MSBuild.exe version number');
    const build = {
        path: selected,
        version: Number(m[1]),
    };
    log__default["default"].silly('find-msbuild', 'using following msbuild:');
    log__default["default"].silly('find-msbuild', 'version:', build.version);
    log__default["default"].silly('find-msbuild', 'path:', build.path);
    return build;
}
async function findMsBuild() {
    return await findMSBuild();
}

/**
 * list of variables needed to link and use openCV
 */
const OPENCV_PATHS_ENV = ['OPENCV_BIN_DIR', 'OPENCV_INCLUDE_DIR', 'OPENCV_LIB_DIR'];
/**
 * arguments data
 * key must be === arg
 */
const ALLARGS = {
    version: { arg: 'version', conf: 'autoBuildOpencvVersion', env: 'OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION', isBool: false, doc: 'OpenCV version' },
    flags: { arg: 'flags', conf: 'autoBuildFlags', env: 'OPENCV4NODEJS_AUTOBUILD_FLAGS', isBool: false, doc: 'OpenCV cMake Build flags' },
    root: { arg: 'root', conf: 'rootcwd', env: 'INIT_CWD', isBool: false, doc: 'OpenCV-build root directory (deprecated)' },
    buildRoot: { arg: 'buildRoot', conf: 'buildRoot', env: 'OPENCV_BUILD_ROOT', isBool: false, doc: 'OpenCV build directory' },
    cuda: { arg: 'cuda', conf: 'autoBuildBuildCuda', env: 'OPENCV4NODEJS_BUILD_CUDA', isBool: true, doc: 'Enable cuda in OpenCV build' },
    nocontrib: { arg: 'nocontrib', conf: 'autoBuildWithoutContrib', env: 'OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB', isBool: true, doc: 'Do not compile Contrib modules' },
    nobuild: { arg: 'nobuild', conf: 'disableAutoBuild', env: 'OPENCV4NODEJS_DISABLE_AUTOBUILD', isBool: true, doc: 'Do build OpenCV' },
    incDir: { arg: 'incDir', conf: 'opencvIncludeDir', env: 'OPENCV_INCLUDE_DIR', isBool: false, doc: 'OpenCV include directory' },
    libDir: { arg: 'libDir', conf: 'opencvLibDir', env: 'OPENCV_LIB_DIR', isBool: false, doc: 'OpenCV library directory' },
    binDir: { arg: 'binDir', conf: 'opencvBinDir', env: 'OPENCV_BIN_DIR', isBool: false, doc: 'OpenCV bin directory' },
    keepsources: { arg: 'keepsources', conf: 'keepsources', isBool: true, doc: 'Keepsources OpenCV source after build' },
    'dry-run': { arg: 'dry-run', conf: 'dry-run', isBool: true, doc: 'Display command line use to build library' },
    'git-cache': { arg: 'git-cache', conf: 'git-cache', env: 'OPENCV_GIT_CACHE', isBool: true, doc: 'Reduce Bandwide usage, by keeping a local git souce un the buildRoot' },
};
/**
 * generate help message
 * @returns help message as text with colors
 */
const genHelp = () => {
    return Object.values(ALLARGS).map(a => {
        const name = `--${a.arg}${!a.isBool ? ' <value>' : ''}`;
        const envWay = a.env ? ` (${a.env} env variable)` : '';
        return `   ${name.padEnd(20)} ${a.doc.padEnd(40)}${envWay}`;
    }).join('\n');
};
/**
 * A basic args parser
 * @returns and openCVBuildEnvParams object containing an extra object with all unknown args
 */
const args2Option = (args) => {
    const out = { extra: {} };
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg.startsWith('--')) {
            arg = arg.substring(2);
        }
        else if (arg.startsWith('-')) {
            arg = arg.substring(1);
        }
        else {
            continue;
        }
        const p = arg.indexOf('=');
        const name = ((p === -1) ? arg : arg.substring(0, p));
        const info = ALLARGS[name];
        if (!info) {
            // keep unknown args in extras
            const val = (p > 0) ? arg.substring(p + 1) : (i + 1 < args.length) ? args[i + 1] : '1';
            if (out.extra)
                out.extra[name] = val;
            continue;
        }
        if (info.isBool) {
            out[info.conf] = true;
            continue;
        }
        const val = (p > 0) ? arg.substring(p + 1) : args[++i];
        if (val)
            out[info.conf] = val;
    }
    // encvIncludeDir?: string;
    return out;
};
/**
 * All available module fron openCV 4.5.5
 */
const ALL_OPENCV_MODULES = ['apps', 'aruco', 'bgsegm', 'bioinspired', 'calib3d', 'ccalib',
    'core', 'datasets', 'dnn', 'dnn_objdetect', 'dpm', 'features2d', 'flann', 'fuzzy',
    'gapi', 'hfs', 'highgui', 'img_hash', 'imgcodecs', 'imgproc', 'java_bindings_generator',
    'js', 'js_bindings_generator', 'line_descriptor', 'ml', 'objc_bindings_generator',
    'objdetect', 'optflow', 'phase_unwrapping', 'photo', 'python3', 'python_bindings_generator',
    'python_tests', 'reg', 'rgbd', 'saliency', 'shape', 'stereo', 'stitching', 'structured_light',
    'superres', 'surface_matching', 'ts', 'video', 'videoio', 'wechat_qrcode', 'world',
    'xobjdetect', 'xphoto',
    // olds:
    'videostab', 'face', 'text', 'tracking', 'xfeatures2d', 'ximgproc',
];
const defaultEnabledModules = ['calib3d', 'core', 'dnn', 'features2d', 'flann', 'gapi', 'highgui', 'imgcodecs', 'imgproc',
    'ml', 'objdetect', 'photo', 'python_tests', 'video', 'videoio',
    // olds:
    'videostab', 'face', 'text', 'tracking', 'xfeatures2d', 'ximgproc',
];

const primraf = util.promisify(rimraf__default["default"]);
class SetupOpencv {
    builder;
    constructor(builder) {
        this.builder = builder;
    }
    getMsbuildCmd(sln) {
        return [sln, '/p:Configuration=Release', `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`];
    }
    async runBuildCmd(msbuildExe) {
        const env = this.builder.env;
        if (msbuildExe) {
            if (!fs__default["default"].existsSync(msbuildExe)) {
                log__default["default"].error('install', 'invalid msbuildExe path" %s', msbuildExe);
                throw Error('invalid msbuildExe path ' + msbuildExe);
            }
            const buildSLN = this.getMsbuildCmd('./OpenCV.sln');
            let args = utils.toExecCmd(msbuildExe, buildSLN);
            this.execLog.push(`cd ${utils.protect(env.opencvBuild)}`);
            this.execLog.push(args);
            if (!env.dryRun) {
                log__default["default"].info('install', 'spawning in %s: %s', env.opencvBuild, args);
                await utils.spawn(`${msbuildExe}`, buildSLN, { cwd: env.opencvBuild });
            }
            const buildVcxproj = this.getMsbuildCmd('./INSTALL.vcxproj');
            args = utils.toExecCmd(msbuildExe, buildVcxproj);
            this.execLog.push(`${args}`);
            if (!env.dryRun) {
                log__default["default"].info('install', 'spawning in %s: %s', env.opencvBuild, args);
                await utils.spawn(`${msbuildExe}`, buildVcxproj, { cwd: env.opencvBuild });
            }
        }
        else {
            this.execLog.push(`cd ${utils.protect(env.opencvBuild)}`);
            this.execLog.push(`make install -j${env.numberOfCoresAvailable()}`);
            if (!env.dryRun) {
                log__default["default"].info('install', 'spawning in %s: make', env.opencvBuild);
                await utils.spawn('make', ['install', `-j${env.numberOfCoresAvailable()}`], { cwd: env.opencvBuild });
            }
            this.execLog.push(`make all -j${env.numberOfCoresAvailable()}`);
            // revert the strange archiving of libopencv.so going on with make install
            if (!env.dryRun) {
                log__default["default"].info('install', 'spawning in %s: make all', env.opencvBuild);
                await utils.spawn('make', ['all', `-j${env.numberOfCoresAvailable()}`], { cwd: env.opencvBuild });
            }
        }
    }
    getWinCmakeFlags(msversion) {
        const cmakeVsCompiler = this.builder.constant.cmakeVsCompilers[msversion];
        const cmakeArch = this.builder.constant.cmakeArchs[process.arch];
        if (!cmakeVsCompiler) {
            throw new Error(`no cmake Visual Studio compiler found for msversion: ${msversion}`);
        }
        if (!cmakeArch) {
            throw new Error(`no cmake arch found for process.arch: ${process.arch}`);
        }
        let GFlag = [];
        if (Number(msversion) <= 15)
            GFlag = ['-G', `${cmakeVsCompiler} ${cmakeArch}`];
        else
            GFlag = ['-G', `${cmakeVsCompiler}`];
        return GFlag.concat(this.builder.env.getSharedCmakeFlags());
    }
    getCmakeArgs(cmakeFlags) {
        return [this.builder.env.opencvSrc].concat(cmakeFlags);
    }
    async getMsbuildIfWin() {
        if (this.builder.env.isWin) {
            const msbuild = await findMsBuild();
            log__default["default"].info('install', `using msbuild: ${utils.formatNumber('%s')} path: ${utils.highlight('%s')}`, msbuild.version, msbuild.path);
            return msbuild;
        }
        return undefined;
    }
    /**
     * Write Build Context to disk, to avoid further rebuild
     * @returns AutoBuildFile
     */
    writeAutoBuildFile(overwrite) {
        const env = this.builder.env;
        const autoBuildFile = {
            opencvVersion: env.opencvVersion,
            autoBuildFlags: env.autoBuildFlags,
            modules: this.builder.getLibs.getLibs(),
            env: this.builder.env.dumpEnv(),
        };
        log__default["default"].info('install', `writing auto-build file into directory: ${utils.highlight('%s')}`, env.autoBuildFile);
        // log.info('install', JSON.stringify(autoBuildFile))
        fs__default["default"].mkdirSync(env.opencvRoot, { recursive: true });
        if (!overwrite) {
            const old = env.readAutoBuildFile();
            if (old)
                return old;
        }
        fs__default["default"].writeFileSync(env.autoBuildFile, JSON.stringify(autoBuildFile, null, 4));
        return autoBuildFile;
    }
    execLog = [];
    async updateOpencvRawDownloadPath() {
        const env = this.builder.env;
        const files = [
            env.opencvRoot + '/opencv/3rdparty/ffmpeg/ffmpeg-download.ps1.in',
            env.opencvRoot + '/opencv/3rdparty/ffmpeg/ffmpeg.cmake',
            env.opencvRoot + '/opencv/3rdparty/ippicv/ippicv.cmake',
            env.opencvRoot + '/opencv/samples/dnn/face_detector/weights.meta4',
            env.opencvRoot + '/opencv_contrib/modules/face/CMakeLists.txt',
            env.opencvRoot + '/opencv_contrib/modules/xfeatures2d/cmake/download_boostdesc.cmake',
            env.opencvRoot + '/opencv_contrib/modules/xfeatures2d/cmake/download_vgg.cmake',
            env.opencvRoot + '/opencv/modules/gapi/cmake/DownloadADE.cmake',
        ];
        files.forEach(v => {
            if (!fs.existsSync(v))
                return;
            let content = fs.readFileSync(v, { encoding: 'utf-8' });
            content = content
                //
                .replace(/https:\/\/raw.githubusercontent.com\/opencv\/opencv_3rdparty\//g, `${this.builder.constant.repoBaseUrl}/opencv/opencv_3rdparty/raw/`)
                .replace(/https:\/\/github.com\//g, `${this.builder.constant.repoBaseUrl}/`);
            fs.writeFileSync(v, content);
        });
    }
    /**
     * clone OpenCV repo
     * build OpenCV
     * delete source files
     */
    async start() {
        this.execLog = [];
        const env = this.builder.env;
        const msbuild = await this.getMsbuildIfWin();
        let cMakeFlags = [];
        let msbuildPath = undefined;
        // Get cmake flags here to check for CUDA early on instead of the start of the building process
        if (env.isWin) {
            if (!msbuild)
                throw Error('Error getting Ms Build info');
            cMakeFlags = this.getWinCmakeFlags('' + msbuild.version);
            msbuildPath = msbuild.path;
        }
        else {
            cMakeFlags = this.builder.env.getSharedCmakeFlags();
        }
        const tag = env.opencvVersion;
        log__default["default"].info('install', `installing opencv version ${utils.formatNumber('%s')} into directory: ${utils.highlight('%s')}`, tag, env.opencvRoot);
        log__default["default"].info('install', `Cleaning old build: src, build and contrib-src directories`);
        try {
            for (const k of OPENCV_PATHS_ENV) {
                const v = process.env[k];
                if (v) {
                    const setEnv = process.platform === 'win32' ? '$Env:' : 'export ';
                    this.execLog.push(`${setEnv}${k}=${utils.protect(v)}`);
                }
            }
            // clean up
            const dirs = [env.opencvBuild, env.opencvSrc, env.opencvContribSrc];
            this.execLog.push(utils.toExecCmd('rimraf', dirs));
            for (const dir of dirs)
                await primraf(dir);
            // ensure build dir exists
            this.execLog.push(utils.toExecCmd('mkdir', ['-p', env.opencvBuild]));
            fs__default["default"].mkdirSync(env.opencvBuild, { recursive: true });
            // hide detached HEAD message.
            const gitFilter = (data) => {
                const asTxt = data.toString();
                if (asTxt.includes('detached HEAD'))
                    return null;
                if (asTxt.includes('--depth is ignored in local clones'))
                    return null;
                return data;
            };
            if (env.isWithoutContrib) {
                this.execLog.push(utils.toExecCmd('cd', [env.opencvRoot]));
                log__default["default"].info('install', `skipping download of opencv_contrib since ${utils.highlight('OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB')} is set`);
            }
            else {
                let opencvContribRepoUrl = this.builder.constant.opencvContribRepoUrl;
                if (this.builder.env.gitCache) {
                    if (!fs__default["default"].existsSync(this.builder.env.opencvContribGitCache)) {
                        const args = ['clone', '--quiet', '--progress', opencvContribRepoUrl, this.builder.env.opencvContribGitCache];
                        await utils.spawn('git', args, { cwd: env.opencvRoot }, { err: gitFilter });
                    }
                    else {
                        await utils.spawn('git', ['pull'], { cwd: env.opencvContribGitCache }, { err: gitFilter });
                    }
                    opencvContribRepoUrl = env.opencvContribGitCache.replace(/\\/g, '/');
                }
                log__default["default"].info('install', `git clone ${opencvContribRepoUrl}`);
                const args = ['clone', '--quiet', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvContribRepoUrl, env.opencvContribSrc];
                this.execLog.push(utils.toExecCmd('cd', [env.opencvRoot]));
                this.execLog.push(utils.toExecCmd('git', args));
                await utils.spawn('git', args, { cwd: env.opencvRoot }, { err: gitFilter });
            }
            let opencvRepoUrl = this.builder.constant.opencvRepoUrl;
            if (this.builder.env.gitCache) {
                if (!fs__default["default"].existsSync(this.builder.env.opencvGitCache)) {
                    const args = ['clone', '--quiet', '--progress', opencvRepoUrl, this.builder.env.opencvGitCache];
                    await utils.spawn('git', args, { cwd: env.opencvRoot }, { err: gitFilter });
                }
                else {
                    await utils.spawn('git', ['pull'], { cwd: env.opencvGitCache }, { err: gitFilter });
                }
                opencvRepoUrl = env.opencvGitCache.replace(/\\/g, '/');
            }
            log__default["default"].info('install', `git clone ${opencvRepoUrl}`);
            const args2 = ['clone', '--quiet', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvRepoUrl, env.opencvSrc];
            this.execLog.push(utils.toExecCmd('git', args2));
            await utils.spawn('git', args2, { cwd: env.opencvRoot }, { err: gitFilter });
            // await this.updateOpencvRawDownloadPath()
            this.execLog.push(`export OPENCV_BIN_DIR=${utils.protect(env.opencvBinDir)}`);
            this.execLog.push(`export OPENCV_INCLUDE_DIR=${utils.protect(env.opencvIncludeDir)}`);
            this.execLog.push(`export OPENCV_LIB_DIR=${utils.protect(env.opencvLibDir)}`);
            const cmakeArgs = this.getCmakeArgs(cMakeFlags);
            log__default["default"].info('install', 'running in %s cmake %s', utils.protect(env.opencvBuild), cmakeArgs.map(utils.protect).join(' '));
            this.execLog.push(utils.toExecCmd('cd', [env.opencvBuild]));
            this.execLog.push(utils.toExecCmd('cmake', cmakeArgs));
            if (!env.dryRun) {
                await utils.spawn('cmake', cmakeArgs, { cwd: env.opencvBuild });
                log__default["default"].info('install', 'starting build...');
            }
            await this.runBuildCmd(msbuildPath);
        }
        catch (e) {
            log__default["default"].error(`Compilation failed, previous calls:${os.EOL}%s`, this.execLog.join(os.EOL));
            throw e;
        }
        if (!env.dryRun) {
            this.writeAutoBuildFile(true);
        }
        else {
            this.execLog.push('echo lock file can not be generated in dry-mode');
        }
        // cmake -D CMAKE_BUILD_TYPE=RELEASE -D ENABLE_NEON=ON
        // -D ENABLE_TBB=ON -D ENABLE_IPP=ON -D ENABLE_VFVP3=ON -D WITH_OPENMP=ON -D WITH_CSTRIPES=ON -D WITH_OPENCL=ON -D CMAKE_INSTALL_PREFIX=/usr/local
        // -D OPENCV_EXTRA_MODULES_PATH=/root/[username]/opencv_contrib-3.4.0/modules/ ..
        if (!env.keepsources && !env.dryRun) {
            /**
             * DELETE TMP build dirs
             */
            try {
                await primraf(env.opencvSrc);
            }
            catch (err) {
                log__default["default"].error('install', 'failed to clean opencv source folder:', err);
                log__default["default"].error('install', `consider removing the folder yourself: ${utils.highlight('%s')}`, env.opencvSrc);
            }
            try {
                await primraf(env.opencvContribSrc);
            }
            catch (err) {
                log__default["default"].error('install', 'failed to clean opencv_contrib source folder:', err);
                log__default["default"].error('install', `consider removing the folder yourself: ${utils.highlight('%s')}`, env.opencvContribSrc);
            }
        }
        if (env.dryRun) {
            console.log();
            console.log();
            console.log(this.execLog.join(os.EOL));
        }
    }
}

class Constant {
    builder;
    constructor(builder) {
        this.builder = builder;
    }
    // repoBaseUrl = 'http://192.168.68.254:7100'
    repoBaseUrl = 'https://github.com';
    opencvRepoUrl = `${this.repoBaseUrl}/opencv/opencv.git`;
    opencvContribRepoUrl = `${this.repoBaseUrl}/opencv/opencv_contrib.git`;
    opencv3rdPartyRepoUrl = `${this.repoBaseUrl}/opencv/opencv_3rdparty.git`;
    // opencvRepoUrl = 'https://github.com/opencv/opencv.git'
    // opencvRepoUrl = 'c:/cache/opencv'
    // opencvContribRepoUrl = 'https://github.com/opencv/opencv_contrib.git'
    // opencvContribRepoUrl = 'c:/cache/opencv_contrib'
    //   opencvModules = opencvModules;
    cmakeVsCompilers = {
        '10': 'Visual Studio 10 2010',
        '11': 'Visual Studio 11 2012',
        '12': 'Visual Studio 12 2013',
        '14': 'Visual Studio 14 2015',
        '15': 'Visual Studio 15 2017',
        '16': 'Visual Studio 16 2019',
        '17': 'Visual Studio 17 2022',
    };
    cmakeArchs = { x64: 'Win64', ia32: '', arm: 'ARM' };
}

var version = "4.5.5";

class OpenCVBuildEnv {
    opts;
    prebuild;
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION , or --version or autoBuildOpencvVersion option in package.json
     */
    opencvVersion;
    /**
     * set using env OPENCV4NODEJS_BUILD_CUDA , or --cuda or autoBuildBuildCuda option in package.json
     */
    buildWithCuda = false;
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB, or --nocontrib arg, or autoBuildWithoutContrib option in package.json
     */
    isWithoutContrib = false;
    /**
     * set using env OPENCV4NODEJS_DISABLE_AUTOBUILD, or --nobuild arg or disableAutoBuild option in package.json
     */
    isAutoBuildDisabled = false;
    /**
     * set using --keepsources arg or keepsources option in package.json
     */
    keepsources = false;
    /**
     * set using --dry-run arg or dry-run option in package.json
     */
    dryRun = false;
    gitCache = false;
    // root path to look for package.json opencv4nodejs section
    // deprecated directly infer your parameters to the constructor
    autoBuildFlags;
    // legacy path to package.json dir
    rootcwd;
    // Path to build all openCV libs
    buildRoot;
    // Path to find package.json legacy option
    packageRoot;
    _platform;
    no_autobuild;
    resolveValue(info) {
        if (info.conf in this.opts) {
            if (info.isBool) {
                return this.opts[info.conf] ? '1' : '';
            }
            else
                return this.opts[info.conf] || '';
        }
        else {
            if (this.#packageEnv && this.#packageEnv[info.conf]) {
                return this.#packageEnv[info.conf] || '';
            }
            else {
                return process.env[info.env] || '';
            }
        }
    }
    #packageEnv = {};
    constructor(opts = {}) {
        this.opts = opts;
        const DEFAULT_OPENCV_VERSION = version; // '4.5.5'
        this.prebuild = opts.prebuild;
        this._platform = process.platform;
        this.packageRoot = opts.rootcwd || process.env.INIT_CWD || process.cwd();
        this.buildRoot = opts.buildRoot || process.env.OPENCV_BUILD_ROOT || path__default["default"].join(__dirname, '../build/opencv');
        if (this.buildRoot[0] === '~') {
            this.buildRoot = path__default["default"].join(os__default["default"].homedir(), this.buildRoot.slice(1));
        }
        // get project Root path to looks for package.json for opencv4nodejs section
        try {
            const data = OpenCVBuildEnv.readEnvsFromPackageJson();
            if (data === null && !this.prebuild) {
                log__default["default"].info('config', `No file ${utils.highlight('%s')} found for opencv4nodejs import`, OpenCVBuildEnv.getPackageJson());
            }
            if (data)
                this.#packageEnv = data;
        }
        catch (err) {
            log__default["default"].error('applyEnvsFromPackageJson', 'failed to parse package.json:');
            log__default["default"].error('applyEnvsFromPackageJson', err);
        }
        // try to use previouse build
        this.no_autobuild = this.resolveValue(ALLARGS.nobuild);
        if (!this.no_autobuild && opts.prebuild) {
            const builds = this.listBuild();
            if (!builds.length) {
                throw Error(`No build found in ${this.rootDir} you should launch opencv-build-npm once`);
            }
            if (builds.length > 1) {
                switch (opts.prebuild) {
                    case 'latestBuild':
                        builds.sort((a, b) => b.date.getTime() - a.date.getTime());
                        break;
                    case 'latestVersion':
                        builds.sort((a, b) => b.dir.localeCompare(a.dir));
                        break;
                    case 'oldestBuild':
                        builds.sort((a, b) => a.date.getTime() - b.date.getTime());
                        break;
                    case 'oldestVersion':
                        builds.sort((a, b) => a.dir.localeCompare(b.dir));
                        break;
                }
            }
            // load envthe prevuious build
            const autoBuildFile = this.readAutoBuildFile2(builds[0].autobuild);
            if (!autoBuildFile)
                throw Error(`failed to read build info from ${builds[0].autobuild}`);
            const flagStr = autoBuildFile.env.autoBuildFlags;
            // merge -DBUILD_opencv_ to internal BUILD_opencv_ manager
            if (flagStr) {
                const flags = flagStr.split(' ');
                flags.filter(flag => {
                    if (flag.startsWith('-DBUILD_opencv_')) {
                        // eslint-disable-next-line prefer-const
                        let [mod, activated] = flag.substring(15).split('=');
                        activated = activated.toUpperCase();
                        if (activated === 'ON' || activated === '1') {
                            this.#enabledModules.add(mod);
                        }
                        else if (activated === 'OFF' || activated === '0') {
                            this.#enabledModules.delete(mod);
                        }
                        return false;
                    }
                    return true;
                });
            }
            this.autoBuildFlags = flagStr;
            this.buildWithCuda = autoBuildFile.env.buildWithCuda;
            this.isAutoBuildDisabled = autoBuildFile.env.isAutoBuildDisabled;
            this.isWithoutContrib = autoBuildFile.env.isWithoutContrib;
            this.opencvVersion = autoBuildFile.env.opencvVersion;
            this.buildRoot = autoBuildFile.env.buildRoot;
            if (!this.opencvVersion) {
                throw Error(`autobuild file is corrupted, opencvVersion is missing in ${builds[0].autobuild}`);
            }
            process.env.OPENCV_BIN_DIR = autoBuildFile.env.OPENCV_BIN_DIR;
            process.env.OPENCV_INCLUDE_DIR = autoBuildFile.env.OPENCV_INCLUDE_DIR;
            process.env.OPENCV_LIB_DIR = autoBuildFile.env.OPENCV_LIB_DIR;
            return;
        }
        // try to build a new openCV or use a prebuilt one
        if (this.no_autobuild) {
            this.opencvVersion = '0.0.0';
            const os = process.platform;
            if (os === 'win32') {
                // chocolatey
                if (!process.env.OPENCV_BIN_DIR) {
                    const candidate = 'c:\\tools\\opencv\\build\\x64\\vc14\\bin';
                    if (fs__default["default"].existsSync(candidate)) {
                        process.env.OPENCV_BIN_DIR = candidate;
                    }
                }
                if (!process.env.OPENCV_LIB_DIR) {
                    const candidate = 'c:\\tools\\opencv\\build\\x64\\vc14\\lib';
                    if (fs__default["default"].existsSync(candidate)) {
                        process.env.OPENCV_LIB_DIR = candidate;
                    }
                }
                if (!process.env.OPENCV_INCLUDE_DIR) {
                    const candidate = 'c:\\tools\\opencv\\build\\include';
                    if (fs__default["default"].existsSync(candidate)) {
                        process.env.OPENCV_INCLUDE_DIR = candidate;
                    }
                }
            }
            else if (os === 'linux') {
                // apt detection
                if (!process.env.OPENCV_BIN_DIR) {
                    const candidate = '/usr/bin/';
                    if (fs__default["default"].existsSync(candidate)) {
                        process.env.OPENCV_BIN_DIR = candidate;
                    }
                }
                if (!process.env.OPENCV_LIB_DIR) {
                    const candidates = blob__default$1["default"]('/usr/lib/*-linux-gnu');
                    if (candidates.length)
                        process.env.OPENCV_LIB_DIR = candidates[0];
                }
                if (!process.env.OPENCV_INCLUDE_DIR) {
                    const candidate = '/usr/include/opencv4/';
                    if (fs__default["default"].existsSync(candidate)) {
                        process.env.OPENCV_INCLUDE_DIR = candidate;
                    }
                }
            }
            else if (os === 'darwin') {
                // Brew detection
                const candidates = blob__default$1["default"]('/opt/homebrew/Cellar/opencv/*');
                if (candidates.length) {
                    const dir = candidates[0];
                    if (!process.env.OPENCV_BIN_DIR) {
                        const candidate = path__default["default"].join(dir, 'bin');
                        if (fs__default["default"].existsSync(candidate)) {
                            process.env.OPENCV_BIN_DIR = candidate;
                        }
                    }
                    if (!process.env.OPENCV_LIB_DIR) {
                        const candidate = path__default["default"].join(dir, 'lib');
                        if (fs__default["default"].existsSync(candidate))
                            process.env.OPENCV_LIB_DIR = candidates[0];
                    }
                    if (!process.env.OPENCV_INCLUDE_DIR) {
                        const candidate = path__default["default"].join(dir, 'include');
                        if (fs__default["default"].existsSync(candidate)) {
                            process.env.OPENCV_INCLUDE_DIR = candidate;
                        }
                    }
                }
            }
        }
        else {
            this.opencvVersion = this.resolveValue(ALLARGS.version);
            if (!this.opencvVersion) {
                this.opencvVersion = DEFAULT_OPENCV_VERSION;
                log__default["default"].info('init', `no openCV version given using default verison ${utils.formatNumber(DEFAULT_OPENCV_VERSION)}`);
            }
            else {
                log__default["default"].info('init', `using openCV verison ${utils.formatNumber(this.opencvVersion)}`);
            }
            if (process.env.INIT_CWD) {
                log__default["default"].info('init', `${utils.highlight('INIT_CWD')} is defined overwriting root path to ${utils.highlight(process.env.INIT_CWD)}`);
            }
            // ensure that OpenCV workdir exists
            if (!fs__default["default"].existsSync(this.buildRoot)) {
                fs__default["default"].mkdirSync(this.buildRoot, { recursive: true });
                if (!fs__default["default"].existsSync(this.buildRoot)) {
                    throw new Error(`${this.buildRoot} can not be create`);
                }
            }
        }
        // import configuration from package.json
        const envKeys = Object.keys(this.#packageEnv);
        if (envKeys.length) {
            // print all imported variables
            log__default["default"].info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:');
            envKeys.forEach(key => log__default["default"].info('applyEnvsFromPackageJson', `${utils.highlight(key)}: ${utils.formatNumber(this.#packageEnv[key] || '')}`));
        }
        this.autoBuildFlags = this.resolveValue(ALLARGS.flags);
        this.buildWithCuda = !!this.resolveValue(ALLARGS.cuda);
        this.isWithoutContrib = !!this.resolveValue(ALLARGS.nocontrib);
        this.isAutoBuildDisabled = !!this.resolveValue(ALLARGS.nobuild);
        this.keepsources = !!this.resolveValue(ALLARGS.keepsources);
        this.dryRun = !!this.resolveValue(ALLARGS['dry-run']);
        this.gitCache = !!this.resolveValue(ALLARGS['git-cache']);
    }
    #ready = false;
    /**
     * complet initialisation.
     */
    getReady() {
        if (this.#ready)
            return;
        this.#ready = true;
        for (const varname of ['binDir', 'incDir', 'libDir']) {
            const varname2 = varname;
            const value = this.resolveValue(ALLARGS[varname2]);
            if (value && process.env[varname] !== value) {
                process.env[ALLARGS[varname2].env] = value;
            }
        }
        if (this.no_autobuild) {
            for (const varname of OPENCV_PATHS_ENV) {
                const value = process.env[varname];
                if (!value) {
                    throw new Error(`${varname} must be define if can not be create nobuild / disableAutoBuild / OPENCV4NODEJS_DISABLE_AUTOBUILD is set`);
                }
                let stats;
                try {
                    stats = fs__default["default"].statSync(value);
                }
                catch (e) {
                    throw new Error(`${varname} is set to non existing "${value}"`);
                }
                if (!stats.isDirectory()) {
                    throw new Error(`${varname} is set to "${value}", that should be a directory`);
                }
            }
        }
    }
    /** default module build list */
    #enabledModules = new Set(defaultEnabledModules);
    get enabledModules() {
        return [...this.#enabledModules];
    }
    enableModule(mod) {
        if (this.#ready)
            throw Error('No mode modules change can be done after initialisation done.');
        this.#enabledModules.add(mod);
    }
    disableModule(mod) {
        if (this.#ready)
            throw Error('No mode modules change can be done after initialisation done.');
        this.#enabledModules.delete(mod);
    }
    /**
     * @returns return cmake flags like: -DBUILD_opencv_modules=ON ...
     */
    getCmakeBuildFlags() {
        const out = [];
        for (const mod of ALL_OPENCV_MODULES) {
            let arg = `-DBUILD_opencv_${mod}=`;
            arg += this.#enabledModules.has(mod) ? 'ON' : 'OFF';
            out.push(arg);
        }
        return out;
    }
    // if version < 4.5.6 ffmpeg 5 not compatible
    // https://stackoverflow.com/questions/71070080/building-opencv-from-source-in-mac-m1
    // brew install ffmpeg@4
    // brew unlink ffmpeg
    // brew link ffmpeg@4
    getSharedCmakeFlags() {
        const cMakeflags = [
            `-DCMAKE_INSTALL_PREFIX=${this.opencvBuild}`,
            '-DCMAKE_BUILD_TYPE=Release',
            '-DBUILD_EXAMPLES=OFF',
            '-DBUILD_DOCS=OFF',
            '-DBUILD_TESTS=OFF',
            '-DBUILD_PERF_TESTS=OFF',
            '-DBUILD_JAVA=OFF',
            '-DBUILD_ZLIB=OFF',
            '-DCUDA_NVCC_FLAGS=--expt-relaxed-constexpr',
            '-DWITH_VTK=OFF',
        ];
        if (!this.isWithoutContrib)
            cMakeflags.push('-DOPENCV_ENABLE_NONFREE=ON', `-DOPENCV_EXTRA_MODULES_PATH=${this.opencvContribModules}`);
        cMakeflags.push(...this.getCongiguredCmakeFlags());
        return cMakeflags;
        // .cMakeflags.push('-DCMAKE_SYSTEM_PROCESSOR=arm64', '-DCMAKE_OSX_ARCHITECTURES=arm64');
    }
    getCongiguredCmakeFlags() {
        const cMakeflags = [];
        if (this.buildWithCuda && utils.isCudaAvailable()) {
            // log.info('install', 'Adding CUDA flags...');
            // this.enabledModules.delete('cudacodec');// video codec (NVCUVID) is deprecated in cuda 10, so don't add it
            cMakeflags.push('-DWITH_CUDA=ON', '-DCUDA_FAST_MATH=ON' /* optional */, '-DWITH_CUBLAS=ON' /* optional */);
        }
        cMakeflags.push(...this.getCmakeBuildFlags());
        // add user added flags
        if (this.autoBuildFlags && typeof this.autoBuildFlags === 'string' && this.autoBuildFlags.length) {
            // log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', this.autoBuildFlags)
            cMakeflags.push(...this.autoBuildFlags.split(' '));
        }
        return cMakeflags;
    }
    dumpEnv() {
        return {
            opencvVersion: this.opencvVersion,
            buildWithCuda: this.buildWithCuda,
            isWithoutContrib: this.isWithoutContrib,
            isAutoBuildDisabled: this.isAutoBuildDisabled,
            autoBuildFlags: this.autoBuildFlags,
            buildRoot: this.buildRoot,
            OPENCV_INCLUDE_DIR: process.env.OPENCV_INCLUDE_DIR || '',
            OPENCV_LIB_DIR: process.env.OPENCV_LIB_DIR || '',
            OPENCV_BIN_DIR: process.env.OPENCV_BIN_DIR || '',
        };
    }
    static getPackageJson() {
        return path__default["default"].resolve(process.cwd(), 'package.json');
    }
    /**
     * extract opencv4nodejs section from package.json if available
     */
    static parsePackageJson() {
        const absPath = OpenCVBuildEnv.getPackageJson();
        if (!fs__default["default"].existsSync(absPath)) {
            return null;
        }
        const data = JSON.parse(fs__default["default"].readFileSync(absPath).toString());
        return { file: absPath, data };
    }
    numberOfCoresAvailable() {
        return os__default["default"].cpus().length;
    }
    /**
     * get opencv4nodejs section from package.json if available
     * @returns opencv4nodejs customs
     */
    static readEnvsFromPackageJson() {
        const rootPackageJSON = OpenCVBuildEnv.parsePackageJson();
        if (!rootPackageJSON) {
            return null;
        }
        if (!rootPackageJSON.data) {
            log__default["default"].info('config', `looking for opencv4nodejs option from ${utils.highlight('%s')}`, rootPackageJSON.file);
            return {};
        }
        if (!rootPackageJSON.data.opencv4nodejs) {
            log__default["default"].info('config', `no opencv4nodejs section found in ${utils.highlight('%s')}`, rootPackageJSON.file);
            return {};
        }
        log__default["default"].info('config', `found opencv4nodejs section in ${utils.highlight('%s')}`, rootPackageJSON.file);
        return rootPackageJSON.data.opencv4nodejs;
    }
    /**
     * openCV uniq version prostfix, used to avoid build path colision.
     */
    get optHash() {
        let optArgs = this.getCongiguredCmakeFlags().join(' ');
        // if (this.autoBuildFlags)
        //     optArgs += ' ' + this.autoBuildFlags;
        if (this.buildWithCuda)
            optArgs += 'cuda';
        if (this.isWithoutContrib)
            optArgs += 'noContrib';
        if (optArgs) {
            optArgs = '-' + crypto__default["default"].createHash('md5').update(optArgs).digest('hex').substring(0, 5);
        }
        return optArgs;
    }
    listBuild() {
        const rootDir = this.rootDir;
        const versions = fs__default["default"]
            .readdirSync(rootDir)
            .filter(n => n.startsWith('opencv-'))
            .map(n => ({ autobuild: path__default["default"].join(rootDir, n, 'auto-build.json'), dir: n }))
            .filter(n => fs__default["default"].existsSync(n.autobuild))
            .map(({ autobuild, dir }) => ({ autobuild, dir, date: fs__default["default"].statSync(autobuild).mtime }));
        //fs.existsSync(path.join(rootDir, n, 'auto-build.json')));
        return versions;
    }
    get platform() {
        return this._platform;
    }
    get isWin() {
        return this.platform === 'win32';
    }
    get rootDir() {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        // return path.resolve(__dirname, '../');
        return this.buildRoot;
    }
    get opencvRoot() {
        return this.rootDir;
        // return path.join(this.rootDir, `opencv-${this.opencvVersion}${this.optHash}`)
    }
    get opencvGitCache() {
        return path__default["default"].join(this.rootDir, 'opencvGit');
    }
    get opencvContribGitCache() {
        return path__default["default"].join(this.rootDir, 'opencv_contribGit');
    }
    get opencvSrc() {
        return path__default["default"].join(this.opencvRoot, 'opencv');
    }
    get opencvContribSrc() {
        return path__default["default"].join(this.opencvRoot, 'opencv_contrib');
    }
    get opencvContribModules() {
        return path__default["default"].join(this.opencvContribSrc, 'modules');
    }
    get opencvBuild() {
        return path__default["default"].join(this.opencvRoot, 'build');
    }
    get opencvInclude() {
        return path__default["default"].join(this.opencvBuild, 'include');
    }
    get opencv4Include() {
        this.getReady();
        if (process.env.OPENCV_INCLUDE_DIR)
            return process.env.OPENCV_INCLUDE_DIR;
        return path__default["default"].join(this.opencvInclude, 'opencv4');
    }
    get opencvIncludeDir() {
        this.getReady();
        return process.env.OPENCV_INCLUDE_DIR || '';
    }
    get opencvLibDir() {
        this.getReady();
        if (process.env.OPENCV_LIB_DIR)
            return process.env.OPENCV_LIB_DIR;
        return this.isWin ? path__default["default"].join(this.opencvBuild, 'lib/Release') : path__default["default"].join(this.opencvBuild, 'lib');
    }
    get opencvBinDir() {
        this.getReady();
        if (process.env.OPENCV_BIN_DIR)
            return process.env.OPENCV_BIN_DIR;
        return this.isWin ? path__default["default"].join(this.opencvBuild, 'bin/Release') : path__default["default"].join(this.opencvBuild, 'bin');
    }
    get autoBuildFile() {
        return path__default["default"].join(this.opencvRoot, 'auto-build.json');
    }
    readAutoBuildFile() {
        return this.readAutoBuildFile2(this.autoBuildFile);
    }
    readAutoBuildFile2(autoBuildFile) {
        try {
            const fileExists = fs__default["default"].existsSync(autoBuildFile);
            if (fileExists) {
                const autoBuildFileData = JSON.parse(fs__default["default"].readFileSync(autoBuildFile).toString());
                if (!autoBuildFileData.opencvVersion || !('autoBuildFlags' in autoBuildFileData) || !Array.isArray(autoBuildFileData.modules)) {
                    throw new Error('auto-build.json has invalid contents');
                }
                return autoBuildFileData;
            }
            log__default["default"].info('readAutoBuildFile', 'file does not exists: %s', autoBuildFile);
        }
        catch (err) {
            log__default["default"].error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', autoBuildFile, err.toString());
        }
        return undefined;
    }
}

class OpenCVBuilder {
    constant;
    getLibs;
    env;
    constructor(opts) {
        if (Array.isArray(opts)) {
            opts = args2Option(opts);
            if (opts.extra && (opts.extra.help || opts.extra.h)) {
                console.log('npm-opencv-build usage:');
                console.log(genHelp());
                process.exit(1);
            }
        }
        if (opts instanceof OpenCVBuildEnv) {
            this.env = opts;
        }
        else {
            this.env = new OpenCVBuildEnv(opts);
        }
        if (!this.env.prebuild)
            log__default["default"].info('init', `${utils.highlight("Workdir")} will be: ${utils.formatNumber("%s")}`, this.env.opencvRoot);
        this.constant = new Constant(this);
        this.getLibs = new getLibsFactory(this);
    }
    checkInstalledLibs(autoBuildFile) {
        let hasLibs = true;
        log__default["default"].info('install', 'checking for opencv libraries');
        if (!fs__default["default"].existsSync(this.env.opencvLibDir)) {
            log__default["default"].info('install', 'library dir does not exist:', this.env.opencvLibDir);
            return false;
        }
        const installedLibs = this.getLibs.getLibs();
        autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
            if (!libPath) {
                log__default["default"].info('install', '%s: %s', opencvModule, 'ignored');
                return;
            }
            const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule);
            hasLibs = hasLibs && !!foundLib;
            log__default["default"].info('install', `lib ${utils.formatNumber("%s")}: ${utils.light("%s")}`, opencvModule, foundLib ? foundLib.libPath : 'not found');
        });
        return hasLibs;
    }
    async install() {
        // if project directory has a packageon containing opencv4nodejs variables
        // apply these variables to the process environment
        // this.env.applyEnvsFromPackageJson()
        if (this.env.isAutoBuildDisabled) {
            log__default["default"].info('install', `${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')} is set skipping auto build...`);
            new SetupOpencv(this).writeAutoBuildFile(true);
            return;
        }
        log__default["default"].info('install', `if you want to use an own OpenCV build set ${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')} to 1, and fill ${OPENCV_PATHS_ENV.map(utils.highlight).join(', ')} environement variables`);
        // prevent rebuild on every install
        const autoBuildFile = this.env.readAutoBuildFile();
        if (autoBuildFile) {
            log__default["default"].info('install', `found previous build summery auto-buildon: ${utils.highlight(this.env.autoBuildFile)}`);
            if (autoBuildFile.opencvVersion !== this.env.opencvVersion) {
                // can no longer occure with this version of opencv4nodejs-builder
                log__default["default"].info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but AUTOBUILD_OPENCV_VERSION=${this.env.opencvVersion}, Will rebuild`);
            }
            else if (autoBuildFile.autoBuildFlags !== this.env.autoBuildFlags) {
                // should no longer occure since -MD5(autoBuildFlags) is append to build path
                log__default["default"].info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but AUTOBUILD_FLAGS is ${this.env.autoBuildFlags}, Will rebuild`);
            }
            else {
                const hasLibs = this.checkInstalledLibs(autoBuildFile);
                if (hasLibs) {
                    log__default["default"].info('install', `all libraries are installed in ${utils.highlight(this.env.opencvLibDir)} => ${utils.highlight('Skip building')}`);
                    return;
                }
                else {
                    log__default["default"].info('install', 'missing some libraries');
                }
            }
        }
        log__default["default"].info('install', '');
        log__default["default"].info('install', 'running install script...');
        log__default["default"].info('install', '');
        log__default["default"].info('install', `opencv version: ${utils.formatNumber('%s')}`, this.env.opencvVersion);
        log__default["default"].info('install', `with opencv contrib: ${utils.formatNumber('%s')}`, this.env.isWithoutContrib ? 'no' : 'yes');
        log__default["default"].info('install', `custom build flags: ${utils.formatNumber('%s')}`, this.env.autoBuildFlags || '< none >');
        log__default["default"].info('install', '');
        try {
            await utils.requireGit();
            await utils.requireCmake();
            await new SetupOpencv(this).start();
        }
        catch (err) {
            if (err.toString)
                log__default["default"].error('install', err.toString());
            else
                log__default["default"].error('install', JSON.stringify(err));
            process.exit(1);
        }
    }
}

exports.ALLARGS = ALLARGS;
exports.ALL_OPENCV_MODULES = ALL_OPENCV_MODULES;
exports.OpenCVBuildEnv = OpenCVBuildEnv;
exports.OpenCVBuilder = OpenCVBuilder;
exports.args2Option = args2Option;
exports.genHelp = genHelp;
exports.getLibsFactory = getLibsFactory;
