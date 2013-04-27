class window.Vector2

  constructor: (@x, @y) ->

  add: (p2) -> new window.Vector2(@x + p2.x, @y + p2.y)

  toString: -> "{#{@x}, #{@y}}"


window.V2 = (args...) -> new Vector2(args...)
