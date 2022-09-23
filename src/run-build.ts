import { spawn } from './utils'

async function run() {
  try {
    await spawn('node-pre-gyp', ['install'], { cwd: process.cwd() })
  } catch (e) {
    await spawn('node', ['dist/bin.js'], { cwd: process.cwd() })
  }
}

run()
