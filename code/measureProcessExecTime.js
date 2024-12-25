// node code/measureProcessExecTime.js [command]
// node code/measureProcessExecTime.js node code/commits_for_report.js
import { exec } from 'child_process';

const commandString = process.argv.slice(2).join(' ');
console.log(commandString);
measureExecutionTime(commandString).then(() => {
  console.log(`Done`);
});

function measureExecutionTime(command) {
  return new Promise((resolve, reject) => {
    console.time('exec');

    const process = exec(command);

    process.on('close', (code) => {
      console.timeEnd('exec');
      console.log(`Process exited with code ${code}`);
      resolve();
    });

    process.on('error', (err) => {
      console.timeEnd('exec');
      console.error(`Error: ${err.message}`);
      reject(err);
    });
  });
}
