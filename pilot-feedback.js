/* Pilot feedback is optional, device-local, and exported only on an explicit click. */
(() => {
  const key='st_pilot_feedback_v1';
  const form=document.getElementById('feedback-form');
  const select=document.getElementById('feedback-session');
  const status=document.getElementById('feedback-status');
  const download=document.getElementById('feedback-export');
  let records=[];let storage=null;
  try { storage=localStorage;const raw=JSON.parse(storage.getItem(key)||'[]');records=Array.isArray(raw)?raw.filter(x=>x&&typeof x.session==='string').slice(-50):[]; } catch {}
  for (const session of window.STCatalog || []) { const option=document.createElement('option');option.value=session.id;option.textContent=session.title;select.append(option); }
  const reflect=()=>{download.disabled=!records.length;document.getElementById('feedback-count').textContent=records.length?`${records.length} saved ${records.length===1?'note':'notes'} on this device.`:'Saved only in this browser. Export a copy to share.';};
  document.getElementById('pilot-audio').addEventListener('loadstart',()=>{const audio=document.getElementById('pilot-audio');const session=(window.STCatalog||[]).find(s=>new URL(s.src,location.href).href===audio.src);if(session)select.value=session.id;});
  form.addEventListener('submit',event=>{
    event.preventDefault();const values=new FormData(form);
    records.push({session:String(values.get('session')),date:new Date().toISOString(),sound:String(values.get('sound')),returnTo:String(values.get('returnTo')),note:String(values.get('note')||'').trim().slice(0,600)});records=records.slice(-50);
    try { if(!storage)throw Error();storage.setItem(key,JSON.stringify(records));status.textContent='Thank you. Your note is saved on this device.'; }
    catch {status.textContent='Your note is held for this visit. Export it to keep a copy.';}
    form.reset();reflect();
  });
  download.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({pilot:'Superthoughts',version:1,feedback:records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='superthoughts-pilot-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  reflect();
})();
