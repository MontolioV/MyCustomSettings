let result = '';
let iterations = process.argv[2]
  ? parseInt(process.argv[2])
  : 8 + ~~(Math.random() * 10);
let asciiMin = 33;
let asciiMax = 126;

for (let i = 0; i < 20; i++) {
  for (let i = 0; i < iterations; i++) {
    result += String.fromCharCode(
      asciiMin + ~~((asciiMax - asciiMin) * Math.random()),
    );
  }

  console.log(result);
  result = '';
}
