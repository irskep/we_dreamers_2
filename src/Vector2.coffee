class window.Vector2

  constructor: (@x, @y) ->

  toString: -> "{#{@x}, #{@y}}"


window.V2 = (args...) -> new Vector2(args...)
