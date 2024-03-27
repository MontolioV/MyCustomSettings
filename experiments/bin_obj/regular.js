// node experiments/bin_obj/regular.js
import {
  Worker,
  isMainThread,
  parentPort
} from 'worker_threads';

let nPanels = 1000_000
let batchSize = 1000
let nWorkers = 3

class Panel {
  x
  y

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  getArea() {
    return this.x * this.y
  }
}

main()

async function main() {
  if (isMainThread) {
    console.time('')

    console.time('1')
    let panels = createPanels()
    console.timeEnd('1')
    const batchesPerGroup = nPanels / batchSize;
    const workers = []
    const promises = []
    for (let i = 0; i < nWorkers; i++) {
      promises.push(new Promise((resolve, reject) => {
        let worker = new Worker(new URL(import.meta.url));
        workers.push(worker)

        let batchResults = []
        worker.on('message', (m) => {
          batchResults.push(m)
          if (batchResults.length === batchesPerGroup) {
            resolve(batchResults.reduce((acc, val) => acc + val, 0))
          }
        });
      }))
    }
    for (let j = 0; j < batchesPerGroup; j++) {
      for (let i = 0; i < nWorkers; i++) {
        let worker = workers[i]
        worker.postMessage({
          panels:
            panels.slice(j * batchSize, (j + 1) * batchSize),
          finish: j === batchesPerGroup - 1
        })
      }
    }

    let areas = await Promise.all(promises)

    console.log('areas', areas)
    const sum = areas.reduce((acc, val) => acc + val, 0);
    console.log('sum:', sum.toString(16))

    console.timeEnd('')
  } else {
    parentPort.on('message', (msg) => {
      let result = msg.panels.map((ser) => {
        return new Panel(ser.x, ser.y).getArea()
      }).reduce((acc, area) => acc + area, 0)
      parentPort.postMessage(result);

      if (msg.finish) process.exit(0)
    });
  }
}

function createPanels() {
  let panels = []
  for (let i = 0; i < nPanels; i++) {
    panels.push(new Panel(i, i * 3))
  }
  return panels
}
