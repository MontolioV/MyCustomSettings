import fs from 'fs';
import { execSync } from 'child_process';
import projectsForReport from './projectsForReport.js';

// not including
let startDate = '24.07.2022';
// including
let endDate = '31.07.2022';
let authorEmail = '';
let resultFileName = 'report.txt';

let report = '';
projectsForReport.forEach((project) => {
  let sectionResults = [];
  project.gitPaths.forEach((path) => {
    let projectResult = execSync(
      `git -C "${path}" --no-pager log ` +
        `--since "${startDate}" --until "${endDate}" ` +
        `--author "${authorEmail}"`,
      { encoding: 'utf8' },
    );

    let commitMessages = [];
    let newMsgObj = null;
    let logLines = projectResult.split('\n');
    logLines.forEach((line) => {
      if (line.startsWith('commit ')) {
        if (newMsgObj) {
          commitMessages.push(newMsgObj);
        }
        newMsgObj = {
          title: '',
          msg: '',
        };
      }
      if (
        line === '' ||
        line.startsWith('commit ') ||
        line.startsWith('Author:') ||
        line.startsWith('Date:')
      ) {
        return;
      }

      let trimmedLine = line.trim();
      if (!newMsgObj.title) {
        newMsgObj.title = trimmedLine;
      } else {
        if (newMsgObj.msg) {
          newMsgObj.msg += ' ';
        }
        newMsgObj.msg += trimmedLine;
      }
    });
    if (newMsgObj) commitMessages.push(newMsgObj);

    let uniqueTitles = new Set(commitMessages.map(({ title }) => title));
    commitMessages = [...uniqueTitles].map((title) => {
      let objs = commitMessages.filter((ob) => ob.title === title);
      if (objs.length > 1) {
        return {
          title,
          msg: objs
            .map((ob) => {
              return ob.msg;
            })
            .join(' '),
        };
      } else {
        return objs[0];
      }
    });

    commitMessages = commitMessages.filter(
      (m) => !(m.msg === '' && !!m.title?.match(/^\d+\.\d+\.\d+$/)),
    );
    sectionResults.push(commitMessages);
  });

  let sectionTotalMsgs = sectionResults.reduce(
    (acc, msgs) => acc + msgs.length,
    0,
  );
  if (sectionTotalMsgs > 0) {
    report += '\n';
    report += project.sectionName + ':\n';
    sectionResults.forEach((commitMessages) => {
      commitMessages.forEach(({ title, msg }) => {
        title = '- ' + title;
        if (!title.endsWith('.')) {
          title += '.';
        }
        report += `${title} ${msg} \n`;
      });
    });
  }
});

console.log(report);
fs.writeFileSync(resultFileName, report);
