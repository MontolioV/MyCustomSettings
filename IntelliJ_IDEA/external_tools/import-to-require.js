const fs = require('fs');
const readline = require('readline');

const FILE_PATH = process.argv[2];
const START_LINE_NUM = parseFloat(process.argv[3]);
const END_LINE_COL = parseFloat(process.argv[5]);
let END_LINE_NUM = parseFloat(process.argv[4])
if (START_LINE_NUM !== END_LINE_NUM && END_LINE_COL === 1) {
  END_LINE_NUM--;
}

let result = ''

async function processLineByLine() {
  const fileStream = fs.createReadStream(FILE_PATH);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });


  let allImportStrings = ''
  let lineNumber = 0
  let readyToInject = false
  for await (const line of rl) {
    lineNumber++
    if (lineNumber >= START_LINE_NUM && lineNumber <= END_LINE_NUM) {
      allImportStrings += line + '\n';
      readyToInject = true
    } else {
      if (readyToInject) {
        result += replaceImport(allImportStrings)
        readyToInject = false
      }
      result += line + '\n';
    }
  }
}

processLineByLine().then(function () {
  fs.writeFileSync(FILE_PATH, result)
});


function replaceImport(allImportStrings) {
  let result = '';
  let importRegexp = /import (.|\s)* from ['"].*['"]/ig
  let dependencyExtractRegexp = /from (['"].*['"])/ig;
  let importsExtractRegexp = /import ((\{(.|\s)*\}|.*)) from/ig;

  allImportStrings
    .split('import')
    .filter((s) => !!s)
    .map((s) => 'import' + s)
    .forEach((soleImportString) => {
      if (!soleImportString.match(importRegexp)) {
        throw new Error('Provided string does not match the import pattern.')
      }

      let dependencyStr = dependencyExtractRegexp.exec(soleImportString)[1]
      let importsStr = importsExtractRegexp.exec(soleImportString)[1]

      result += `const ${importsStr} = require(${dependencyStr});\n`;
    })

  return result
}
