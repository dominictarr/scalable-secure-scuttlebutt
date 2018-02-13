var h = require('hyperscript')
var random = require('network-animator/random')
var animate = require('network-animator/animate')
var G = require('graphreduce')
var h = require('hyperscript')
var random = require('network-animator/random')

var W = 600, H = 600

function canvas () {
  return h('canvas', {width: W, height: H})
}

function starter (fn) {
  var stopped = false
  function stop () {
    return stopped
  }
  return function () {
    var d = h('div')
    d.addEventListener('focus', function () {
      stopped = false
      d.innerHTML = ''
      d.appendChild(fn(stop))
    })
    d.addEventListener('blur', function () {
      stopped = true
    })
    return d
  }
}

exports.centralized = starter(function (stop) {
  var c = canvas() //
  var g = {}
  var N = 200
  for(var i = 0; i < N; i++) {
    G.addEdge(g, 0, i)
    G.addEdge(g, i, 0)
  }

  var loc = random.locations(N, c.width, c.height)
  var label = h('label')

  animate(g, loc, c.getContext('2d'), function next (_, packets) {
    var e = 0
    for(var i in packets)
      if(packets[i].extra) {
        e ++
        delete g[packets[i].from][packets[i].to]
        delete g[packets[i].to][packets[i].from]
      }
    label.textContent = e + '/' + packets.length
    if(!stop()) animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)
})

exports.random = starter(function (stop) {

  var c = canvas() //h('canvas', {width: W, height: H})
  var g = random.graph(200, 3)
  var loc = random.locations(200, c.width, c.height)
  var label = h('label')

  animate(g, loc, c.getContext('2d'), function next (_, packets) {
    var e = 0
    for(var i in packets)
      if(packets[i].extra) e ++
    label.textContent = e + '/' + packets.length
    if(!stop()) animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)
})

exports.spanning = starter(function () {
  var c = canvas() //h('canvas', {width: W, height: H})
  var g = random.graph(200, 3)
  var loc = random.locations(200, c.width, c.height)
  var label = h('label')

  animate(g, loc, c.getContext('2d'), function next (_, packets) {
    var e = 0
    for(var i in packets)
      if(packets[i].extra) {
        e ++
        delete g[packets[i].from][packets[i].to]
        delete g[packets[i].to][packets[i].from]
      }
    label.textContent = e + '/' + packets.length
    if(!stop()) animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)

})
exports.fragile = starter(function () {
  var N = 200
  var c = canvas()
  var loc = random.locations(N, c.width, c.height)
  var label = h('label')

  //;(function next () {
    var g = random.graph(N, 2)

    animate(g, loc, c.getContext('2d'), function next (_, packets) {
      var e = 0
      for(var i in packets)
        if(packets[i].extra) {
          e ++
          delete g[packets[i].from][packets[i].to]
          delete g[packets[i].to][packets[i].from]
        }

      //randomly delete some nodes
      var d
      for(var i = 0; i < 1; i++) {
        var d = ~~(Math.random()*N)
        delete g[d]
        for(var i in g[d])
          delete g[i][d]
      }

      label.textContent = e + '/' + packets.length
      if(!stop()) animate(g, loc, c.getContext('2d'), next)
    })

  //})()
  return h('div', c, label)

})






