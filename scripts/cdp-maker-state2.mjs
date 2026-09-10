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
console.log(JSON.stringify(await evaluate(`(() => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')]
  const maker = dialogs.find(el => (el.textContent ?? '').includes('制作气泡皮肤')) ?? dialogs.at(-1) ?? null
  if (maker === null) return { dialogs: dialogs.length }
  const chips = [...maker.querySelectorAll('[class*="stepChip"]')].map(el => ({ t: (el.textContent ?? '').trim(), active: el.hasAttribute('data-active') }))
  const stage = maker.querySelector('[class*="stage"]')
  const img = maker.querySelector('img')
  return {
    chips,
    hasStage: stage !== null,
    stageSize: stage === null ? null : { w: Math.round(stage.getBoundingClientRect().width), h: Math.round(stage.getBoundingClientRect().height) },
    firstImg: img === null ? null : { src: (img.getAttribute('src') ?? '').slice(0, 20), w: Math.round(img.getBoundingClientRect().width), h: Math.round(img.getBoundingClientRect().height) },
    classes: [...maker.querySelectorAll('div')].map(d => typeof d.className === 'string' ? d.className : '').filter(c => c.includes('stage') || c.includes('imageBox') || c.includes('frame')).slice(0, 6),
  }
})()`), null, 1))
ws.close()
