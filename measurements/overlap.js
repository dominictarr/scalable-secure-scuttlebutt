var path = require('path')

var d = require('dynamic-dijkstra')(require('dynamic-dijkstra/simple'))

var g = require(path.join(process.env.HOME, '.ssb', 'flume', 'contacts2.json')).value

var HOPS = 2

function first (o) {
  for(var k in o) return k
}

function compare (a, b) {

}

function diff (a, b) {
  var hits = 0, misses = 0, misses2 = 0, total = 0
  for(var k in a)
    if(a[k] > 0) {
      total ++
      if(b[k] != null && b[k] > 0) {
        hits++
      }
      else {
        misses ++
      }
    }
  for(var k in b)
    if(b[k] > 0) {
      if(!(a[k] != null && a[k] > 0)) {
        total ++
        misses2 ++
      }
    }

  return {
    hits: hits, misses: misses, misses2: misses2, total: total,
    avg: hits/total
    }
}

var hops = d.traverse(g, null, HOPS, first(g))
var peers = {}
for(var k in hops) {
  if(hops[k] > 0 && hops[k] == 1) {
    var _hops = d.traverse(g, null, HOPS, k)
    var data = diff(hops, _hops)
    data.hops = [0,0,0]
    for(var k in hops)
      if(hops[k] > 0 && _hops[k] > 0) {
        data.hops[_hops[k]] = (data.hops[_hops[k]] || 0) + 1
        peers[k] = (peers[k] || 0) + 1
      }

    console.log(k, data)

  }
}
var dist = {}
for(var k in hops)
  if(hops[k] > 0)
    dist[k] = { hops: hops[k], peers: peers[k]}
//console.log(dist)

for(var i = 0; i < 100; i++) {

covered = {}
var oneHop = Object.keys(hops).filter(function (k) {
  return hops[k] === 1
}).sort(function () { return Math.random () - 0.5})
.slice(0, 5).forEach(function (id) {
  var _hops = d.traverse(g, null, HOPS, id)
  for(var k in hops) {
    covered[k] = covered[k] || 0
    if(hops[k] > 0 && _hops[k] > 0)
      covered[k] ++
  }
})

function sum (a, b) { return (a || 0) + b }
  var times = [0,0,0,0,0,0], times2 = [0,0,0,0,0]
  for(var k in covered) {
    times2[covered[k]] = (times2[covered[k]] || 0) + 1
    if(hops[k] === 1)
      times[covered[k]] = (times[covered[k]] || 0) + 1
  }
  console.log(times)
  console.log(times2)
  var total = Object.keys(hops).length
  for(var k in times2) {
    var cuml = times2.slice(k).reduce(sum)
    console.log(k, times2[k], times2[k]/total, cuml, cuml/total)
  }
}


