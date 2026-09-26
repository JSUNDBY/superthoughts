/* Optional, explicit offline saving. Never downloads audio until the listener asks. */
(() => {
  const audio = document.getElementById('pilot-audio');
  const button = document.getElementById('offline-button');
  const note = document.getElementById('offline-note');
  const install = document.getElementById('install-button');
  const catalog = window.STCatalog || [];
  let worker = null;
  let saved = new Set();
  let busy = false;
  let installPrompt = null;
  const current = () => catalog.find(item => new URL(item.src, location.href).href === audio.src);
  function update() {
    const item = current();
    button.disabled = busy || !worker || !item;
    button.textContent = busy ? 'Saving…' : saved.has(item?.src) ? 'Remove offline copy' : 'Save for offline';
    if (!busy && worker) note.textContent = saved.has(item?.src)
      ? 'Saved in this browser. You can play this session without a connection.'
      : 'Save a session before you travel. Browser storage may be cleared by your device.';
  }
  function send(data) {
    return new Promise((resolve, reject) => {
      worker = navigator.serviceWorker.controller || worker;
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
    const item = current(); if (!item || busy) return;
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
    note.textContent = 'Offline saving is unavailable in this browser. Listening still works online.';update();return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    worker = navigator.serviceWorker.controller || worker;
    if (!busy) send({type:'LIST_SAVED'}).then(update).catch(() => {});
  });
  (async () => {
    try {
      const registration = await navigator.serviceWorker.register('pilot-sw.js');
      await navigator.serviceWorker.ready;
      worker = registration.active;
      if (!worker) throw new Error('Offline saving is getting ready. Reload once to try again.');
      await send({type:'LIST_SAVED'});update();
    } catch (error) { note.textContent = error.message || 'Offline saving is unavailable right now.';update(); }
  })();
})();
