// node experiments/bin_obj/sab.js
import {
  Worker,
  isMainThread,
  parentPort
} from 'worker_threads';

let nPanels = 1000_000
let batchSize = 1000
let nWorkers = 3
let sizePerPanel = 8

class Panel {
  ta
  idx

  constructor(ta, idx) {
    this.ta = ta;
    this.idx = idx;
  }

  get x() {
    return this.ta[this.xIdx]
  }

  set x(x) {
    this.ta[this.xIdx] = x
  }

  get xIdx() {
    return this.idx * 2
  }

  get y() {
    return this.ta[this.yIdx]
  }

  set y(y) {
    this.ta[this.yIdx] = y
  }

  get yIdx() {
    return this.idx * 2 + 1
  }

  getArea() {
    return this.x * this.y
  }
}

main()

async function main() {
  if (isMainThread) {
    console.time('')

    let sab = new SharedArrayBuffer(sizePerPanel * nPanels + 8 * 4);
    let ta = new Int32Array(sab);

    const batchesPerGroup = nPanels / batchSize;
    const workers = []
    const promises = []
    for (let i = 0; i < nWorkers; i++) {
      promises.push(new Promise((resolve, reject) => {
        let worker = new Worker(new URL(import.meta.url));
        workers.push(worker)
        worker.on('message', (m) => {
          resolve(m)
        });
        worker.postMessage({
          sab,
        })
      }))
    }

    console.time('1')
    createPanels(ta)
    console.timeEnd('1')
    // for (let j = 0; j < batchesPerGroup; j++) {
    //   for (let i = 0; i < nWorkers; i++) {
    //     let worker = workers[i]
    //     worker.postMessage({
    //       sab,
    //       batchSize,
    //       j,
    //       finish: j === batchesPerGroup - 1
    //     })
    //   }
    // }

    let areas = await Promise.all(promises)

    console.log('areas', areas)
    const sum = areas.reduce((acc, val) => acc + val, 0);
    console.log('sum:', sum.toString(16))

    console.timeEnd('')
  } else {
    parentPort.on('message', (msg) => {
      let {sab, batchSize, j} = msg
      let ta = new Int32Array(sab);

      let result = 0
      let last = 0
      do {
        if (last <= ta.at(-1)) {
          let panel = new Panel(ta, last);
          result += panel.getArea()
          last++;
        }
      } while (last < nPanels);
      parentPort.postMessage(result);
      process.exit(0)
      //
      // let start = j * batchSize
      // let end = start + batchSize
      //
      // let result = 0
      // for (let j = start; j < end; j++) {
      //   let panel = new Panel(ta, j);
      //   result += panel.getArea()
      // }
      // parentPort.postMessage(result);
      //
      // if (msg.finish) process.exit(0)
    });
  }
}

function createPanels(ta) {
  for (let i = 0; i < nPanels; i++) {
    let panel = new Panel(ta, i,);
    panel.x = i;
    panel.y = i * 3;

    ta[ta.length - 1] = i
  }
}
