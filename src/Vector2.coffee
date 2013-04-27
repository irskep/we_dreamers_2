class window.Vector2

  constructor: (@x, @y) ->
  add: (p2) -> new window.Vector2(@x + p2.x, @y + p2.y)
  multiply: (c) -> new window.Vector2(@x * c, @y * c)
  subtract: (p2) -> @add(p2.multiply(-1))
  length: -> Math.sqrt(@x * @x + @y * @y)
  equals: (p2) -> @x == p2.x and @y == p2.y
  isLeftOrAbove: (p2) -> @x < p2.x or @y < p2.y
  toString: -> "{#{@x}, #{@y}}"

window.Vector2.fromString = (s) ->
  withoutParens = s.substring(1, s.length - 1)
  items = withoutParens.split(', ')
  new Vector2(parseInt(items[0], 10), parseInt(items[1]))

window.V2 = (args...) -> new Vector2(args...)
