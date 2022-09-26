import rimraf from 'rimraf'

const main = () => {
  rimraf.sync('build/opencv/build/*', {
    glob: {
      ignore: ['build/opencv/build/lib', 'build/opencv/build/include'],
    },
  })
}

main()
