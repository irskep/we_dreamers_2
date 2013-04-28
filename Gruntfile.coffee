module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      main:
        files:
          'js/we_dreamers.js': 'src/*.coffee',

    uglify: {}

    watch:
      coffee:
        files: 'src/*.coffee'
        tasks: ['coffee']

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.registerTask('default', ['coffee', 'watch'])
