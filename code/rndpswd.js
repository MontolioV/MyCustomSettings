// node code/rndpswd.js 20 ans
let result = '';
let passLength = process.argv[2]
  ? parseInt(process.argv[2])
  : 8 + ~~(Math.random() * 10);

// a - use alphabet, n - use numbers, s - use special characters
let mode = process.argv[3] ? process.argv[3] : 'ans'

let numberChars = '0123456789';
let specialChars = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
let alphabetChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

let chars = []
if (mode.includes('a')){
  chars = [...chars,...alphabetChars.split('')]
}
if (mode.includes('n')){
  chars = [...chars,...numberChars.split('')]
}
if (mode.includes('s')){
  chars = [...chars,...specialChars.split('')]
}

for (let i = 0; i < 20; i++) {
  for (let i = 0; i < passLength; i++) {
    result += chars[~~(chars.length* Math.random())]
  }

  console.log(result);
  result = '';
}
