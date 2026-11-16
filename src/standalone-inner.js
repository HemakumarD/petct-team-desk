/* ---------- standalone (GitHub Pages) additions ---------- */
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
let sheetText = (window.PETCT && PETCT.ls.get("petct.sheetText")) || "";
let sheetMeta = (()=>{ try{ return JSON.parse(PETCT.ls.get("petct.sheetMeta")||"null"); }catch(e){ return null; } })();

function workbookToText(wb){
  const out = ["Workbook: " + wb.SheetNames.length + " worksheets."];
  wb.SheetNames.forEach((n,i)=>out.push((i+1) + ". " + n));
  wb.SheetNames.forEach(n=>{
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header:1, raw:false, defval:"", blankrows:true });
    out.push("", "## Sheet: " + n);
    rows.forEach(r=>out.push(r.map(v=>String(v).replace(/[\t\r\n]+/g," ")).join("\t")));
  });
  return out.join("\n");
}
async function readExcelFile(file){
  if(!window.XLSX) await loadScript(XLSX_URL);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array" });
  return workbookToText(wb);
}
async function openSheetUpload(d){
  const when = sheetMeta ? `${esc(sheetMeta.name)} · loaded ${new Date(sheetMeta.at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}` : "";
  $("sheet").innerHTML = `<div class="hd"><h3 style="margin:0">Appointment sheet</h3><button class="ghost sm" id="mClose">Close</button></div>
    <div class="card">
      <div class="note" style="margin-bottom:10px">Download <b>PET CT APPOINTMENT 2026</b> from the Nuclear Medicine Vanagaram email (OneDrive → Download), then load it here. The file stays on this device.</div>
      <label class="btn" style="display:flex;justify-content:center;gap:8px;margin:0 0 10px;color:#fff">Load Excel file (.xlsx)<input type="file" id="spFile" class="vh" accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></label>
      ${when?`<div class="note" id="spLoaded" style="margin-bottom:10px">Using: ${when}</div>`:`<div class="note" id="spLoaded" style="margin-bottom:10px">No sheet loaded yet.</div>`}
      <div class="row" style="flex-wrap:nowrap"><input type="date" id="spDate" value="${d}" class="grow"><button id="spGo" ${sheetText?"":"disabled"}>Show</button></div>
      <div class="chips" style="margin-top:10px"><span class="chip" data-o="-1">Yesterday</span><span class="chip" data-o="0">Today</span><span class="chip" data-o="1">Tomorrow</span><span class="chip" data-o="2">Day after</span></div>
    </div>
    <div id="spOut"></div>`;
  $("modal").classList.add("on");
  $("mClose").onclick = closeModal;
  const show = ()=>{
    const dd = $("spDate").value || today();
    if(!sheetText){ $("spOut").innerHTML = `<div class="warn">Load the Excel file first.</div>`; return; }
    try{ sheetRows = parseSheetRows(sheetText).filter(r=>r.date===dd); renderSheetRows(dd, sheetMeta ? sheetMeta.name : "sheet"); }
    catch(e){ console.error(e); $("spOut").innerHTML = `<div class="err">Couldn't read that sheet. Check it is the PET CT APPOINTMENT file.</div>`; }
  };
  $("sheet").querySelectorAll(".chip[data-o]").forEach(ch=>ch.onclick=()=>{ $("spDate").value = addDays(today(), Number(ch.dataset.o)); show(); });
  $("spGo").onclick = show;
  $("spFile").onchange = async e=>{
    const f = e.target.files[0]; if(!f) return;
    $("spOut").innerHTML = `<div class="card"><div class="ai" style="margin:0"><div class="spin"></div>Reading ${esc(f.name)}…</div></div>`;
    try{
      sheetText = await readExcelFile(f);
      sheetMeta = { name: f.name, at: new Date().toISOString() };
      PETCT.ls.set("petct.sheetText", sheetText); PETCT.ls.set("petct.sheetMeta", JSON.stringify(sheetMeta));
      $("spLoaded").textContent = `Using: ${f.name} · loaded just now`; $("spGo").disabled = false;
      show();
    }catch(err){ console.error(err); $("spOut").innerHTML = `<div class="err">Couldn't open that file. Use the .xlsx downloaded from OneDrive.</div>`; }
  };
  if(sheetText) show();
}

/* print / save window for PDFs */
function standalonePdf(blob, filename){
  const url = URL.createObjectURL(blob);
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  $("sheet").innerHTML = `<div class="hd"><h3 style="margin:0">Print</h3><button class="ghost sm" id="mClose">Close</button></div>
    <div class="row" style="margin-bottom:12px">
      <button id="pdfPrint" class="grow">Print</button>
      <button id="pdfSave" class="sec grow">Save PDF</button>
      ${navigator.canShare ? `<button id="pdfShare" class="ghost grow">Share</button>` : ""}
    </div>
    ${mobile ? `<p class="note">On a phone, tap <b>Print</b> to open the PDF, then use the share / print option of your phone.</p>` : ""}
    <iframe id="pdfFrame" src="${url}" title="PDF preview" style="width:100%;height:68vh;border:0;border-radius:14px;background:#fff;box-shadow:var(--sh)"></iframe>`;
  $("modal").classList.add("on");
  $("mClose").onclick = ()=>{ closeModal(); setTimeout(()=>URL.revokeObjectURL(url), 60000); };
  $("pdfSave").onclick = ()=>downloads.save({ filename, data: blob });
  $("pdfPrint").onclick = ()=>{
    if(mobile){ window.open(url, "_blank"); return; }
    try{ const w = $("pdfFrame").contentWindow; w.focus(); w.print(); }
    catch(e){ window.open(url, "_blank"); }
  };
  const sh = $("pdfShare");
  if(sh) sh.onclick = async ()=>{ const file = new File([blob], filename, { type:"application/pdf" }); if(navigator.canShare({ files:[file] })){ try{ await navigator.share({ files:[file], title: filename }); }catch(e){} } else downloads.save({ filename, data: blob }); };
}

