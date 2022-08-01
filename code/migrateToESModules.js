/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

let replaceRegexp = /from '(\..*|@qwerty.*)'/gi;

let fileExtensionRegexp = /(\.ts)$/i;

let argIdx = 2;

let REQURSIVE = false;
if (process.argv[argIdx] === '-r') {
  argIdx++;
  REQURSIVE = true;
}
let INPUT_ROOT_PATH = process.argv[argIdx];

if (!INPUT_ROOT_PATH) {
  throw new Error(
    `Incorrect arguments, example: "node ./scripts/checkInvalidContextImports.js [-r] $FILE_PATH"`,
  );
}

if (!path.isAbsolute(INPUT_ROOT_PATH)) {
  // INPUT_ROOT_PATH = path.resolve(__dirname, '..', INPUT_ROOT_PATH);
  INPUT_ROOT_PATH = fileURLToPath(
    new URL(`../${INPUT_ROOT_PATH}`, import.meta.url),
  );
}

let promises = [];

processPath(INPUT_ROOT_PATH, true).then(() => {
  Promise.all(promises).then(() => {
    console.log('done');
  });
});

async function processPath(pathStr, isFirst = false) {
  return new Promise((resolve) => {
    fs.lstat(pathStr, async (err, stat) => {
      if (err) throw err;

      if (stat.isDirectory()) {
        if (isFirst || REQURSIVE) {
          await processDir(pathStr);
        }
      } else if (stat.isFile()) {
        checkConflictingContexts(pathStr);
      }

      resolve();
    });
  });
}

async function processDir(dirPathStr) {
  return new Promise((resolve) => {
    fs.readdir(dirPathStr, async function (err, files) {
      if (err) throw err;

      for (const filePath of files) {
        await processPath(path.resolve(dirPathStr, filePath));
      }
      resolve();
    });
  });
}

function checkConflictingContexts(filePathStr) {
  if (!fileExtensionRegexp.test(filePathStr)) return;

  promises.push(
    new Promise((resolve) => {
      fs.readFile(filePathStr, { encoding: 'utf8' }, (err, code) => {
        if (err) throw err;

        if (replaceRegexp.test(code)) {
          code = code.replaceAll(replaceRegexp, (match, group) => {
            if (group.endsWith('.js')) return match;
            return match.slice(0, -1) + ".js'";
          });
          fs.writeFile(filePathStr, code, () => resolve());
        } else {
          resolve();
        }
      });
    }),
  );
}
