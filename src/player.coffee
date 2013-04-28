window.WD = window.WD or {}

lerp = (dt, startValue, endValue, duration) ->
  val = startValue + (endValue - startValue) * (dt / duration)
  if endValue > startValue
    val = Math.min(endValue, val)
    val = Math.max(startValue, val)
  else
    val = Math.max(endValue, val)
    val = Math.min(startValue, val)
  val

easeInQuad = (t, a, b, d) ->
  t /= d
  return (b - a) *t * t + a

easeOutQuad = (t, a, b, d) ->
  t /= d
  return -(b - a) * t * (t-2) + a


xyStreams = (clock, startPoint, endPoint, duration, fn = lerp) ->
  startTime = clock.now()
  distance = endPoint.subtract(startPoint).length()
  tickStreamToTween = (val1, val2) ->
    clock.tick.map (currentTime) ->
      return fn(currentTime - startTime, val1, val2, duration)
      return val2 if val1 == val2

  endTime = startTime + duration
  reachedDest = clock.tick.filter((t) -> t > endTime).take(1)

  x: tickStreamToTween(startPoint.x, endPoint.x).takeUntil(reachedDest)
  y: tickStreamToTween(startPoint.y, endPoint.y).takeUntil(reachedDest)
  reachedDest: reachedDest


class WD.Player

  constructor: (@clock, @username, @gameController) ->
    @gridPosition = V2(0, 0)
    @stats =
      r: 0
      g: 0
      b: 0
    @currentRoom = null
    @level = 1
    @statsUpdates = new Bacon.Bus()
    @bonks = new Bacon.Bus()
    @midBonks = new Bacon.Bus()

    @$el = $("<div class='wd-player' data-username='#{@username}'></div>")

    @initBaconJunk()

    @fb = fb.child('users').child(@username)

    @gameController.roomsAreLoaded.filter(_.identity).onValue =>
      @bindFirebase()

  initBaconJunk: ->
    @positionData = V2(0, 0)
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
    @positionProperties = properties

  bindFirebase: ->
    @fb.child('color').on 'value', (snapshot) =>
      data = snapshot.val()
      @color = data
      @$el.css('background-color',
        "rgb(#{@color.r}, #{@color.g}, #{@color.b})")

    @fb.child('position').on 'value', (snapshot) =>
      position = snapshot.val()
      room = @gameController.roomAtPoint(V2(position.x, position.y))

      if @currentRoom != room
        if @currentRoom
          @walkToRoom(room)
        else
          @teleportToRoom(room)

    _.each _.keys(@stats), (k) =>
      @fb.child('stats').on 'value', (snapshot) =>
        _.extend @stats, snapshot.val()
        @statsUpdates.push(@stats)

    @fb.child('bonk').on 'value', (snapshot) =>
      data = snapshot.val()
      @bonk(data) if data

    @fb.child('level').on 'value', (snapshot) =>
      @level = snapshot.val() or 1
      @statsUpdates.push(@stats)

  teleportToRoom: (room) ->
    @currentRoom = room
    p = @currentRoom.center()
    @updateStreams(x: Bacon.constant(p.x), y: Bacon.constant(p.y))
    console.log WD.mutateColor(@currentRoom.color)

  walkToRoom: (room) ->
    @startMoving()
    streams = xyStreams(@clock, @positionData, room.center(), 500)
    @currentRoom = room
    streams.reachedDest.onValue =>
      @stopMoving()
      @teleportToRoom(room)
    @updateStreams(streams)

  bonk: ({x, y}) ->
    return unless @canBonk()
    @startMoving()
    p1 = @currentRoom.center()
    p2 = p1.add(V2(x, y).multiply(WD.ROOM_SIZE / 2))
    streams1 = xyStreams(@clock, p1, p2, 200, easeInQuad)
    streams1.reachedDest.onValue =>
      @midBonks.push(V2(x, y))
      streams2 = xyStreams(@clock, p2, p1, 200, easeOutQuad)
      streams2.reachedDest.onValue =>
        @stopMoving()
        @teleportToRoom(@currentRoom)
        @bonks.push(V2(x, y))
      @updateStreams(streams2)
    @updateStreams(streams1)

  remove: ->
    @$el.remove()
    @fb.off('value')
    @fb.child('color').off('value')
    @fb.child('position').off('value')
    @fb.child('bonk').off('value')

  maxBucket: ->
    WD.BASE_MAX_BUCKET + (100 * (@level - 1))

  canBonk: => not _.find ['r', 'g', 'b'], (k) => @stats[k] < WD.BONK_AMOUNT
