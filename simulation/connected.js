var stats = require('statistics')

var N = 1000, M = 5

function isEmpty (o) {
  for(var k in o) return false
  return true
}

function test (N, M) {
var g = {}

  for(var i = 0; i < N; i++) {
    g[i] = g[i] || {}
    for(var k = 0; k + Math.random() < M; k++) {
      var j = ~~(Math.random()*N)
      g[j] = g[j] || {}
      g[i][j] = g[j][i] = true
    }
  }

  var reachable = {}
  var next = {}, hops = 0, connected = 1

  reachable[0] = next[0] = true

  while(!isEmpty(next)) {
    hops ++
    for(var k in next) {
      for(var j in g[k])
        if(!reachable[j]) {
          connected ++
          reachable[j] = true
          next[j] = true
        }
      delete next[k]
    }
  }
  return { connected: connected === N, reachable: connected, hops: hops }
}

console.log('P(edge), P(connected), average, stdev')

;[1.0,1.1,1.2,1.3,1.4,1.5,1.6, 1.7,1.8,1.9,2,3,5,10, 20].forEach(function (m) {
  var prob = 0, dist = stats.initial()
  var c = 0
  for(var i = 0; i < 100;i++) {
    var data = test(N, m)
    dist = stats(dist, data.hops)
    if(data.connected)
      c++
  }
  console.log([m, c/100, dist.mean, dist.stdev].join(', '))
})

