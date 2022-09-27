'use strict';

var child_process = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var log = require('npmlog');
var pc = require('picocolors');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var child_process__default = /*#__PURE__*/_interopDefaultLegacy(child_process);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var log__default = /*#__PURE__*/_interopDefaultLegacy(log);
var pc__default = /*#__PURE__*/_interopDefaultLegacy(pc);

/**
 * excape spaces for shell execution
 * @param txt text to escape
 * @returns a shell no spaced parameter
 */
const protect = (txt) => { if (txt.includes(' ')) {
    return `"${txt}"`;
}
else {
    return txt;
} };
function toExecCmd(bin, args) {
    return `${protect(bin)} ${args.map(protect).join(' ')}`;
}
function highlight(text) {
    return pc__default["default"].bold(pc__default["default"].yellow(text));
}
function light(text) {
    return pc__default["default"].yellow(text);
}
function formatNumber(text) {
    return pc__default["default"].bold(pc__default["default"].green(text));
}
function exec(cmd, options) {
    log__default["default"].silly('install', 'executing: %s', protect(cmd));
    return new Promise(function (resolve, reject) {
        child_process__default["default"].exec(cmd, options, function (err, stdout, stderr) {
            const _err = err || stderr;
            if (_err)
                return reject(_err);
            return resolve(stdout.toString());
        });
    });
}
function execSync(cmd, options) {
    log__default["default"].silly('install', 'executing: %s', protect(cmd));
    const stdout = child_process__default["default"].execSync(cmd, options);
    return stdout.toString();
}
/**
 * only used by findVs2017
 */
function execFile(cmd, args, options) {
    log__default["default"].silly('install', 'executing: %s %s', protect(cmd), args.map(protect).join(' '));
    return new Promise(function (resolve, reject) {
        const child = child_process__default["default"].execFile(cmd, args, options, function (err, stdout, stderr) {
            const _err = err || stderr;
            if (_err)
                return reject(_err);
            return resolve(stdout.toString());
        });
        child.stdin && child.stdin.end();
    });
}
function spawn(cmd, args, options, filters) {
    filters = filters || {};
    const filterStdout = (data) => {
        if (filters && filters.out) {
            data = filters.out(data);
            if (!data)
                return;
        }
        process.stdout.write(data);
    };
    const filterStderr = (data) => {
        if (filters && filters.err) {
            data = filters.err(data);
            if (!data)
                return;
        }
        process.stderr.write(data);
    };
    log__default["default"].silly('install', 'spawning:', protect(cmd), args.map(protect).join(' '));
    return new Promise(function (resolve, reject) {
        try {
            const child = child_process__default["default"].spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'], ...options });
            child.stderr.on('data', filterStderr);
            child.stdout.on('data', filterStdout);
            child.on('exit', function (code) {
                if (typeof code !== 'number') {
                    code = null;
                }
                const msg = `running: ${protect(cmd)} ${args.map(protect).join(' ')}${os.EOL}in ${options.cwd} exited with code ${code} (for more info, set '--loglevel silly')'`;
                if (code !== 0) {
                    return reject(msg);
                }
                return resolve(msg);
            });
        }
        catch (err) {
            return reject(err);
        }
    });
}
async function requireCmd(cmd, hint) {
    log__default["default"].info('install', `executing: ${pc__default["default"].cyan('%s')}`, cmd);
    try {
        const stdout = await exec(cmd);
        log__default["default"].verbose('install', `${cmd}: ${stdout.trim()}`);
        return stdout;
    }
    catch (err) {
        const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`;
        throw new Error(errMessage);
    }
}
function requireCmdSync(cmd, hint) {
    log__default["default"].info('install', `executing: ${pc__default["default"].cyan('%s')}`, cmd);
    try {
        const stdout = execSync(cmd);
        log__default["default"].verbose('install', `${cmd}: ${stdout.trim()}`);
        return stdout;
    }
    catch (err) {
        const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`;
        throw new Error(errMessage);
    }
}
async function requireGit() {
    const out = await requireCmd('git --version', 'git is required');
    const version = out.match(/version ([\d.\w]+)/);
    if (version) {
        log__default["default"].info('install', `git Version ${formatNumber("%s")} found`, version[1]);
    }
}
async function requireCmake() {
    const out = await requireCmd('cmake --version', 'cmake is required to build opencv');
    const version = out.match(/version ([\d.\w]+)/);
    if (version) {
        log__default["default"].info('install', `cmake Version ${formatNumber("%s")} found`, version[1]);
    }
}
/**
 * looks for cuda lib
 * @returns
 */
function isCudaAvailable() {
    log__default["default"].info('install', 'Check if CUDA is available & what version...');
    if (process.platform == 'win32') {
        try {
            requireCmdSync('nvcc --version', 'CUDA availability check');
            return true;
        }
        catch (err) {
            log__default["default"].info('install', 'Seems like CUDA is not installed.');
            return false;
        }
    }
    // Because NVCC is not installed by default & requires an extra install step,
    // this is work around that always works
    const cudeFileTxt = '/usr/local/cuda/version.txt';
    const cudeFileJson = '/usr/local/cuda/version.json';
    const cudaVersionFilePathTxt = path__default["default"].resolve(cudeFileTxt);
    const cudaVersionFilePathJson = path__default["default"].resolve(cudeFileJson);
    if (fs__default["default"].existsSync(cudaVersionFilePathTxt)) {
        const content = fs__default["default"].readFileSync(cudaVersionFilePathTxt, 'utf8');
        log__default["default"].info('install', content);
        return true;
    }
    if (fs__default["default"].existsSync(cudaVersionFilePathJson)) {
        const content = fs__default["default"].readFileSync(cudaVersionFilePathJson, 'utf8');
        log__default["default"].info('install', content);
        return true;
    }
    log__default["default"].info('install', `CUDA version file could not be found in /usr/local/cuda/version.{txt,json}.`);
    return false;
}

exports.execFile = execFile;
exports.formatNumber = formatNumber;
exports.highlight = highlight;
exports.isCudaAvailable = isCudaAvailable;
exports.light = light;
exports.protect = protect;
exports.requireCmake = requireCmake;
exports.requireGit = requireGit;
exports.spawn = spawn;
exports.toExecCmd = toExecCmd;
