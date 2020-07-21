const fs = require('fs');
const readline = require('readline');

let result = `$path: 'assets/fonts/' !default;\n\n`

async function processLineByLine() {
  const fileStream = fs.createReadStream('');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    if (line.startsWith('  src')) {
      let filename = line.match(/, local\('.*'\),/)[0]
      let f = filename.indexOf('\'')+1
      let l = filename.indexOf('\'',f)
      filename = filename.substr(f,l-f)
      let mutline = line.replace(/url\(.*\) format/,`url($path + 'Poppins/${filename}.ttf') format`)
      mutline = mutline.replace('woff2',`truetype`)
      result += mutline + '\n'
    }else {
      result += line + '\n'
    }
  }
}

processLineByLine().then(function () {
  fs.writeFileSync('fonts.scss',result)
});


