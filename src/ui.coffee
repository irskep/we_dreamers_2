window.WD = window.WD or {}

_showUsernamePrompt = (callback) ->
  $el = $("
    <div class='username-prompt-container'>
      <form class='username-prompt'>
        <label>Pick a username:</label>
        <input name='username' autofocus>
      </form>
    </div>
  ".trim()).appendTo($('body'))
  $form = $el.find('form')
  $form.on 'submit', (e) ->
    value = $el.find('input').val()
    if value
      $el.remove()
      callback(value)
    e.preventDefault()
    false


WD.ensureUsername = (callback) ->
  if localStorage.getItem('username')
    fb.child(localStorage.getItem('username')).once 'value', (snapshot) ->
      unless snapshot.val()
        color = 
          r: _.random(50, 255)
          g: _.random(50, 255)
          b: _.random(50, 255)
        fb.child(username).set
          username: username
          color: color
      callback(localStorage.getItem('username'))
  else
    _showUsernamePrompt (username) =>
      fb.child(username).once 'value', (snapshot) ->
        if snapshot.val()
          WD.ensureUsername(callback)
        else
          # win!
          color = 
            r: _.random(50, 255)
            g: _.random(50, 255)
            b: _.random(50, 255)
          fb.child(username).set
            username: username
            color: color
          localStorage.setItem('username', username)
          callback(username)
