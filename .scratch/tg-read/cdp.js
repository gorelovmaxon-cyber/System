// Minimal CDP client for the local debug Chrome on :9333
const PORT = process.env.CDP_PORT || 9333;
async function targets() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json`);
  return r.json();
}
async function evalOn(urlMatch, expression, {awaitPromise = true} = {}) {
  const list = await targets();
  const t = list.find(x => x.type === 'page' && x.url.includes(urlMatch)) || list.find(x => x.type === 'page');
  if (!t) throw new Error('no page target');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const send = (method, params) => new Promise((res, rej) => {
    const myId = ++id;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === myId) { ws.removeEventListener('message', onMsg); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  const out = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
  ws.close();
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text + ' ' + (out.exceptionDetails.exception?.description||''));
  return out.result.value;
}
async function nav(url) {
  const list = await targets();
  const t = list.find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } }));
  await new Promise(r => setTimeout(r, 2500));
  ws.close();
}
module.exports = { targets, evalOn, nav };
