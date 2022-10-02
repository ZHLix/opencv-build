import rimraf from 'rimraf'

const main = () => {
  const ignore = ['build/opencv/build/lib', 'build/opencv/build/include']
  if (process.platform == 'win32') ignore.push('build/opencv/build/bin')
  rimraf.sync('build/opencv/build/*', {
    glob: {
      ignore,
    },
  })
}

main()
