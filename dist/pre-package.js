'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var glob = require('tiny-glob');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var rimraf__default = /*#__PURE__*/_interopDefaultLegacy(rimraf);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);

const getList = (baseDir, tmpDir) => {
    const list = {
        // mac
        // linux
        linux: [
            { source: path.join(baseDir, 'lib/*.*'), dest: path.join(tmpDir, 'lib') },
            { source: path.join(baseDir, 'include/opencv4'), dest: path.join(tmpDir, 'include/opencv4') },
            { source: path.join(baseDir, 'share/opencv4/haarcascades'), dest: path.join(tmpDir, 'etc/haarcascades') },
            { source: path.join(baseDir, 'share/opencv4/lbpcascades'), dest: path.join(tmpDir, 'etc/lbpcascades') },
            { source: path.join(baseDir, 'share/opencv4/quality'), dest: path.join(tmpDir, 'etc/quality') },
        ],
        // win
        win32: [
            { source: path.join(baseDir, 'bin/Release/*.dll'), dest: path.join(tmpDir, 'bin') },
            { source: path.join(baseDir, 'lib/Release/*.lib'), dest: path.join(tmpDir, 'lib') },
            { source: path.join(baseDir, 'include/opencv2'), dest: path.join(tmpDir, 'include/opencv2') },
            { source: path.join(baseDir, 'etc/haarcascades'), dest: path.join(tmpDir, 'etc/haarcascades') },
            { source: path.join(baseDir, 'etc/lbpcascades'), dest: path.join(tmpDir, 'etc/lbpcascades') },
            { source: path.join(baseDir, 'etc/quality'), dest: path.join(tmpDir, 'etc/quality') },
        ],
    };
    switch (process.platform) {
        case 'darwin':
        case 'linux':
            return list.linux;
        case 'win32':
            return list.win32;
        default:
            throw new Error('不支持的操作系统');
    }
};
const mkdirIfNotExist = (path) => !fs.existsSync(path) && fs.mkdirSync(path, { recursive: true });
const getType = (path) => {
    try {
        fs.readlinkSync(path);
        return 'link';
    }
    catch (e) {
        const stat = fs.statSync(path);
        if (stat.isFile())
            return 'file';
        if (stat.isDirectory())
            return 'dir';
        return undefined;
    }
};
const copy = async (source, dest) => {
    let sources;
    if (process.platform == 'win32' && source.indexOf('*') > -1) {
        sources = await glob__default["default"](path.basename(source), { cwd: path.dirname(source) }).then(res => res.map(v => path.join(path.dirname(source), v)));
    }
    else {
        sources = await glob__default["default"](source);
    }
    console.log({ [source]: sources });
    mkdirIfNotExist(dest);
    return Promise.all(sources.map(async (v) => {
        switch (getType(v)) {
            case 'link':
                fs.symlinkSync(fs.readlinkSync(v), path.join(dest, path.basename(v)));
                break;
            case 'file':
                fs.copyFileSync(v, path.join(dest, path.basename(v)));
                break;
            case 'dir':
                fs.cpSync(v, dest, { recursive: true });
                break;
            default:
                throw new Error('不支持的文件类型');
        }
    }));
};
const main = async () => {
    // 操作基础路径
    const baseDir = path.join('build/opencv/build');
    const tmpDir = path.join('build/opencv', 'build_' + crypto.randomUUID());
    const list = getList(baseDir, tmpDir);
    mkdirIfNotExist(tmpDir);
    await Promise.all(list.map(async ({ source, dest }) => copy(source, dest)));
    rimraf__default["default"].sync(baseDir);
    fs.renameSync(tmpDir, baseDir);
};
main();
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
