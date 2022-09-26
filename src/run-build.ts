import { spawn } from './utils'

async function run() {
  const isWin = process.platform === 'win32'

  try {
    await spawn('node-pre-gyp', ['install'], { cwd: process.cwd(), shell: isWin as any })
  } catch (e) {
    await spawn('node', ['dist/bin.js'], { cwd: process.cwd(), shell: isWin as any })
  }
}

run()
