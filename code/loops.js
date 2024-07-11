let ns = [4, 1e2, 1e3, 1e4, 1e5, 1e6];
for (const n of ns) {
  let a = [];
  for (let i = 0; i < n; i++) {
    a[i] = Math.random();
  }

  console.log(n.toExponential(), 'iterations');
  let r1 = 0;
  console.time('fori');
  for (let i = 0; i < n; i++) {
    r1 += a[i];
  }
  console.timeEnd('fori');

  let keys = Object.keys(a);
  let r2 = 0;
  console.time('fori str');
  for (let i = 0; i < n; i++) {
    r2 += a[keys[i]];
  }
  console.timeEnd('fori str');

  let r3 = 0;
  console.time('forEach');
  a.forEach((v) => {
    r3 += v;
  });
  console.timeEnd('forEach');

  let r4 = 0;
  console.time('forof');
  for (const v of a) {
    r4 += v;
  }
  console.timeEnd('forof');

  let r5 = 0;
  console.time('forin');
  for (const k in a) {
    r5 += a[k];
  }
  console.timeEnd('forin');

  let r6 = 0;
  console.time('forEach cb');
  let cb = (v) => {
    r6 += v;
  };
  a.forEach(cb);
  console.timeEnd('forEach cb');

  console.time('reduce');
  let r7 = a.reduce((acc, v) => {
    return acc + v;
  }, 0);
  console.timeEnd('reduce');

  console.log(
    '!@# s.js:():20 ',
    r1 === r2,
    r1 === r3,
    r1 === r4,
    r1 === r5,
    r1 === r6,
    r1 === r7,
    r1,
  );
}