/* settings: Google Drive sync, Claude key, your name, import */
function setupStandaloneSettings(){
  const sheetField = $("sSheet"); if(sheetField) sheetField.closest(".full").style.display = "none";
  const host = $("backupCard");
  const card = document.createElement("div");
  card.innerHTML = `
    <div class="card">
      <h3>Google Drive sync</h3>
      <p class="note" style="margin:0 0 10px">Cases are kept on this device. Sign in with Google to keep a copy in your Google Drive (file <b>petct-team-desk-data.json</b>) and keep your phone and computer in step. <b>Every team device must sign in with the same Google account.</b></p>
      <div class="row"><button type="button" id="gIn">Sign in with Google</button><button type="button" class="sec" id="gSync">Sync now</button><button type="button" class="ghost" id="gOut">Sign out</button></div>
      <div class="note" id="gStatus" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <h3>AI reading (Claude)</h3>
      <p class="note" style="margin:0 0 10px">Reading case sheets, prescriptions and WhatsApp messages uses your own Claude API key (console.anthropic.com → API keys). The key is saved only on this device, never in GitHub. Each reading costs a small amount on your Anthropic account.</p>
      <div class="grid2">
        <div class="full"><label>Claude API key</label><input id="sKey" type="password" autocomplete="off" placeholder="sk-ant-…"></div>
        <div class="full"><label>Model</label><select id="sModel">${PETCT.MODELS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div>
      </div>
      <div class="row" style="margin-top:10px"><button type="button" id="keySave">Save key</button><button type="button" class="sec" id="keyTest">Test</button><button type="button" class="ghost" id="keyDel">Remove key</button><span class="note" id="keyMsg"></span></div>
    </div>
    <div class="card">
      <h3>Your name</h3>
      <p class="note" style="margin:0 0 10px">Shown in the case history and change list on this device.</p>
      <div class="row" style="flex-wrap:nowrap"><input id="sName" class="grow" placeholder="e.g. Hemakumar D"><button type="button" class="sec" id="nameSave">Save</button></div>
    </div>`;
  const formCard = $("sRefTo").closest(".card");
  formCard.parentNode.insertBefore(card, formCard);
  // backup card: add import
  host.querySelector(".row").insertAdjacentHTML("beforeend", `<label class="btn" style="margin:0;color:var(--teal-d);background:var(--teal-l);box-shadow:none">Import backup<input type="file" id="importFile" class="vh" accept=".json,application/json"></label>`);
  host.querySelector("p.note").innerHTML = "Download every case, the settings and the change history as one file, or import a backup – including the one downloaded from the claude.ai version. Keep backups safe – they contain patient details.";

  PETCT.onSyncStatus(st=>{
    $("gStatus").textContent = st.text + (st.lastSync ? ` · last sync ${st.lastSync.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}` : "");
    $("gIn").style.display = st.signedIn ? "none" : ""; $("gOut").style.display = st.signedIn ? "" : "none"; $("gSync").style.display = st.signedIn ? "" : "none";
  });
  $("gIn").onclick = ()=>PETCT.signIn(); $("gOut").onclick = ()=>PETCT.signOut(); $("gSync").onclick = ()=>PETCT.syncNow();
  const ls = PETCT.ls;
  $("sKey").value = ls.get("petct.apiKey") || ""; $("sModel").value = ls.get("petct.model") || PETCT.MODELS[0][0]; $("sName").value = ls.get("petct.userName") || "";
  $("sModel").onchange = ()=>ls.set("petct.model", $("sModel").value);
  $("keySave").onclick = ()=>{ const k = $("sKey").value.trim(); if(!k){ $("keyMsg").textContent = "Enter a key first"; return; } ls.set("petct.apiKey", k); $("keyMsg").textContent = "Saved on this device"; };
  $("keyDel").onclick = ()=>{ ls.del("petct.apiKey"); $("sKey").value = ""; $("keyMsg").textContent = "Key removed"; };
  $("keyTest").onclick = async ()=>{ const k = $("sKey").value.trim(); if(k) ls.set("petct.apiKey", k); $("keyMsg").textContent = "Testing…"; try{ await PETCT.testKey(); $("keyMsg").textContent = "Key works ✓"; }catch(e){ $("keyMsg").textContent = (e && e.message) || "Key didn't work"; } };
  $("nameSave").onclick = ()=>{ ls.set("petct.userName", $("sName").value.trim()); toast("Name saved"); };
  $("importFile").onchange = async e=>{
    const f = e.target.files[0]; e.target.value = ""; if(!f) return;
    let data; try{ data = JSON.parse(await f.text()); }catch(err){ toast("That isn't a PET-CT backup file"); return; }
    if(!data || data.app!=="petct-team-desk" || !Array.isArray(data.cases)){ toast("That isn't a PET-CT backup file"); return; }
    if(!(await confirmDlg(`Import ${data.cases.length} cases${data.settings?" and the settings":""} from ${f.name}? Cases with the same ID are replaced; others are kept.`, "Import"))) return;
    let n = 0;
    for(const c of data.cases){ const { id, ...rest } = c; if(!id) continue; await db.doc("cases/"+id).set(rest); n++; }
    if(data.settings) await db.doc("config/settings").set(data.settings);
    if(Array.isArray(data.changes)) for(const ch of data.changes){ const { id, ...rest } = ch; if(id) await db.doc("changes/"+id).set(rest); }
    $("backupMsg").textContent = `${n} cases imported`; toast(`${n} cases imported`);
  };
}
