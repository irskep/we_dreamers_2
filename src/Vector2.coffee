class window.Vector2

  constructor: (@x, @y) ->
  add: (p2) -> new window.Vector2(@x + p2.x, @y + p2.y)
  multiply: (c) -> new window.Vector2(@x * c, @y * c)
  subtract: (p2) -> @add(p2.multiply(-1))
  length: -> Math.sqrt(@x * @x + @y * @y)
  equals: (p2) -> @x == p2.x and @y == p2.y
  isLeftOrAbove: (p2) -> @x < p2.x or @y < p2.y
  toString: -> "{#{@x}, #{@y}}"

window.V2 = (args...) -> new Vector2(args...)
