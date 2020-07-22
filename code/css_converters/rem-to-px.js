const clipboardy = require('clipboardy');

const BASE_FONT_SIZE = 16;
let s = clipboardy.readSync();

let pattern = /\d+(\.\d+)?rem/ig
s = s.replace(pattern, (match) => {
  return `${parseFloat(match) * BASE_FONT_SIZE}px`;
});

console.log(s)
clipboardy.writeSync(s)
