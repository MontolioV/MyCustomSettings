let s = `

`

s = s
  .split('\n',)
  .filter((s) => !!s)
  .map((task,) => {
    let taskBody = task.replace(/.*/, '',)
    return '- ' + taskBody
  },)
  .join('\n',)

console.log(s,)
