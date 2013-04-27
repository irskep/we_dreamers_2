GRID_SIZE = 128
ROOM_SIZE = 120
ROOM_PADDING = GRID_SIZE / ROOM_SIZE / 2

window.WD =
  run: (selector) -> (new WD.GameController($(selector))).run()

  chunkForPoint: ({x, y}) ->
    "[#{Math.floor(x / 100)}, #{Math.floor(y / 100)}]"

  subtractiveColor: (r, g, b) ->
    floor = 255 - Math.max(r, g, b)
    "rgb(#{floor + r}, #{floor + g}, #{floor + b})"

class WD.GameController

  constructor: (@$el) ->
    @$el.append($('<div class="wd-inner"></div>'))
    @$roomContainer = $('<div class="room-container"></div>')
      .appendTo(@$el.find('.wd-inner'))
      .css
        position: 'absolute'
        overflow: 'visible'
        left:  - GRID_SIZE / 2
        top:  - GRID_SIZE / 2
    @viewOffset = new Vector2(0, 0)
    @rooms = {}
    @chunks = {}

  addRoom: (room) ->
    @rooms[room.hashKey()] = room
    @$roomContainer.append(room.$el)

  run: ->
    @addRoom new WD.Room(new Vector2(0, 0), 50, 0, 0)

class WD.Room

  constructor: (@gridPoint, @amtRed, @amtGreen, @amtBlue) ->
    @$el = $('<div class="wd-room rounded-rect"></div>').css
      width: ROOM_SIZE
      height: ROOM_SIZE
      left: @gridPoint.x * GRID_SIZE
      top: @gridPoint.y * GRID_SIZE
      padding: ROOM_PADDING
      'background-color': WD.subtractiveColor(@amtRed, @amtGreen, @amtBlue)
      
  hashKey: -> @gridPoint.toString()
