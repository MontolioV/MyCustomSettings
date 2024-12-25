// node code/go_performance_tests/fib.mjs
// bun code/go_performance_tests/fib.mjs
import { Worker, isMainThread, parentPort } from 'worker_threads';

await main();

async function main() {
  if (isMainThread) {
    console.time('main');

    const arraySize = 100_000_000;
    // const arraySize = 1_000;
    let randomNumbers = [];
    for (let i = 0; i < arraySize; i++) {
      randomNumbers[i] = i % 30;
    }

    const groupsAmount = 32;
    const groupSize = arraySize / groupsAmount;
    const groups = new Array(groupsAmount).fill(0);

    console.log('Running for loop…');
    let promises = [];
    for (let i = 0; i < groupsAmount; i++) {
      promises.push(
        new Promise((resolve, reject) => {
          let worker = new Worker(new URL(import.meta.url));
          worker.on('message', (m) => {
            groups[i] = m;
            resolve();
          });
          worker.postMessage({
            numbers: randomNumbers.slice(i * groupSize, (i + 1) * groupSize),
          });
        }),
      );
    }

    await Promise.all(promises);

    const sum = groups.reduce((acc, val) => acc + val, 0);
    console.log('sum:', sum);
    console.log('Finished for loop');

    console.timeEnd('main');
  } else {
    parentPort.on('message', (msg) => {
      let result = msg.numbers.reduce((acc, n) => {
        return acc + fib(n);
      }, 0);
      parentPort.postMessage(result % 1000);
      process.exit(0);
    });
  }
}

// function fib(n) {
//   if (n <= 1) {
//     return n;
//   }
//   return fib(n - 1) + fib(n - 2);
// }
function fib(n) {
  if (n <= 1) {
    return n;
  }
  let a = 0;
  let b = 1;
  let result = 0;
  for (let j = 1; j < n; j++) {
    result = a + b;
    a = b;
    b = result;
  }
  return result;
}
