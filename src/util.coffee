window.WD = window.WD or {}

WD.GRID_SIZE = 128
WD.ROOM_SIZE = 110
WD.ROOM_PADDING = (WD.GRID_SIZE - WD.ROOM_SIZE) / 2
WD.DOOR_SIZE = WD.GRID_SIZE - 40
WD.BASE_MAX_BUCKET = 300
WD.COLOR_CHANNEL_MAX = 70

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
    c = (i) -> Math.floor(floor + i)
    "rgb(#{c(r)}, #{c(g)}, #{c(b)})"

WD.mutateColor = (c) ->
  # max: 100
  # min: 30
  newColor =
    r: c.r + _.random(-30, 30)
    g: c.g + _.random(-30, 30)
    b: c.b + _.random(-30, 30)
  _.each ['r', 'g', 'b'], (k) ->
    newColor[k] = Math.floor(
      Math.min(Math.max(newColor[k], 0), WD.COLOR_CHANNEL_MAX))
  strength = newColor.r + newColor.g + newColor.b
  if strength < 50
    return WD.mutateColor(c)
  if strength > 150
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
  diff = 0

  $.getJSON 'http://json-time.appspot.com/time.json?callback=?', {}, ({datetime}) ->
    diff = (new Date(datetime)).getTime() - (new Date()).getTime()

  -> (new Date()).getTime() + diff
