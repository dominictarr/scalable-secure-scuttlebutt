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

function circular (n, center, radius) {
  var a = {}, theta = Math.PI*2/n
  for(var i = 0; i < n; i++)
    a[i] = {x: center.x + Math.cos(i*theta)*radius, y: center.y + Math.sin(i*theta)*radius}
  return a
}

function central (N, center, radius) {
  var loc = circular(N-1, center, radius)

  for(var i = N - 1; i > 0; i--)
    loc[i] = loc[i-1]

  loc[0] = center
  return loc
}

exports.centralized = starter(function (stop) {
  var c = canvas() //
  var g = {}
  var N = 200
  for(var i = 0; i < N; i++) {
    G.addEdge(g, 0, i)
    G.addEdge(g, i, 0)
  }

//  var loc = random.locations(N, c.width, c.height)
  var loc = central(N, {x:c.width/2, y:c.height/2}, Math.min(c.width/2, c.height/2)*0.9)
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
  var N = 200
  var g = random.graph(N, 3)
  var loc = random.locations(200, c.width, c.height)
//  var loc = circular(N, {x:c.width/2, y:c.height/2}, Math.min(c.width/2, c.height/2)*0.9)
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

exports.grid = starter(function (stop) {

  var c = canvas() //h('canvas', {width: W, height: H})
  var N = 200
  var g = {}
  var loc = {}
  for(var i = 0; i < N; i++) {
    if(i%10)
      G.addEdge(g, i, (N+i-1)%N)
    if((i%10) < 9)
      G.addEdge(g, i, (N+i+1)%N)
    if(i > 10)
      G.addEdge(g, i, (N+i-10)%N)
    if(i < N - 10)
      G.addEdge(g, i, (i+10)%N)

    loc[i] = {x: (i%10)*c.width/10, y: Math.floor(i/10)*c.height/20}
  }


//  var g = random.graph(N, 3)
//  var loc = random.locations(200, c.width, c.height)
//  var loc = circular(N, {x:c.width/2, y:c.height/2}, Math.min(c.width/2, c.height/2)*0.9)
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


if(!module.parent && exports[process.argv[2]])
  document.body.appendChild(exports[process.argv[2]]())
else {
  console.log(Object.keys(exports))
}









