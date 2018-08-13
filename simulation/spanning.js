function toLetter (i) {
  return String.fromCodePoint('A'.codePointAt(0) + i)
}

var N = 20, k = 3
var g = {}
var hops = {}
hops.A = 0
g.A = {}
for(var i = 1; i < N; i++) {
  g[toLetter(i)] = g[toLetter(i)] || {}
  var j = ~~(Math.random()*i)
  console.log('->', toLetter(j), toLetter(i), g)
  g[toLetter(j)][toLetter(i)] = 1
}

for(var i = 0; i < N; i++) {
  for(var ii = 1; ii +Math.random() < k; ii++) {
    var j = ~~(Math.random()*N)
    g[toLetter(i)][toLetter(j)] = 1
  }
}

function isEmpty (e) {
  for(var k in e) return false
  return true
}

function spanning (g) {
  var next = {}
  var reachable = {}
  var s = {}
  next['A'] = true
  reachable['A'] = 0
  while(!isEmpty(next)) {
    for(var k in next) {
      for(var j in g[k]) {
        if(reachable[j] == undefined) {
          s[k] = s[k] || {}
          s[k][j] = reachable[k] + 1
          reachable[j] = reachable[k] + 1
          next[j] = true
        }
      }
      delete next[k]
    }
  }

  var hops = {}
//  console.log('S', s, '...', g)
  return {hops: reachable, spanning: s}
}


console.log(g)

function remap (g) {
  var s = spanning(g)
  var remap = {}, i = 0
  for(var k in s.hops)
    remap[k] = toLetter(i++)
  console.log(s.spanning)
  console.log(s.hops)
  console.log(remap)
  var _g = {}
  for(var j in g)
    for(var k in g[j]) {
      _g[remap[j]] = _g[remap[j]] || {}
      _g[remap[j]][remap[k]] = g[j][k]
    }
  console.log("G", _g)
  return spanning(_g)
}

console.log(remap(g).spanning)

