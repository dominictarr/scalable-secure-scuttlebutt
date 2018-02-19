
var G = require('graphreduce')

function random (N, K) {
  var g = {}
  for(var i = 0; i < N; i++) {
    for(var j = 0; j < K; j++) {
      var a = ~~(Math.random()*i)
      g = G.addEdge(g, a, i)
      g = G.addEdge(g, i, a)
    }
  }
  return g
}

function round(n, u) {
  u = Math.pow(10, u)
  return Math.round(n*u)/u
}

function hops (g, start, seen) {
  var front = {}, total, tcount = 0, redun = 0

  function visit (hops) {
    var count = 0
    for(var k in front) {
      for(var j in g[k]) {
        if(seen[j] == null) {
          front[j] = true
          seen[j] = hops
          total += hops
          tcount ++
          count ++
        }
        else
          redun ++
      }
      delete front[k]
    }
    return count
  }
  front[start] = true
  var hops = 0, total = 0
  while(visit(++hops));

  return [tcount, hops, round(total/tcount, 3), redun, round((redun/(tcount-1)), 3)]
}

//for(var i = 0; i < 100; i++) {
console.log('|K|peers|hops|avg|msgs|inefficiency|')
for(var i = 1; i <= 20; i++) {
  var seen = {}
  var g = random(1000, i)
  console.log('|'+[i].concat(hops(g, 0, seen)).join('|')+'|')
}
//}

