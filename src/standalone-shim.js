/* PET-CT Team Desk – standalone runtime (GitHub Pages)
 * Provides the same window.claude.use(...) interface the app was written against:
 *   db        – documents kept on this device (IndexedDB) and synced to the owner's Google Drive
 *   user      – the local user (name set in Settings)
 *   sample    – Claude reading via the Anthropic API with the user's own key (kept only on this device)
 *   downloads – normal browser downloads
 *   mcp       – not available (the appointment sheet is uploaded as an Excel file instead)
 * No keys, tokens or patient data are stored in the source code.
 */
(function(){
  "use strict";
  const PETCT = window.PETCT = { standalone: true };
  window.PETCT_STANDALONE = true;

  /* ---------- tiny key-value store on IndexedDB (falls back to memory) ---------- */
  const IDB_NAME = "petct-team-desk", IDB_STORE = "kv";
  function idbOpen(){
    return new Promise((res, rej)=>{
      try{
        const rq = indexedDB.open(IDB_NAME, 1);
        rq.onupgradeneeded = ()=>rq.result.createObjectStore(IDB_STORE);
        rq.onsuccess = ()=>res(rq.result); rq.onerror = ()=>rej(rq.error);
      }catch(e){ rej(e); }
    });
  }
  async function idbGet(k){ try{ const d = await idbOpen(); return await new Promise((res,rej)=>{ const t=d.transaction(IDB_STORE).objectStore(IDB_STORE).get(k); t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error); }); }catch(e){ return undefined; } }
  async function idbSet(k,v){ try{ const d = await idbOpen(); await new Promise((res,rej)=>{ const t=d.transaction(IDB_STORE,"readwrite"); t.objectStore(IDB_STORE).put(v,k); t.oncomplete=res; t.onerror=()=>rej(t.error); }); }catch(e){ console.warn("save failed", e); } }
  const ls = { get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} }, del:k=>{ try{ localStorage.removeItem(k); }catch(e){} } };
  PETCT.ls = ls;

  /* ---------- document store ----------
   * entries: path -> { d: data, t: last-change ms, del: true for a deletion (kept so it syncs) } */
  let entries = {};
  const listeners = new Set();
  let persistTimer = null;
  const ready = idbGet("store").then(v=>{ if(v && typeof v === "object") entries = v; });
  PETCT.ready = ready;
  const clone = o => o==null ? o : JSON.parse(JSON.stringify(o));
  const segs = p => String(p).split("/").filter(Boolean);
  function notify(){ listeners.forEach(fn=>{ try{ fn(); }catch(e){ console.error(e); } }); }
  function persist(){ clearTimeout(persistTimer); persistTimer = setTimeout(()=>idbSet("store", entries), 250); }
  function changed(){ persist(); notify(); PETCT.scheduleDriveSave && PETCT.scheduleDriveSave(); }
  function put(path, data){ entries[path] = { d: clone(data), t: Date.now() }; changed(); }
  function del(path){ entries[path] = { del: true, t: Date.now() }; changed(); }
  function live(path){ const e = entries[path]; return e && !e.del ? e : null; }
  function snapDoc(path){ const e = live(path); return { id: segs(path).pop(), exists: !!e, data: ()=> e ? clone(e.d) : undefined, metadata:{ fromCache:false, hasPendingWrites:false } }; }
  function collDocs(col){ const pre = col.replace(/\/$/,"") + "/", n = segs(col).length + 1; return Object.keys(entries).filter(k=>k.startsWith(pre) && segs(k).length===n && live(k)).sort(); }
  const newId = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,10);

  function docRef(path){
    return {
      id: segs(path).pop(), path,
      get: async()=>{ await ready; return snapDoc(path); },
      set: async data=>{ await ready; put(path, data); },
      update: async data=>{ await ready; const e = live(path); if(!e) throw { code:"invalid_argument", message:"Document does not exist" }; put(path, Object.assign(clone(e.d), clone(data))); },
      delete: async()=>{ await ready; if(entries[path]) del(path); },
      onSnapshot: (next)=>{ const fn = ()=>next(snapDoc(path)); listeners.add(fn); ready.then(()=>setTimeout(fn,0)); return ()=>listeners.delete(fn); },
      collection: sub=>collRef(path + "/" + sub)
    };
  }
  function collRef(path){
    const q = { _where:[], _order:null, _limit:0 };
    const run = ()=>{
      let ds = collDocs(path).map(snapDoc);
      q._where.forEach(([f,op,v])=>{ ds = ds.filter(s=>{ const x = s.data()[f]; switch(op){ case "==": return x===v; case "!=": return x!==v; case "<": return x<v; case "<=": return x<=v; case ">": return x>v; case ">=": return x>=v; case "in": return v.includes(x); default: return true; } }); });
      if(q._order){ const [f,dir] = q._order; ds.sort((a,b)=>{ const x=a.data()[f], y=b.data()[f]; return (x>y?1:x<y?-1:0)*(dir==="desc"?-1:1); }); }
      if(q._limit) ds = ds.slice(0,q._limit);
      return { docs: ds, size: ds.length, empty: !ds.length, docChanges: ()=>[], metadata:{ fromCache:false, hasPendingWrites:false } };
    };
    const api = {
      path,
      doc: id=>docRef(path + "/" + (id || newId())),
      add: async data=>{ await ready; const id = newId(); put(path + "/" + id, data); return docRef(path + "/" + id); },
      where: (f,op,v)=>{ const c = collRef(path); Object.assign(c._q, q); c._q._where = q._where.concat([[f,op,v]]); return c; },
      orderBy: (f,dir)=>{ const c = collRef(path); Object.assign(c._q, q); c._q._order = [f,dir||"asc"]; return c; },
      limit: n=>{ const c = collRef(path); Object.assign(c._q, q); c._q._limit = n; return c; },
      get: async()=>{ await ready; return run(); },
      onSnapshot: (next)=>{ const fn = ()=>next(run()); listeners.add(fn); ready.then(()=>setTimeout(fn,0)); return ()=>listeners.delete(fn); },
      _q: q
    };
    return api;
  }
  const db = { doc: docRef, collection: collRef };

  /* ---------- Google Drive sync (same Google sign-in setup as Lakshmi Billing) ---------- */
  const G_CLIENT_ID = "183776959919-hpm7gqgrcdn82o49qvhn94l2meiaq2ea.apps.googleusercontent.com";
  const G_SCOPE = "https://www.googleapis.com/auth/drive.file";
  const DRIVE_NAME = "petct-team-desk-data.json";
  let gToken = null, gClient = null, gFileId = null, saveTimer = null, busy = false, lastSync = null, statusText = "Not signed in";
  const statusFns = new Set();
  PETCT.onSyncStatus = fn=>{ statusFns.add(fn); fn(syncState()); return ()=>statusFns.delete(fn); };
  function syncState(){ return { signedIn: !!gToken, text: statusText, lastSync }; }
  function setStatus(t){ statusText = t; statusFns.forEach(fn=>{ try{ fn(syncState()); }catch(e){} }); }
  async function gApi(method, url, body, headers){
    const r = await fetch(url, { method, headers: Object.assign({ Authorization: "Bearer " + gToken }, headers||{}), body });
    if(r.status === 401){ gToken = null; setStatus("Google sign-in expired – tap Sign in again"); throw new Error("401"); }
    return r;
  }
  async function driveFind(){
    const q = encodeURIComponent(`name='${DRIVE_NAME}' and trashed=false`);
    const r = await gApi("GET", `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&spaces=drive`);
    if(!r.ok) return null; const d = await r.json(); return d.files && d.files[0] ? d.files[0].id : null;
  }
  function merge(remote){
    let changedLocal = false, localNewer = false;
    const keys = new Set([...Object.keys(entries), ...Object.keys(remote||{})]);
    keys.forEach(k=>{
      const a = entries[k], b = remote && remote[k];
      if(b && (!a || b.t > a.t)){ entries[k] = b; changedLocal = true; }
      else if(a && (!b || a.t > b.t)) localNewer = true;
    });
    return { changedLocal, localNewer };
  }
  async function driveLoad(){
    if(!gToken || busy) return; busy = true; setStatus("Syncing with Google Drive…");
    try{
      await ready;
      gFileId = gFileId || await driveFind();
      if(gFileId){
        const r = await gApi("GET", `https://www.googleapis.com/drive/v3/files/${gFileId}?alt=media`);
        if(r.ok){
          const remote = await r.json();
          const m = merge(remote && remote.entries ? remote.entries : {});
          if(m.changedLocal){ persist(); notify(); }
          busy = false;
          if(m.localNewer) await driveSave(); else { lastSync = new Date(); setStatus("Synced with Google Drive"); }
          return;
        }
      }
      busy = false; await driveSave();
    }catch(e){ console.error(e); if(gToken) setStatus("Couldn't reach Google Drive – will retry"); }
    finally{ busy = false; }
  }
  async function driveSave(){
    if(!gToken) return; if(busy){ PETCT.scheduleDriveSave(); return; }
    busy = true;
    try{
      const body = JSON.stringify({ app:"petct-team-desk", savedAt:new Date().toISOString(), entries });
      const bd = "petct_" + Date.now();
      const meta = JSON.stringify({ name: DRIVE_NAME, mimeType: "application/json" });
      const mp = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`;
      const hdr = { "Content-Type": "multipart/related; boundary=" + bd };
      if(!gFileId) gFileId = await driveFind();
      let r;
      if(gFileId) r = await gApi("PATCH", `https://www.googleapis.com/upload/drive/v3/files/${gFileId}?uploadType=multipart`, mp, hdr);
      else { r = await gApi("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", mp, hdr); if(r.ok){ gFileId = (await r.json()).id; } }
      if(r.ok){ lastSync = new Date(); setStatus("Synced with Google Drive"); } else setStatus("Google Drive save failed (" + r.status + ") – will retry");
    }catch(e){ console.error(e); }
    finally{ busy = false; }
  }
  PETCT.scheduleDriveSave = ()=>{ if(!gToken) return; clearTimeout(saveTimer); saveTimer = setTimeout(driveSave, 2500); };
  PETCT.syncNow = ()=>driveLoad();
  function initGoogle(){
    if(!(window.google && google.accounts && google.accounts.oauth2)){ setTimeout(initGoogle, 800); return; }
    gClient = google.accounts.oauth2.initTokenClient({ client_id: G_CLIENT_ID, scope: G_SCOPE, callback: resp=>{
      if(resp.error){ setStatus("Google sign-in failed: " + resp.error); return; }
      gToken = resp.access_token; ls.set("petct.gSignedIn","1"); setStatus("Signed in – syncing…"); driveLoad();
    }});
    if(ls.get("petct.gSignedIn")==="1") gClient.requestAccessToken({ prompt: "" });
  }
  PETCT.signIn = ()=>{ if(!gClient){ setStatus("Google sign-in is still loading – try again in a moment"); return; } gClient.requestAccessToken({ prompt: gToken ? "" : "consent" }); };
  PETCT.signOut = ()=>{ if(gToken && window.google) try{ google.accounts.oauth2.revoke(gToken, ()=>{}); }catch(e){} gToken = null; gFileId = null; ls.del("petct.gSignedIn"); setStatus("Signed out – cases stay on this device only"); };
  setInterval(()=>{ if(gToken && document.visibilityState==="visible") driveLoad(); }, 60000);
  document.addEventListener("visibilitychange", ()=>{ if(gToken && document.visibilityState==="visible") driveLoad(); });
  window.addEventListener("load", initGoogle);

  /* ---------- user ---------- */
  const user = {
    id: async()=>"me", me: async()=>({ id:"me", name: ls.get("petct.userName") || "Me" }),
    profiles: async ids=>Object.fromEntries((ids||[]).map(i=>[i, { name: ls.get("petct.userName") || "Me" }])),
    can: async()=>true, canEdit: ()=>true, isOwner: ()=>true
  };

  /* ---------- Claude reading with the user's own API key ---------- */
  PETCT.MODELS = [["claude-sonnet-5-5","Claude Sonnet 5.5 (recommended)"],["claude-haiku-5-5","Claude Haiku 5.5 (cheaper, faster)"],["claude-opus-5-5","Claude Opus 5.5 (most capable)"]];
  const blobToB64 = b=>new Promise((res,rej)=>{ const r = new FileReader(); r.onload = ()=>res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });
  async function callClaude(input, opts){
    opts = opts || {};
    const key = ls.get("petct.apiKey");
    if(!key) throw { code:"no_key", message:"Add your Claude API key in Settings → AI reading." };
    const content = [];
    for(const b of (opts.images||[])) content.push({ type:"image", source:{ type:"base64", media_type: b.type || "image/jpeg", data: await blobToB64(b) } });
    const messages = typeof input === "string" ? [{ role:"user", content: content.concat([{ type:"text", text: input }]) }] : input;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", signal: opts.signal,
      headers:{ "content-type":"application/json", "x-api-key": key, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
      body: JSON.stringify({ model: ls.get("petct.model") || PETCT.MODELS[0][0], max_tokens: 4000, messages })
    });
    if(!r.ok){
      let msg = ""; try{ msg = (await r.json()).error.message; }catch(e){}
      if(r.status===401 || r.status===403) throw { code:"bad_key", message: msg || "The Claude API key was refused." };
      if(r.status===429) throw { code:"rate_limited", message: msg };
      throw { code:"upstream_error", message: msg || ("Claude API error " + r.status) };
    }
    const d = await r.json();
    return { text: (d.content||[]).filter(c=>c.type==="text").map(c=>c.text).join(""), truncated: d.stop_reason==="max_tokens" };
  }
  const sample = (input, opts)=>callClaude(input, opts);
  sample.json = async (input, opts)=>{ const r = await callClaude(input, opts); const m = r.text.match(/[\[{][\s\S]*[\]}]/); if(!m) throw { code:"upstream_error", message:"No data found in the reply" }; return JSON.parse(m[0]); };
  sample.limits = async()=>({ images: true });
  PETCT.testKey = async()=>{ const r = await callClaude("Reply with the single word OK."); return r.text; };

  /* ---------- downloads ---------- */
  const downloads = { save: async ({ filename, data })=>{
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }};

  const caps = { db, user, sample, downloads, mcp: null };
  window.claude = { use: async name=>{ await ready; return caps[name] ?? null; } };
})();
