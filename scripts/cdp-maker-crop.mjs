import fs from 'node:fs'
const CDP = 'http://127.0.0.1:9222'
const targets = await (await fetch(`${CDP}/json/list`)).json()
const page = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:8123'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let nextId = 0
const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); const r = pending.get(m.id); if (r) { pending.delete(m.id); r(m) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(resolve => { const id = ++nextId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = async expression => {
  const reply = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return reply.result?.exceptionDetails ? { __error: reply.result.exceptionDetails.exception?.description } : reply.result?.result?.value
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
await evaluate('location.reload()')
await sleep(10000)
await evaluate(`(() => { const b=[...document.querySelectorAll('button,[role="button"]')].find(x=>(x.getAttribute('aria-label')??x.textContent??'').includes('设置')); if(b) b.click(); return true })()`)
await sleep(1400)
await evaluate(`(() => { const t=[...document.querySelectorAll('[role="tab"],button')].find(x=>(x.textContent??'').trim()==='对话显示'); if(t) t.click(); return true })()`)
await sleep(1400)
await evaluate(`(() => { const root=[...document.querySelectorAll('[role="tabpanel"]')].find(el=>(el.getAttribute('aria-label')??'').includes('对话显示')); const t=[...root.querySelectorAll('[role="tab"]')].find(el=>(el.textContent??'').trim()==='皮肤'); if(t) t.click(); return true })()`)
await sleep(1000)
console.log('make button:', await evaluate(`(() => { const root=[...document.querySelectorAll('[role="tabpanel"]')].find(el=>(el.getAttribute('aria-label')??'').includes('对话显示')); const m=[...root.querySelectorAll('button')].find(x=>(x.textContent??'').includes('制作新皮肤')); if(m) m.click(); return m !== undefined })()`))
await sleep(1400)
console.log('drop:', await evaluate(`(() => {
  const zone = document.querySelector('[class*="dropZone"]')
  if (zone === null) return 'no zone'
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 120
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#2563eb'
  ctx.fillRect(0, 0, 240, 120)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(20, 20, 200, 80)
  ctx.fillStyle = '#dc2626'
  ctx.fillRect(20, 20, 40, 40)
  const bytes = Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), c => c.charCodeAt(0))
  const transfer = new DataTransfer()
  transfer.items.add(new File([bytes], 'bubble.png', { type: 'image/png' }))
  zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  return transfer.files.length
})()`))
await sleep(2500)
console.log('next:', await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent??'').trim()==='下一步' && !x.disabled); if(b) b.click(); return b !== undefined })()`))
await sleep(1800)
console.log(JSON.stringify(await evaluate(`(() => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')]
  const maker = dialogs.find(el => (el.textContent ?? '').includes('制作气泡皮肤')) ?? dialogs.at(-1) ?? null
  if (maker === null) return { dialogs: dialogs.length }
  const chips = [...maker.querySelectorAll('[class*="stepChip"]')].map(el => (el.textContent ?? '').trim() + (el.hasAttribute('data-active') ? '*' : ''))
  const stage = maker.querySelector('[class*="stage"]')
  const box = maker.querySelector('[class*="imageBox"]')
  const img = maker.querySelector('[class*="image"]')
  const rect = el => el === null ? null : { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }
  return { chips, stage: rect(stage), imageBox: rect(box), img: rect(img), imgSrc: (img?.getAttribute('src') ?? '').slice(0, 18), frame: maker.querySelector('[class*="frame"]') !== null }
})()`), null, 1))
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('docs/screenshots/crop-preview.png', Buffer.from(shot.result.data, 'base64'))
console.log('screenshot written')
ws.close()
