window.WD = window.WD or {}

WD.GRID_SIZE = 128
WD.ROOM_SIZE = 110
WD.ROOM_PADDING = (WD.GRID_SIZE - WD.ROOM_SIZE) / 2
WD.DOOR_SIZE = WD.GRID_SIZE - 40

WD.run = (selector) -> (new WD.GameController($(selector))).run()

WD.chunkForPoint = ({x, y}) ->
  return "(0, 0)"
  # later
  "(#{Math.floor(x + 50 / 100)}, #{Math.floor(y + 50 / 100)})"

WD.subtractiveColor = (r, g, b, fraction = 1) ->
    r *= fraction
    g *= fraction
    b *= fraction
    floor = 255 - Math.max(r, g, b)
    "rgb(#{floor + r}, #{floor + g}, #{floor + b})"

WD.mutateColor = (c) ->
  # max: 100
  # min: 30
  newColor =
    r: c.r + _.random(-20, 20)
    g: c.g + _.random(-20, 20)
    b: c.b + _.random(-20, 20)
  newColor.r = Math.floor(Math.min(Math.max(newColor.r, 0), 50))
  newColor.g = Math.floor(Math.min(Math.max(newColor.g, 0), 50))
  newColor.b = Math.floor(Math.min(Math.max(newColor.b, 0), 50))
  strength = newColor.r + newColor.g + newColor.b
  if strength < 30
    return WD.mutateColor(c)
  if strength > 100
    return WD.mutateColor(c)
  return newColor

WD.cssGradientVertical = ($el, a, b) ->
  $el.css('background',
    "-webkit-gradient(linear, left top, left bottom, from(#{a}), to(#{b}))")

WD.cssGradientHorizontal = ($el, a, b) ->
  $el.css('background',
    "-webkit-gradient(linear, left top, right top, from(#{a}), to(#{b}))")

WD.keyboard =
  downs: _.memoize (key) ->
    new Bacon.EventStream (sink) ->
      Mousetrap.bind [key], (e) -> sink(new Bacon.Next e)
      ->
  ups: _.memoize (key) ->
    new Bacon.EventStream (sink) ->
      Mousetrap.bind [key], ((e) -> sink(new Bacon.Next e)), "keyup"
      ->
  isDown: _.memoize (key) ->
    WD.keyboard.downs(key).map(true).merge(WD.keyboard.ups(key).map(false))
      .merge($('window').asEventStream('focus').map(false))
      .toProperty(false)


WD.time = do ->
  t = 1000000
  -> t
