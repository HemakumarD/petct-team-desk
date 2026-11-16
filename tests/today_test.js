const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*', r=>{ const u=r.request().url();
    if(u.includes('chart.umd')) return r.fulfill({path:require('path').join(__dirname,'node_modules/chart.js/dist/chart.umd.js'),contentType:'text/javascript'});
    if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:''}); });
  const sheet = fs.readFileSync(require('path').join(__dirname,'fixture/sample-oct-2026.txt'),'utf8');
  await p.addInitScript(`window.__SHEET = ${JSON.stringify(sheet)};`);
  await p.addInitScript(()=>{
    const store={}, L=[]; const fire=()=>L.forEach(l=>l());
    const snap=k=>({id:k.split('/').pop(),exists:k in store,data:()=>store[k]&&JSON.parse(JSON.stringify(store[k])),metadata:{}});
    const db={doc:pth=>({get:async()=>snap(pth),set:async d=>{store[pth]=d;fire()},update:async d=>{Object.assign(store[pth],d);fire()},delete:async()=>{delete store[pth];fire()},onSnapshot:n=>{const l=()=>n(snap(pth));L.push(l);setTimeout(l,10);return()=>{}}}),
      collection:c=>({add:async d=>{const id='n'+Math.random().toString(36).slice(2);store[c+'/'+id]=JSON.parse(JSON.stringify(d));fire();return{id}},onSnapshot:n=>{const l=()=>{const ks=Object.keys(store).filter(k=>k.startsWith(c+'/'));n({docs:ks.map(snap),size:ks.length})};L.push(l);setTimeout(l,20);return()=>{}}})};
    const mcp={callTool:async(s,t,i)=>({content:[{type:'text',text:window.__SHEET}]})};
    const user={id:async()=>'u1',can:async()=>true,profiles:async ids=>Object.fromEntries(ids.map(i=>[i,{name:'Hemakumar'}]))};
    window.claude={use:async n=>({db,user,mcp}[n]??null)};
  });
  await p.goto('file://'+require('path').resolve(__dirname,'../claude/index.html')+'#today'); await p.waitForTimeout(700);
  await p.fill('#dayPick','2026-10-28'); await p.dispatchEvent('#dayPick','change');
  await p.click('#sheetBtn'); await p.waitForTimeout(900);
  await p.screenshot({path: require('path').join(__dirname,'out','today_pull.png'),fullPage:false});
  const rows = await p.evaluate(()=>[...document.querySelectorAll('#spOut .case')].map(r=>r.innerText.replace(/\n+/g,' | ')));
  console.log(rows.join('\n'));
  await p.click('#spImport'); await p.waitForTimeout(800);
  const list = await p.evaluate(()=>[...document.querySelectorAll('#dayList .case')].map(r=>r.innerText.replace(/\n+/g,' | ')));
  console.log('--- Today list after import ---\n'+list.join('\n'));
  await p.screenshot({path: require('path').join(__dirname,'out','today_after.png'),fullPage:true});
  await p.click('#sheetBtn'); await p.waitForTimeout(900);
  console.log('--- second pull ---', await p.evaluate(()=>document.querySelector('#spOut .note').innerText));
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
