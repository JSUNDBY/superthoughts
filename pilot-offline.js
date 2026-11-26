/* Optional, explicit offline saving. Never downloads audio until the listener asks. */
(() => {
  const audio = document.getElementById('pilot-audio');
  const button = document.getElementById('offline-button');
  const note = document.getElementById('offline-note');
  const install = document.getElementById('install-button');
  const catalog = window.STCatalog || [];
  if (!audio || !button || !note || !install) return;
  let availability = 'Offline saving is getting ready.';
  let saved = new Set();
  let busy = false;
  let installPrompt = null;
  const current = () => catalog.find(item => new URL(item.src, document.baseURI).href === audio.src);
  const controller = () => navigator.serviceWorker?.controller;
  const unavailable = item => item?.access === 'member' || item?.stream === true;
  function update() {
    const item = current();
    button.hidden = unavailable(item);
    if (button.hidden) {
      note.textContent = item.access === 'member'
        ? 'Offline saving is available for free sessions.'
        : 'This session is available to stream online.';
      return;
    }
    const worker = controller();
    button.disabled = busy || !worker || !item;
    button.textContent = busy ? 'Saving…' : saved.has(item?.src) ? 'Remove offline copy' : 'Save for offline';
    if (!busy) note.textContent = !worker ? availability : saved.has(item?.src)
      ? 'Saved in this browser for offline listening. Your device may clear browser storage.'
      : 'Save this free session to listen offline.';
  }
  function send(data) {
    return new Promise((resolve, reject) => {
      const worker = controller();
      if (!worker || worker.state === 'redundant') return reject(new Error('The listening space has updated. Reload once and try again.'));
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Saving took too long. Check your connection and try again.')); }, 120000);
      channel.port1.onmessage = ({data: response}) => {
        clearTimeout(timer);channel.port1.close();
        saved = new Set(response.saved || []);
        response.ok ? resolve(response) : reject(new Error(response.error || 'Could not save this session.'));
      };
      worker.postMessage(data, [channel.port2]);
    });
  }
  button.addEventListener('click', async () => {
    const item = current(); if (!item || busy || !controller() || unavailable(item)) return;
    const removing = saved.has(item.src);busy = true;update();
    note.textContent = removing ? 'Removing this offline copy…' : 'Saving the full recording. You can keep listening.';
    try { await send({type: removing ? 'REMOVE_SESSION' : 'CACHE_SESSION',src:item.src,cues:item.cues});busy = false;update(); }
    catch (error) { busy = false;update();note.textContent = `${error.message} Streaming is still available when connected.`; }
  });
  audio.addEventListener('loadstart', update);
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event;install.hidden = false; });
  install.addEventListener('click', async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;install.hidden=true;
  });
  window.addEventListener('appinstalled', () => { install.hidden=true;installPrompt=null; });
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    availability = 'Offline saving is unavailable in this browser.';update();return;
  }
  function refreshSaved() {
    update();
    if (controller() && !busy) send({type:'LIST_SAVED'}).then(update).catch(() => {});
  }
  navigator.serviceWorker.addEventListener('controllerchange', refreshSaved);
  refreshSaved();
  navigator.serviceWorker.register(new URL('pilot-sw.js', document.baseURI).href).catch(() => {
    availability = 'Offline saving is unavailable right now. Reload and try again.';
    update();
  });
})();
