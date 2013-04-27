window.WD = window.WD or {}

class WD.Clock

  constructor: ->
    @tick = new Bacon.Bus()

    animate = (t) =>
      @t = t
      @tick.push(t)
      window.requestAnimationFrame animate
    window.requestAnimationFrame animate

  now: -> @t

class WD.GameController

  constructor: (@$el) ->
    @$el.append($('<div class="wd-inner"></div>'))
    @$worldContainer = $('<div class="room-container"></div>')
      .appendTo(@$el.find('.wd-inner'))
      .css
        position: 'absolute'
        overflow: 'visible'
        left: - WD.GRID_SIZE / 2
        top: - WD.GRID_SIZE / 2
    @$interactiveContainer = $('<div class="wd-interactive"></div>')
      .appendTo(@$worldContainer)
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
    @clock = new WD.Clock()
    r1 = new WD.Room(V2(0, 0), 50, 0, 0, 100)
    r2 = new WD.Room(V2(1, 0), 30, 20, 0, 100)
    r3 = new WD.Room(V2(0, 1), 0, 0, 30, 100)
    r4 = new WD.Room(V2(0, -1), 0, 30, 30, 100)
    r5 = new WD.Room(V2(-1, 0), 0, 30, 0, 100)
    @addRoom(r1)
    @addRoom(r2)
    @addRoom(r3)
    @addRoom(r4)
    @addRoom(r5)
    @addDoor new WD.Door(r1, r2, 'basic', @rooms)
    @addDoor new WD.Door(r1, r3, 'basic', @rooms)
    @addDoor new WD.Door(r1, r4, 'basic', @rooms)
    @addDoor new WD.Door(r1, r5, 'basic', @rooms)
    @player = new WD.Player(@clock, "Steve", r1)
    @interactify(@player)
    @$interactiveContainer.append(@player.$el)

  interactify: (player) ->
    @$worldContainer.asEventStream('click', '.wd-room').onValue (e) =>
      gridPoint = V2($(e.target).data('gridX'), $(e.target).data('gridY'))
      @clickRoom(@rooms[gridPoint.toString()])

    keyboardToDirection = (keyName, vector) =>
      @clock.tick.filter(player.isStill).filter(WD.keyboard.isDown(keyName))
        .onValue =>
          nextRoom = @adjacentRoom(player.currentRoom, vector)
          player.walkToRoom(nextRoom) if nextRoom
    keyboardToDirection('left', V2(-1, 0))
    keyboardToDirection('right', V2(1, 0))
    keyboardToDirection('up', V2(0, -1))
    keyboardToDirection('down', V2(0, 1))

  adjacentRoom: (room, dGridPoint) ->
    p2 = _.clone room.gridPoint
    k = p2.add(dGridPoint).toString()
    if k of @rooms then @rooms[k] else null

  clickRoom: (room) ->
    console.log 'you clicked', room

class WD.Room

  constructor: (@gridPoint, @amtRed, @amtGreen, @amtBlue, @fullness) ->
    @color = WD.subtractiveColor(@amtRed, @amtGreen, @amtBlue, @fullness / 100)
    @$el = $("
        <div class='wd-room rounded-rect'
          data-grid-x='#{@gridPoint.x}'
          data-grid-y='#{@gridPoint.y}'
        ></div>
      ".trim()).css
      width: WD.ROOM_SIZE
      height: WD.ROOM_SIZE
      left: @gridPoint.x * WD.GRID_SIZE + WD.ROOM_PADDING
      top: @gridPoint.y * WD.GRID_SIZE + WD.ROOM_PADDING
      'background-color': @color

  center: ->
    V2(@gridPoint.x * WD.GRID_SIZE + WD.GRID_SIZE / 2,
       @gridPoint.y * WD.GRID_SIZE + WD.GRID_SIZE / 2)

  hash: -> @gridPoint.toString()

class WD.Door

  constructor: (room1, room2, @type) ->
    if room1.gridPoint.y > room2.gridPoint.y or room1.gridPoint.x > room2.gridPoint.x
      tmp = room1
      room1 = room2
      room2 = tmp
    @gridPoint1 = room1.gridPoint
    @gridPoint2 = room2.gridPoint
    if @gridPoint1.x == @gridPoint2.x
      @initVertical(room1.color, room2.color)
    else
      @initHorizontal(room1.color, room2.color)

  hash1: -> @gridPoint1.toString()
  hash2: -> @gridPoint2.toString()

  initVertical: (color1, color2) ->
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: WD.DOOR_SIZE
      height: WD.ROOM_PADDING * 2
      left: WD.GRID_SIZE * @gridPoint1.x + 20
      top: @gridPoint1.y * WD.GRID_SIZE + WD.GRID_SIZE - WD.ROOM_PADDING
    WD.cssGradientVertical(@$el, color1, color2)

  initHorizontal: (color1, color2) ->
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: WD.ROOM_PADDING * 2
      height: WD.DOOR_SIZE
      left: @gridPoint2.x * WD.GRID_SIZE - WD.ROOM_PADDING
      top: WD.GRID_SIZE * @gridPoint1.y + 20
    WD.cssGradientHorizontal(@$el, color1, color2)
