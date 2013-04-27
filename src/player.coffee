window.WD = window.WD or {}

class WD.Player

  constructor: (@name, @currentRoom = null) ->
    @gridPosition = V2(0, 0)

    @$el = $("<div class='wd-player' data-name='#{@name}'></div>")

    @initBaconJunk()
    @teleportToRoom(@currentRoom) if @currentRoom

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
        @teleportToPositionData()

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

    Bacon.combineTemplate(@properties).log()

    @stopMoving = stopMoving
    @updateStreams = updateStreams

  teleportToPositionData: ->
    console.log 'pd:', @positionData
    @$el.css
      left: @positionData.x
      top: @positionData.y

  teleportToRoom: (room) ->
    @currentRoom = room
    @updateStreams
      x: Bacon.constant(room.gridPoint.x * WD.GRID_SIZE + WD.GRID_SIZE / 2)
      y: Bacon.constant(room.gridPoint.y * WD.GRID_SIZE + WD.GRID_SIZE / 2)
