import { createInterface } from 'readline';
import { execSync } from 'child_process';
import fs from 'fs';
let projects = JSON.parse(
  fs.readFileSync(new URL('./projects.json', import.meta.url), 'utf8'),
);
let readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

queryInput();

function queryInput() {
  console.log('Available projects:');
  projects.forEach((pr, idx) => {
    console.log(`${idx}\t${pr.name}`);
    return pr.name;
  });

  readline.question(
    'Choose a project to open (indexes separated by space, like "1 2") or filter with "?" ("?vs360"):',
    (str) => {
      if (str.startsWith('?')) {
        filterOptions(str);
      } else {
        openByIndexes(str);
      }
    },
  );
}

// format '?something'
function filterOptions(str) {
  let filterStr = str.substring(1);
  console.log(`Filtering by ${filterStr}`);

  projects = projects.filter((project) => {
    return project.name.includes(filterStr);
  });

  queryInput();
}

function openByIndexes(idxsStr) {
  let idxs = idxsStr.split(' ');
  idxs.forEach((idx) => {
    let project = projects[idx];
    if (!project) {
      console.warn('There is no project with index', idx);
    } else {
      console.log('Opening project', project.name);
      project.directories.forEach((dir) => {
        console.log('* Opening ', dir);
        execSync(`idea64.exe ${dir}`);
      });
    }
  });

  readline.close();
}
