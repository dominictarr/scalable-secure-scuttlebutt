var h = require('hyperscript')
var random = require('network-simulator/random')
var animate = require('network-simulator/animate')
var G = require('graphreduce')
var h = require('hyperscript')
var random = require('network-simulator/random')

var W = 600, H = 600

function canvas () {
  return h('canvas', {width: W, height: H})
}

exports.centralized = function () {
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
    animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)
}

exports.random = function () {

  var c = canvas() //h('canvas', {width: W, height: H})
  var g = random.graph(200, 3)
  var loc = random.locations(200, c.width, c.height)
  var label = h('label')

  animate(g, loc, c.getContext('2d'), function next (_, packets) {
    var e = 0
    for(var i in packets)
      if(packets[i].extra) e ++
    label.textContent = e + '/' + packets.length
    animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)
}

exports.spanning = function () {
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
    animate(g, loc, c.getContext('2d'), next)
  })
  return h('div', c, label)

}
exports.fragile = function () {
  var N = 200
  var c = canvas()
  var g = random.graph(N, 3)
  var loc = random.locations(N, c.width, c.height)
  var label = h('label')

  animate(g, loc, c.getContext('2d'), function (_, packets) {
    var e = 0
    for(var i in packets)
      if(packets[i].extra) {
        e ++
        delete g[packets[i].from][packets[i].to]
        delete g[packets[i].to][packets[i].from]
      }

    //randomly delete one node
    for(var i = 0; i < 3; i++) {
      var d = ~~(Math.random()*N)
      delete g[d]
      for(var i in g[d])
        delete g[i][d]
    }

    label.textContent = e + '/' + packets.length
    animate(g, loc, c.getContext('2d'), function next (_, packets) {
      e = 0
      for(var i in packets)
        if(packets[i].extra)
          e ++
      label.textContent = e + '/' + packets.length
      animate(g, loc, c.getContext('2d'), next)
    })
  })
  return h('div', c, label)

}


