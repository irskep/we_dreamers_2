window.WD = window.WD or {}

window.fb = (new Firebase('https://we-dreamers.firebaseio.com/LD26'))

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

  initBaseData: =>
    fbChunkZero = fb.child('chunks').child(WD.chunkForPoint(V2(0, 0)))
    fbRooms = fbChunkZero.child('rooms')
    fbDoors = fbChunkZero.child('doors')
    fbRoomZero = fbRooms.child(V2(0, 0).toString())
    fbRoomZero.on 'value', (snapshot) =>
      center = V2(0, 0)
      left = V2(-1, 0)
      right = V2(1, 0)
      top = V2(0, -1)
      bottom = V2(0, 1)
      unless snapshot.val()
        console.log 'initializing rooms'
        fbRoomZero.set(
          {position: center, color: {r: 30, g: 0, b: 0}, health: 100})
        fbRooms.child(top.toString()).set(
          {position: top, color: {r: 30, g: 30, b: 0}, health: 100})
        fbRooms.child(bottom.toString()).set(
          {position: bottom, color: {r: 0, g: 0, b: 30}, health: 100})
        fbRooms.child(left.toString()).set(
          {position: left, color: {r: 0, g: 30, b: 30}, health: 100})
        fbRooms.child(right.toString()).set(
          {position: right, color: {r: 0, g: 30, b: 0}, health: 100})

        _.each [
          [center, right], [left, center], [top, center], [center, bottom]
        ], ([a, b]) ->
          fbDoors.child(a.toString() + b.toString()).set
            room1: a
            room2: b
            type: 'basic'

  run: ->
    @roomsLoaded = new Bacon.Bus()
    @players = {}
    WD.ensureUser (username) =>
      $loadingEl = $("<div class='status-message'>Loading...</div>").appendTo(@$el)
      @username = username
      @clock = new WD.Clock()
      @initBaseData()
      @player = new WD.Player(@clock, username, this)
      @interactify(@player)
      @$interactiveContainer.append(@player.$el)

      fb.child('online_users').on 'child_added', (snapshot) =>
        data = snapshot.val()
        return if data == username
        @players[data] = new WD.Player(@clock, data, this)
        @$interactiveContainer.append(@players[data].$el)

      fb.child('online_users').on 'child_removed', (snapshot) =>
        data = snapshot.val()
        return if data == username or not (data of @players)
        @players[data].remove()

      @load($loadingEl)

  load: ($loadingEl) ->
    anyRoomsLoaded = false
    stillLoadingRooms = false
    checkRoomsLoaded = =>
      if anyRoomsLoaded and not stillLoadingRooms
        $loadingEl.remove()
        @roomsLoaded.push(true)
        return
      stillLoadingRooms = false
      setTimeout checkRoomsLoaded, 200
    checkRoomsLoaded()

    loadRoom = (snapshot) =>
      data = snapshot.val()
      @addRoom new WD.Room(
        V2(data.position.x, data.position.y), data.color, data.health)
      stillLoadingRooms = true
      anyRoomsLoaded = true

    fb.child('chunks/(0, 0)/rooms').on 'child_added', (snapshot) =>
      data = snapshot.val()
      @addRoom new WD.Room(
        V2(data.position.x, data.position.y), data.color, data.health)
      stillLoadingRooms = true
      anyRoomsLoaded = true

    fb.child('chunks/(0, 0)/doors').on 'child_added', (snapshot) =>
      data = snapshot.val()
      @addDoor new WD.Door(
        V2(data.room1.x, data.room1.y),
        V2(data.room2.x, data.room2.y), data.type)
      stillLoadingRooms = true
      anyRoomsLoaded = true

  interactify: (player) ->
    fbOnline = fb.child('online_users').child(player.username)
    fbOnline.set(player.username)
    fbOnline.onDisconnect().remove()

    @$worldContainer.asEventStream('click', '.wd-room').onValue (e) =>
      gridPoint = V2($(e.target).data('gridX'), $(e.target).data('gridY'))
      @clickRoom(@roomAtPoint(gridPoint))

    player.$el.addClass('you')

    keyboardToDirection = (keyName, vector) =>
      nextRoom = => @adjacentRoom(player.currentRoom, vector)
      @clock.tick.filter(player.isStill).filter(WD.keyboard.isDown(keyName))
        .onValue =>
          if nextRoom()
            player.fb.child('position').set(nextRoom().gridPoint)
      WD.keyboard.downs(keyName).filter(player.isStill).onValue =>
        unless nextRoom()
          player.fb.child('bonk').set(vector)
          player.fb.child('bonk').set(null)
    keyboardToDirection('left', V2(-1, 0))
    keyboardToDirection('right', V2(1, 0))
    keyboardToDirection('up', V2(0, -1))
    keyboardToDirection('down', V2(0, 1))
    keyboardToDirection('a', V2(-1, 0))
    keyboardToDirection('d', V2(1, 0))
    keyboardToDirection('w', V2(0, -1))
    keyboardToDirection('s', V2(0, 1))

  clickRoom: (room) ->
    console.log 'you clicked', room

  roomAtPoint: (p) -> @rooms[p.toString()]

  adjacentRoom: (room, dGridPoint) ->
    p2 = room.gridPoint.add(dGridPoint)
    return false unless p2.toString() of @rooms
    return false unless _.find(@doors[room.hash()], (door) ->
      door.other(room.gridPoint).equals(p2)
    )
    return @roomAtPoint(p2)
