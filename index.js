var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

module.exports = YouTubePlayer

var waiting = []
var ready = false

inherits(YouTubePlayer, EventEmitter)

if (!window['YT'])
  window.YT = {}

/*
{ id // element id
, width
, height
// initial video?
*/

var states = ['ready', 'end', 'play', 'pause', 'buffer', 'cue']


function YouTubePlayer (options) {
  var self = this, player, isPolling
  this.ready = false
  options.events = {
    onStateChange: function (state) {
      state = states[state.data + 1]

      /*
        this is really weird, but the first time that youtube
        emits ready, it's not actually ready.
        it hasn't added all the methods yet.

        I don't know exactly when it will be ready,
        so I've gotta poll for that.
      */


      if (!self.ready && !isPolling) {
        pollReady()
      }
      self.emit(state)
      self.emit('change', state)
    },
    onReady: function() {
      /*
        sometimes only onReady and not the the initial
        ready onStateChange is fired. so should
        poll here too
      */
      if (!self.ready && !isPolling) {
        pollReady()
      }
    },
    onError: function (code) {
      var message = ({
        '2': 'invalid parameter',
        '100': 'video not found',
        '101': 'video not embeddable',
        '150': 'video not embeddable'
      })[code]
      self.emit('error', new Error(message))
    }
  }

  function pollReady() {
    if(!self.player.loadVideoById) {
      isPolling = true
      setTimeout(pollReady, 1)
      return
    }

    isPolling = false

    if(!self.ready) {
      self.ready = true
      self.emit('ready')
      if(self.waiting)
        self.play.apply(self, self.waiting)
    }
  }

  function create() {
    self.player = new YT.Player(options.id, options)
  }

  if(!ready)
    waiting.push(create)
  else
    create();
}

function map(a, b) {
  YouTubePlayer.prototype[a] =
  'function' == typeof b ? b : function () {
    var args = [].slice.call(arguments)
    if('function' === typeof this.player[b])
    this.player[b].apply(this.player, args)
  }
}

map('play', function (id, seconds, quality) {
  var args = [].slice.call(arguments), self = this
  if(!this.ready)
    this.waiting = args
  else
    this.player.loadVideoById(id, seconds, quality)
})

map('start'    , 'playVideo')
map('cue'     , 'cueVideoById')
map('stop'    , 'stopVideo')
map('pause'   , 'pauseVideo')
map('clear'   , 'clearVideo')
map('seek'    , 'seekTo')
map('length'  , 'getDuration')

map('mute')
map('unMute')
map('isMuted')
map('setVolume')
map('getVolume')

//global listener... sorry. this is youtube.
window.onYouTubeIframeAPIReady = function () {
  ready = true
  while(waiting.length)
    waiting.shift()()
}

// load up the player api
setTimeout(function () {
  if (!YT.Player) {
    var script = document.createElement('script')
    script.src = '//www.youtube.com/iframe_api'
    script.async = true
    document.head.insertBefore(script, document.head.firstElementChild)
  }
}, 1)
