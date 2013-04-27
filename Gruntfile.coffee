module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      main:
        options:
          sourceMap: true
        files:
          'we_dreamers.js': 'src/*.coffee',

    uglify: {}

    watch:
      coffee:
        files: 'src/*.coffee'
        tasks: ['coffee']

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.registerTask('default', ['coffee'])
