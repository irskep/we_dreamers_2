GRID_SIZE = 128
ROOM_SIZE = 120
ROOM_PADDING = (GRID_SIZE - ROOM_SIZE) / 2

window.WD =
  run: (selector) -> (new WD.GameController($(selector))).run()

  chunkForPoint: ({x, y}) ->
    "[#{Math.floor(x / 100)}, #{Math.floor(y / 100)}]"

  subtractiveColor: (r, g, b) ->
    floor = 255 - Math.max(r, g, b)
    "rgb(#{floor + r}, #{floor + g}, #{floor + b})"

  cssGradientVertical: ($el, a, b) ->
    $el.css('background',
      "-webkit-gradient(linear, left top, left bottom, from(#{a}), to(#{b}))")

  cssGradientHorizontal: ($el, a, b) ->
    $el.css('background',
      "-webkit-gradient(linear, left top, right top, from(#{a}), to(#{b}))")

class WD.GameController

  constructor: (@$el) ->
    @$el.append($('<div class="wd-inner"></div>'))
    @$worldContainer = $('<div class="room-container"></div>')
      .appendTo(@$el.find('.wd-inner'))
      .css
        position: 'absolute'
        overflow: 'visible'
        left:  - GRID_SIZE / 2
        top:  - GRID_SIZE / 2
    @viewOffset = V2(0, 0)
    @rooms = {}
    @doors = {}
    @chunks = {}

  addRoom: (room) ->
    @rooms[room.hash()] = room
    @$worldContainer.append(room.$el)

  addDoor: (door) ->
    @doors[door.hash1()] = [] unless door.hash1() of @doors
    @doors[door.hash2()] = [] unless door.hash2() of @doors
    @doors[door.hash1()].push(door)
    @doors[door.hash2()].push(door)
    @$worldContainer.append(door.$el)

  run: ->
    r1 = new WD.Room(V2(0, 0), 50, 0, 0)
    r2 = new WD.Room(V2(1, 0), 30, 20, 0)
    r3 = new WD.Room(V2(0, 1), 0, 0, 30)
    @addRoom(r1)
    @addRoom(r2)
    @addRoom(r3)
    @addDoor new WD.Door(r1, r2, 'basic', @rooms)
    @addDoor new WD.Door(r1, r3, 'basic', @rooms)
    console.log @doors

class WD.Room

  constructor: (@gridPoint, @amtRed, @amtGreen, @amtBlue) ->
    @color = WD.subtractiveColor(@amtRed, @amtGreen, @amtBlue)
    @$el = $('<div class="wd-room rounded-rect"></div>').css
      width: ROOM_SIZE
      height: ROOM_SIZE
      left: @gridPoint.x * GRID_SIZE + ROOM_PADDING
      top: @gridPoint.y * GRID_SIZE + ROOM_PADDING
      'background-color': @color

  hash: -> @gridPoint.toString()

class WD.Door

  constructor: (room1, room2, @type) ->
    @gridPoint1 = room1.gridPoint
    @gridPoint2 = room2.gridPoint
    if @gridPoint1.x == @gridPoint2.x
      @initVertical(room1.color, room2.color)
    else
      @initHorizontal(room1.color, room2.color)

  hash1: -> @gridPoint1.toString()
  hash2: -> @gridPoint2.toString()

  initVertical: (color1, color2) ->
    bigY = Math.max(@gridPoint1.y, @gridPoint2.y)
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: GRID_SIZE - 40
      height: ROOM_PADDING * 2
      left: GRID_SIZE * @gridPoint1.x + 20
      top: bigY * GRID_SIZE - ROOM_PADDING
    WD.cssGradientVertical(@$el, color1, color2)

  initHorizontal: (color1, color2) ->
    bigX = Math.max(@gridPoint1.x, @gridPoint2.x)
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: ROOM_PADDING * 2
      height: GRID_SIZE - 40
      left: bigX * GRID_SIZE - ROOM_PADDING
      top: GRID_SIZE * @gridPoint1.y + 20
    WD.cssGradientHorizontal(@$el, color1, color2)
