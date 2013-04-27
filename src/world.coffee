window.WD = window.WD or {}

class WD.Room

  constructor: (@gridPoint, @color, @fullness) ->
    @color = WD.subtractiveColor(@color.r, @color.g, @color.b, @fullness / 100)
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

  constructor: (args...) ->
    console.log args
    [@gridPoint1, @gridPoint2, @type] = args
    if @gridPoint2.isLeftOrAbove(@gridPoint1)
      tmp = @gridPoint1
      @gridPoint1 = @gridPoint2
      @gridPoint2 = tmp
    @color1 = {r: 0, g: 0, b: 0, health: 100}
    @color2 = {r: 0, g: 0, b: 0, health: 100}
    if @gridPoint1.x == @gridPoint2.x then @initVertical() else @initHorizontal()

    @fb = fb.child('chunks/(0, 0)/doors')
      .child(@gridPoint1.toString() + @gridPoint2.toString())

    @fbRoom1 = fb.child('chunks/(0, 0)/rooms').child(@gridPoint1.toString())
    @fbRoom2 = fb.child('chunks/(0, 0)/rooms').child(@gridPoint2.toString())

    @fbRoom1.on 'value', (snapshot) =>
      data = snapshot.val()
      @color1 = data.color
      @color1.health = data.health
      @updateColors()

    @fbRoom2.on 'value', (snapshot) =>
      data = snapshot.val()
      @color2 = data.color
      @color2.health = data.health
      @updateColors()

  hash1: -> @gridPoint1.toString()
  hash2: -> @gridPoint2.toString()
  other: (p) ->
    if p.equals(@gridPoint1) then @gridPoint2 else @gridPoint1

  initVertical: ->
    @direction = 'vertical'
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: WD.DOOR_SIZE
      height: WD.ROOM_PADDING * 2
      left: WD.GRID_SIZE * @gridPoint1.x + 20
      top: @gridPoint1.y * WD.GRID_SIZE + WD.GRID_SIZE - WD.ROOM_PADDING

  initHorizontal: ->
    @direction = 'horizontal'
    @$el = $("<div class='wd-door #{@type}'></div>").css
      width: WD.ROOM_PADDING * 2
      height: WD.DOOR_SIZE
      left: @gridPoint2.x * WD.GRID_SIZE - WD.ROOM_PADDING
      top: WD.GRID_SIZE * @gridPoint1.y + 20

  updateColors: ->
    c = ({r, g, b, health}) -> WD.subtractiveColor(r, g, b, health / 100)
    if @direction == 'vertical'
      WD.cssGradientVertical(@$el, c(@color1), c(@color2))
    else
      WD.cssGradientHorizontal(@$el, c(@color1), c(@color2))
