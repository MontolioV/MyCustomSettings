// node code/go_performance_tests/fib_shared.mjs
import { Worker, isMainThread, parentPort } from 'worker_threads';

main();

async function main() {
  if (isMainThread) {
    console.time('');

    const arraySize = 1_000_000;
    // const arraySize = 1_000;
    const sharedBuffer = new SharedArrayBuffer(arraySize);
    let randomNumbers = new Int8Array(sharedBuffer);
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
            buffer: sharedBuffer,
            idx: i,
            size: groupSize,
          });
        }),
      );
    }

    await Promise.all(promises);

    const sum = groups.reduce((acc, val) => acc + val, 0);
    console.log('sum:', sum);
    console.log('Finished for loop');

    console.timeEnd('');
  } else {
    parentPort.on('message', (msg) => {
      let { buffer, idx, size } = msg;
      let numbers = new Int8Array(buffer);
      let start = idx * size;
      let end = start + size;
      let result = 0;
      for (let i = idx * size; i < end; i++) {
        result += fib(numbers[i]);
        // let iterations = numbers[i]
        // let a = 0
        // let b= 1
        // let fib = 0
        // for (let j = 0; j < iterations; j++) {
        //   fib = a+b
        //   a = b
        //   b = fib
        // }
        // result += fib
      }
      // let result = numbers.reduce((acc, n) => {
      //   return acc + fib(n);
      // }, 0)
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
