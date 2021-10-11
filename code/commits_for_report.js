let s = ``

s = s
  .split('\n',)
  .map((task,) => {
    let taskBody = task.replace(/.*/, '',)
    return '- ' + taskBody
  },)
  .join('\n',)

console.log(s,)
