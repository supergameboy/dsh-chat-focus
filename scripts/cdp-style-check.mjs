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

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAHElEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAPBqHgAAAX8B9nMAAAAASUVORK5CYII='
const GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const openMaker = async () => {
  await evaluate(`(() => { const b=[...document.querySelectorAll('button,[role="button"]')].find(x=>(x.getAttribute('aria-label')??x.textContent??'').includes('设置')); if(b) b.click(); return true })()`)
  await sleep(1200)
  await evaluate(`(() => { const t=[...document.querySelectorAll('[role="tab"],button')].find(x=>(x.textContent??'').trim()==='对话显示'); if(t) t.click(); return true })()`)
  await sleep(1200)
  await evaluate(`(() => { const root=[...document.querySelectorAll('[role="tabpanel"]')].find(el=>(el.getAttribute('aria-label')??'').includes('对话显示')); const t=[...root.querySelectorAll('[role="tab"]')].find(el=>(el.textContent??'').trim()==='皮肤'); if(t) t.click(); return true })()`)
  await sleep(800)
  await evaluate(`(() => { const root=[...document.querySelectorAll('[role="tabpanel"]')].find(el=>(el.getAttribute('aria-label')??'').includes('对话显示')); const m=[...root.querySelectorAll('button')].find(x=>(x.textContent??'').includes('制作新皮肤')); if(m) m.click(); return true })()`)
  await sleep(1100)
}
const drop = async (base64, name, type) => evaluate(`(() => {
  const zone = document.querySelector('[class*="dropZone"]')
  if (zone === null) return 'no zone'
  const bytes = Uint8Array.from(atob('${base64}'), c => c.charCodeAt(0))
  const transfer = new DataTransfer()
  transfer.items.add(new File([bytes], '${name}', { type: '${type}' }))
  zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  return transfer.files.length
})()`)
const stepTitles = async () => evaluate(`(() => {
  const dialogs=[...document.querySelectorAll('[role="dialog"]')]
  const maker=dialogs.find(el=>(el.textContent??'').includes('制作气泡皮肤')) ?? dialogs.at(-1) ?? document
  const rows=[...maker.querySelectorAll('div')].filter(el => el.querySelector(':scope > div > span') !== null)
  const titles=[]
  for (const row of rows) {
    const label=row.querySelector(':scope > div > span')
    if (label !== null) titles.push((label.textContent ?? '').trim())
  }
  return titles.filter(Boolean).slice(0, 14)
})()`)
const next = async () => { await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent??'').trim()==='下一步' && !x.disabled); if(b) b.click(); return true })()`); await sleep(1400) }

// Static PNG: style step must keep colour/gradient/border.
await evaluate('location.reload()')
await sleep(9000)
await openMaker()
await drop(PNG, 'bubble.png', 'image/png')
await sleep(2200)
await next(); await next()
console.log('PNG style rows:', JSON.stringify(await stepTitles()))
await evaluate(`(() => { const c=[...document.querySelectorAll('button')].find(x=>(x.textContent??'').trim()==='取消'); if(c) c.click(); return true })()`)
await sleep(900)

// Animated GIF: style step must hide them.
await openMaker()
await drop(GIF, 'bubble.gif', 'image/gif')
await sleep(2200)
await next(); await next()
console.log('GIF style rows:', JSON.stringify(await stepTitles()))
ws.close()
