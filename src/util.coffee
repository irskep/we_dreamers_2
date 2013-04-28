window.WD = window.WD or {}

WD.GRID_SIZE = 128
WD.ROOM_SIZE = 110
WD.ROOM_PADDING = (WD.GRID_SIZE - WD.ROOM_SIZE) / 2
WD.DOOR_SIZE = WD.GRID_SIZE - 40
WD.BASE_MAX_BUCKET = 300
WD.COLOR_CHANNEL_MAX = 70
WD.BONK_AMOUNT = 40

WD.run = (selector) -> (new WD.GameController($(selector))).run()

WD.chunkForPoint = ({x, y}) ->
  return "(0, 0)"
  # later
  "(#{Math.floor(x + 50 / 100)}, #{Math.floor(y + 50 / 100)})"

WD.colorFromHSV = (h, s, v) ->
  [r, g, b] = Colors.hsv2rgb(h, s, v).a
  {r, g, b}

WD.subtractiveColor = (r, g, b, fraction = 1) ->
    r *= fraction
    g *= fraction
    b *= fraction
    floor = 255 - Math.max(r, g, b)
    c = (i) -> Math.floor(floor + i)
    "rgb(#{c(r)}, #{c(g)}, #{c(b)})"

WD.lightenedColor = (color, fraction = 1) ->
  fraction = 1 - fraction
  r = color.r + Math.floor((255 - color.r) * fraction)
  g = color.g + Math.floor((255 - color.g) * fraction)
  b = color.b + Math.floor((255 - color.b) * fraction)
  "rgb(#{r}, #{g}, #{b})"

WD.rgb2hsv = (r, g, b) ->
  # derp.
  Colors.hex2hsv(Colors.rgb2hex(r, g, b))

WD.valueOfColor = (c, minSaturation = 0.6, maxSaturation = 0.75) ->
  [h, s, v] = WD.rgb2hsv(c.r, c.g, c.b).a
  value = (s / 100 - minSaturation) / (maxSaturation - minSaturation)
  total = c.r + c.g + c.b
  {r: value * (c.r / total), g: value * (c.g / total), b: value * (c.b / total)}

WD.mutateColor = (c, minSaturation = 0.6, maxSaturation = 0.75) ->
  console.log 'mutating', c
  [h, s, v] = WD.rgb2hsv(c.r, c.g, c.b).a
  console.log 'got', h, s, v
  h = (h + _.random(-30, 30) + 360) % 360
  console.log 'new hue is', h
  s += _.random(-15, 15)
  s = Math.max(Math.min(s, maxSaturation * 100), minSaturation * 100)
  console.log 'new saturation is', h
  [r, g, b] = Colors.hsv2rgb(h, s, 100).a
  {r, g, b}

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
