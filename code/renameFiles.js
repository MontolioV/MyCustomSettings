import * as fs from 'fs';
import path from 'path';

let absDirPath = '';
if (!absDirPath) throw new Error(`empty absDirPath`);

let files = fs.readdirSync(absDirPath);
// console.log(files)
for (let i = 0; i < files.length; i++) {
  let fileName = files[i];
  let filePath = path.join(absDirPath, fileName);
  let stat = fs.lstatSync(filePath);
  if (!stat.isDirectory()) {
    let newName = fileName.replace('TemporaryPanel', 'UniversalPanel');
    if (fileName.endsWith('')) {
      fs.renameSync(filePath, path.join(absDirPath, newName));
      console.log(`replaced ${fileName} to ${newName}`);
    }
  }
}
