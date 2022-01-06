let readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})
const {execSync} = require('child_process');
let projects = require('./projects.json')

console.log('Available projects:',)
projects.forEach((pr, idx) => {
  console.log(`${idx}\t${pr.name}`)
  return pr.name;
})

readline.question('Choose a project to open (index):', (idx) => {
  let project = projects[idx]
  if (!project) {
    console.warn('There is no project with index', idx);
  } else {
    console.log('Opening project', project.name);
    project.directories.forEach((dir) => {
      console.log('* Opening ', dir)
      execSync(`idea64.exe ${dir}`,)
    })
  }
  readline.close()
})
