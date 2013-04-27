window.WD = window.WD or {}

lerp = (startValue, endValue, duration, dt) ->
  val = startValue + (endValue - startValue) * (dt / duration)
  if endValue > startValue
    val = Math.min(endValue, val)
    val = Math.max(startValue, val)
  else
    val = Math.max(endValue, val)
    val = Math.min(startValue, val)
  val


lerpStreams = (clock, startPoint, endPoint, duration) ->
  startTime = clock.now()
  distance = endPoint.subtract(startPoint).length()
  tickStreamToTween = (val1, val2) ->
    clock.tick.map (currentTime) ->
      lerp(val1, val2, duration, currentTime - startTime)

  endTime = startTime + duration
  reachedDest = clock.tick.filter((t) -> t > endTime).take(1)

  x: tickStreamToTween(startPoint.x, endPoint.x).takeUntil(reachedDest)
  y: tickStreamToTween(startPoint.y, endPoint.y).takeUntil(reachedDest)
  reachedDest: reachedDest


class WD.Player

  constructor: (@clock, @username, @gameController) ->
    @gridPosition = V2(0, 0)
    @currentRoom = null

    @$el = $("<div class='wd-player' data-username='#{@username}'></div>")

    @initBaconJunk()

    @fb = fb.child('users').child(@username)

    @gameController.roomsLoaded.onValue =>
        @fb.on 'value', (snapshot) =>
          {color, position} = snapshot.val()
          @color = color
          @$el.css('background-color', "rgb(#{@color.r}, #{@color.g}, #{@color.b})")
          room = @gameController.roomAtPoint(V2(position.x, position.y))

          if @currentRoom != room
            if @currentRoom
              @walkToRoom(room)
            else
              @teleportToRoom(room)

  initBaconJunk: ->
    @positionData = {x: 0, y: 0}
    started = false

    buses = {}
    properties = {}
    _.each ['x', 'y'], (k) =>
      buses[k] = new Bacon.Bus()
      properties[k] = buses[k]
        .flatMapLatest(_.identity)
        .skipDuplicates()
        .toProperty(this[k])
      properties[k].onValue (v) =>
        @positionData[k] = v
        return unless started
        @$el.css
          left: @positionData.x
          top: @positionData.y

    updateStreams = (streams) =>
      _.each _.pairs(streams), ([k, v]) =>
        # only update our bus if we have a bus on that key. caller may otherwise
        # have to sanitize extra data out of its values if it's passing around
        # extra streams for control, etc.
        buses[k].push(v) if k of buses

    stopMoving = =>
      updateStreams
        x: Bacon.constant(@positionData.x)
        y: Bacon.constant(@positionData.y)

    stopMoving()
    started = true

    Bacon.combineTemplate(@properties)

    @stopMoving = stopMoving
    @updateStreams = updateStreams

    isStillBus = new Bacon.Bus()
    @startMoving = -> isStillBus.push(false)
    @stopMoving = -> isStillBus.push(true)
    @isStill = isStillBus.toProperty(true)

  teleportToRoom: (room) ->
    @currentRoom = room
    p = @currentRoom.center()
    @updateStreams(x: Bacon.constant(p.x), y: Bacon.constant(p.y))

  walkToRoom: (room) ->
    @startMoving()
    streams = lerpStreams(
      @clock, V2(@positionData.x, @positionData.y), room.center(), 500)
    @currentRoom = room
    streams.reachedDest.onValue =>
      @stopMoving()
      @teleportToRoom(room)
    @updateStreams(streams)
