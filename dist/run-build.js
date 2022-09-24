'use strict';

var utils = require('./utils-9d03e134.js');
require('child_process');
require('fs');
require('os');
require('path');
require('npmlog');
require('picocolors');

async function run() {
    try {
        await utils.spawn('node-pre-gyp', ['install'], { cwd: process.cwd() });
    }
    catch (e) {
        await utils.spawn('node', ['dist/bin.js'], { cwd: process.cwd() });
    }
}
run();
