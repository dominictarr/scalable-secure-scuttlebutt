

console.log('round, dR, dT')
var n = {}, C = 1, N = 10000

for (var i = 0; i < N; i++)
  n [i] = false

n[0] = true
var k = 1
while(C < N) {
  var m = 0, nn = {}
  for(var i = 0; i < N; i++) {
    var j = ~~(Math.random()*N)
    if(n[i] != n[j]) {
      m++
      n[i] = n[j] = true
      //nn[i] = nn[j] = true
      C++
    }
  }
//  for(var K in nn)
//    n[K] = nn[K]
  console.log([k++, m, C].join(', '))
}




