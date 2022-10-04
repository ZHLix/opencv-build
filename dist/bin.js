#!/usr/bin/env node

'use strict';

var OpenCVBuilder = require('./OpenCVBuilder-e64fb259.js');
require('./utils-9d03e134.js');
require('child_process');
require('fs');
require('os');
require('path');
require('npmlog');
require('picocolors');
require('tiny-glob');
require('rimraf');
require('util');
require('crypto');
require('tiny-glob/sync');

void new OpenCVBuilder.OpenCVBuilder(process.argv).install();
