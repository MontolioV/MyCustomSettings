const fs = require('fs');
const readline = require('readline');

const REF_MM = parseFloat(process.argv[2])
const REF_PX = parseFloat(process.argv[3])
const FILE_PATH = process.argv[4];
const START_LINE_NUM = parseFloat(process.argv[5]);
const END_LINE_NUM = parseFloat(process.argv[6]);
const COEF = REF_MM / REF_PX
const PATTERN = /\d+(\.\d+)?px/ig

let result = ''
async function processLineByLine() {
  const fileStream = fs.createReadStream(FILE_PATH);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let num = 0
  for await (const line of rl) {
    num++
    if (num >= START_LINE_NUM && num <= END_LINE_NUM) {
      // Each line in input.txt will be successively available here as `line`.
      let mutline = line.replace(PATTERN, (match) => {
        let mmValue = parseFloat(match) * COEF
        mmValue = (~~(mmValue*100))/100
        return `${mmValue}mm`;
      });
      result += mutline + '\n';
    } else {
      result += line + '\n';
    }
  }
}

processLineByLine().then(function () {
  fs.writeFileSync(FILE_PATH, result)
});
