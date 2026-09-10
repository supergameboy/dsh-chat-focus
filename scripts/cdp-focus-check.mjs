const CDP = 'http://127.0.0.1:9222'
const targets = await (await fetch(`${CDP}/json/list`)).json()
const page = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:8123'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let nextId = 0
const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); const r = pending.get(m.id); if (r) { pending.delete(m.id); r(m) } })
await new Promise(r => ws.addEventListener('open', r))
const evaluate = async expression => {
  const id = ++nextId
  const reply = await new Promise(resolve => { pending.set(id, resolve); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })) })
  return reply.result?.exceptionDetails ? { __error: reply.result.exceptionDetails.exception?.description } : reply.result?.result?.value
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
await evaluate('location.reload()')
await sleep(9000)
await evaluate(`(() => { const b=[...document.querySelectorAll('button,[role="button"]')].find(x=>(x.getAttribute('aria-label')??x.textContent??'').includes('设置')); if(b) b.click(); return true })()`)
await sleep(1300)
await evaluate(`(() => { const t=[...document.querySelectorAll('[role="tab"],button')].find(x=>(x.textContent??'').trim()==='对话显示'); if(t) t.click(); return true })()`)
await sleep(1300)
await evaluate(`(() => { const root=[...document.querySelectorAll('[role="tabpanel"]')].find(el=>(el.getAttribute('aria-label')??'').includes('对话显示')); const t=[...root.querySelectorAll('[role="tab"]')].find(el=>(el.textContent??'').trim()==='气泡外观'); if(t) t.click(); return true })()`)
await sleep(1200)
console.log(JSON.stringify(await evaluate(`(() => {
  const root = [...document.querySelectorAll('[role="tabpanel"]')].find(el => (el.getAttribute('aria-label') ?? '').includes('对话显示'))
  const cells = [...root.querySelectorAll('[role="radio"]')]
  const rowOf = title => [...root.querySelectorAll('div')].find(row => {
    const label = row.querySelector(':scope > div > span')
    return label !== null && (label.textContent ?? '').trim() === title
  })
  const focusRow = rowOf('裁剪对齐')
  return {
    focusCells: cells.length,
    focusLabels: cells.map(c => c.getAttribute('aria-label')),
    activeCell: cells.find(c => c.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null,
    hasAlignmentSelect: focusRow === undefined ? 'row gone' : 'row still there',
  }
})()`), null, 1))
ws.close()
