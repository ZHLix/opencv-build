import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

const main = async () => {
  const pkgFile = resolve('package.json')
  if (!existsSync(pkgFile)) {
    throw new Error(`包文件路径错误 ${pkgFile}`)
  }
  const { version } = JSON.parse(readFileSync(pkgFile, { encoding: 'utf-8' }))
  console.log(version)
}

main()
