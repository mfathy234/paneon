process.stdout.write('echo-input ready\r\n')
if (process.stdin.isTTY) process.stdin.setRawMode(true)
process.stdin.on('data', (chunk) => {
  process.stdout.write(`GOT ${JSON.stringify(chunk.toString('utf8'))}\r\n`)
})
setInterval(() => undefined, 60_000)
