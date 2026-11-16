// Tests the GitHub Pages build (index.html) with a local server: device storage, Excel upload, Claude key reading (mocked), print window, backup import.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const http=require('http');
const ROOT = path.resolve(__dirname,'..');
const srv = http.createServer((q,s)=>{ let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if(f.endsWith('/')) f+='index.html';
  fs.readFile(f,(e,b)=>{ if(e){ s.writeHead(404); return s.end(); } s.writeHead(200,{'content-type': f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'application/octet-stream'}); s.end(b); }); }).listen(8777);
const NM = p=>path.join(__dirname,'node_modules',p);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  let apiCalls=0;
  await p.route('**/*', r=>{ const u=r.request().url();
    if(u.includes('chart.umd')) return r.fulfill({path:NM('chart.js/dist/chart.umd.js'),contentType:'text/javascript'});
    if(u.includes('jspdf.umd')) return r.fulfill({path:NM('jspdf/dist/jspdf.umd.min.js'),contentType:'text/javascript'});
    if(u.includes('autotable')) return r.fulfill({path:NM('jspdf-autotable/dist/jspdf.plugin.autotable.min.js'),contentType:'text/javascript'});
    if(u.includes('xlsx.full')) return r.fulfill({path:NM('xlsx/dist/xlsx.full.min.js'),contentType:'text/javascript'});
    if(u.includes('api.anthropic.com')){ apiCalls++; const h=r.request().headers(); if(h['x-api-key']!=='sk-ant-test') return r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{message:'invalid x-api-key'}})});
      const body=JSON.parse(r.request().postData()); const isWa = JSON.stringify(body).includes('WhatsApp message');
      const reply = isWa ? {cases:[{name:'mrs.test whatsapp',age:40,gender:'Female',country:'Bangladesh',referredBy:'dr.sample x'}]} : {name:'MR.TEST SCAN',age:61,gender:'Male',uhid:'test1.0000000099',country:'India'};
      return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({content:[{type:'text',text:JSON.stringify(reply)}],stop_reason:'end_turn'})}); }
    if(u.startsWith('http://localhost:8777')) return r.continue();
    return r.fulfill({body:''}); });
  const base='http://localhost:8777/';
  await p.goto(base+'#today'); await p.waitForTimeout(1200);
  console.log('title:', await p.title(), '| manifest:', await p.getAttribute('link[rel=manifest]','href'));
  // 1. manual case persists across reload
  await p.evaluate(()=>location.hash='#add'); await p.waitForTimeout(300);
  await p.fill('#caseForm [name=name]','mr.LOCAL saved'); await p.fill('#caseForm [name=date]','2026-10-28'); await p.click('#saveCase'); await p.waitForTimeout(600);
  await p.reload(); await p.waitForTimeout(1200);
  await p.fill('#dayPick','2026-10-28'); await p.dispatchEvent('#dayPick','change'); await p.waitForTimeout(300);
  console.log('after reload:', await p.evaluate(()=>[...document.querySelectorAll('#dayList .nm')].map(x=>x.textContent.trim())));
  // 2. reading without key -> message
  await p.evaluate(()=>location.hash='#add'); await p.waitForTimeout(300);
  await p.fill('#waText','Pt test 40F BD'); await p.click('#waBtn'); await p.waitForTimeout(400);
  console.log('no key:', (await p.textContent('#waState')).trim());
  // 3. key in settings, test, then read
  await p.evaluate(()=>location.hash='#settings'); await p.waitForTimeout(300);
  await p.fill('#sKey','sk-ant-test'); await p.click('#keyTest'); await p.waitForTimeout(500);
  console.log('key test:', await p.textContent('#keyMsg'));
  await p.evaluate(()=>location.hash='#add'); await p.waitForTimeout(300);
  await p.click('#waBtn'); await p.waitForTimeout(600);
  console.log('wa read:', await p.inputValue('#caseForm [name=name]'), await p.inputValue('#caseForm [name=referredBy]'), await p.inputValue('#a_amt'));
  await p.setInputFiles('.camIn[data-src=paper]', path.join(__dirname,'fixture/blank-page.png')); await p.waitForTimeout(600);
  await p.click('#readBtn'); await p.waitForTimeout(600);
  console.log('scan read:', await p.inputValue('#caseForm [name=name]'), await p.inputValue('#caseForm [name=uhid]'), 'api calls', apiCalls);
  // 4. Excel upload
  await p.evaluate(()=>location.hash='#today'); await p.waitForTimeout(300);
  await p.fill('#dayPick','2026-10-28'); await p.dispatchEvent('#dayPick','change');
  await p.click('#sheetBtn'); await p.waitForTimeout(300);
  await p.setInputFiles('#spFile', path.join(__dirname,'fixture/sample-appointments.xlsx')); await p.waitForTimeout(1500);
  console.log('sheet rows:', await p.evaluate(()=>[...document.querySelectorAll('#spOut .case .nm')].map(x=>x.textContent.trim())));
  await p.screenshot({path:path.join(__dirname,'out','gh_sheet.png')});
  await p.click('#spImport'); await p.waitForTimeout(800);
  console.log('today after import:', await p.evaluate(()=>document.querySelectorAll('#dayList .case').length));
  // 5. print window
  await p.click('#printDayBtn'); await p.waitForTimeout(2000);
  console.log('print window:', await p.evaluate(()=>!!document.querySelector('#pdfFrame') && !!document.querySelector('#pdfPrint')));
  await p.screenshot({path:path.join(__dirname,'out','gh_print.png')});
  await p.click('#mClose');
  // 6. backup export + import into a fresh profile
  await p.evaluate(()=>location.hash='#settings'); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#backupBtn')]);
  const bfile = path.join(__dirname,'out','backup.json'); await dl.saveAs(bfile);
  const nCases = JSON.parse(fs.readFileSync(bfile)).cases.length;
  const ctx2=await b.newContext({viewport:{width:390,height:844}}); const p2=await ctx2.newPage(); await p2.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('http://localhost:8777')) return r.continue(); if(u.includes('chart.umd')) return r.fulfill({path:NM('chart.js/dist/chart.umd.js'),contentType:'text/javascript'}); return r.fulfill({body:''}); });
  p2.on('pageerror',e=>errs.push('P2 '+e.message));
  await p2.goto(base+'#settings'); await p2.waitForTimeout(1200);
  await p2.setInputFiles('#importFile', bfile); await p2.waitForTimeout(300);
  await p2.click('.modal[style*="z-index: 70"] button[data-a="1"]'); await p2.waitForTimeout(800);
  console.log('backup cases', nCases, '->', await p2.textContent('#backupMsg'));
  await p.screenshot({path:path.join(__dirname,'out','gh_settings.png'), fullPage:true});
  console.log(errs.join('\n')||'no errors'); await b.close(); srv.close();
})();
