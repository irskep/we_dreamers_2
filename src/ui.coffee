window.WD = window.WD or {}

_showUsernamePrompt = (callback, isRepeat = false) ->
  $el = $("
    <div class='username-prompt-container'>
      <form class='username-prompt'>
        <label>Pick a username:</label>
        <input name='username' autofocus>
      </form>
    </div>
  ".trim()).appendTo($('body'))
  if isRepeat
    $("<div>(The one you tried was taken)</div>").insertAfter($el.find('input'))
  $form = $el.find('form')
  $form.on 'submit', (e) ->
    value = $el.find('input').val()
    if value
      $el.remove()
      callback(value)
    e.preventDefault()
    false


WD.ensureUser = (callback, isRepeat = false) ->
  fbUsers = fb.child('users')
  if localStorage.getItem('username')
    username = localStorage.getItem('username')
    fbUsers.child(username).once 'value', (snapshot) ->
      data = snapshot.val()
      unless data
        data = 
          username: username
          color:
            r: _.random(50, 255)
            g: _.random(50, 255)
            b: _.random(50, 255)
          position:
            x: 0
            y: 0
        fbUsers.child(username).set(data)
      callback(username)
  else
    f = (username) =>
      fbUsers.child(username).once 'value', (snapshot) ->
        if snapshot.val()
          WD.ensureUser(callback, true)
        else
          # win!
          data =
            username: username
            color:
              r: _.random(50, 255)
              g: _.random(50, 255)
              b: _.random(50, 255)
            position:
              x: 0
              y: 0
          fbUsers.child(username).set(data)
          localStorage.setItem('username', username)
          callback(username)
    _showUsernamePrompt(f, isRepeat)


WD.showStats = (player) =>
  $el = $("<div class='stats'>").appendTo('body')
  template = _.template """
    <div class="stat-color stat-r"> </div>
    <div class="stat-color stat-g"> </div>
    <div class="stat-color stat-b"> </div>
    <div class="stat-level">Level <%- level %></div>
    <% if (roomsDug) { %>
      <div class="stat-rooms-dug">Rooms Dug: <%- roomsDug %></div>
    <% } %>
    <% if (notesLeft) { %>
      <div class="stat-notes-left">Notes written: <%- notesLeft %></div>
    <% } %>
  """
  player.statsUpdates.onValue (data) ->
    data = _.clone player.stats
    data.level = player.level
    data.notesLeft = player.stats.notesLeft or 0
    $el.html(template(data))
    _.each ['r', 'g', 'b'], (k) ->
      $el.find(".stat-#{k}").css
        'margin-top': (player.maxBucket() - data[k]) / 2
        'height': data[k] / 2


WD.showRoom = (player) =>
  $el = $("<div class='room-info-container'>").appendTo('body')
  template = _.template """
    <div class="room-info">
      <% if (player.username == creator && player.level > 1) { %>
        <form class="fortune-form">
          <input name="fortune" placeholder="Leave a note in this room"
           value="<%- fortuneText %>">
        </form>
      <% } else { %>
        <div class="text">
          <% if (fortuneText) { %>
            <span class="creator"><%- creator %> says,</span>
            &ldquo;<%- fortuneText %>&rdquo;
          <% } else { %>
            Dug by <%- creator %>
          <% } %>
        </span>
      <% } %>
    </div>
  """

  update = (room) ->
    data = _.clone(room)
    data.player = player
    data.fortuneText = data.fortuneText or ''
    $el.html(template(data))

  player.currentRoomProperty.onValue (room) ->
    return unless room
    update(room)

    room.updates.takeUntil(player.currentRoomProperty.changes()).onValue ->
      update(room)

    $el.asEventStream('submit').takeUntil(player.currentRoomProperty.changes())
      .onValue (e) ->
        e.preventDefault()
        unless room.fortuneText
          player.fb.child('stats/notesLeft').set(
            (player.stats.notesLeft or 0) + 1)
        room.fb.child('fortuneText').set($el.find('input').val())
        false
