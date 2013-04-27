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
  strength = c.r + c.g + c.b
  strength = _.random(Math.max(strength - 10, 30), Math.min(strength + 10, 100))
  pivot1 = Math.random()
  pivot2 = Math.random()
  if pivot1 > pivot2
    tmp = pivot1
    pivot1 = pivot2
    pivot2 = tmp
  return {
    r: Math.floor(pivot1 * strength)
    g: Math.floor((pivot2 - pivot1) * strength)
    b: Math.floor((1 - pivot2) * strength)
  }

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
