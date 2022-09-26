'use strict';

var path = require('path');
var fs = require('fs');

const main = async () => {
    const pkgFile = path.resolve('package.json');
    if (!fs.existsSync(pkgFile)) {
        throw new Error(`包文件路径错误 ${pkgFile}`);
    }
    const { version } = JSON.parse(fs.readFileSync(pkgFile, { encoding: 'utf-8' }));
    console.log(version);
};
main();
