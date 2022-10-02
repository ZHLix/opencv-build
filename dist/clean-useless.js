'use strict';

var rimraf = require('rimraf');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var rimraf__default = /*#__PURE__*/_interopDefaultLegacy(rimraf);

const main = () => {
    const ignore = ['build/opencv/build/lib', 'build/opencv/build/include'];
    if (process.platform == 'win32')
        ignore.push('build/opencv/build/bin');
    rimraf__default["default"].sync('build/opencv/build/*', {
        glob: {
            ignore,
        },
    });
};
main();
