const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('chart.umd')) return r.fulfill({ path: require('path').join(__dirname,'node_modules/chart.js/dist/chart.umd.js'), contentType: 'text/javascript' });
    if (u.includes('pdf.min.js')) return r.fulfill({ path: require('path').join(__dirname,'node_modules/pdfjs-dist/build/pdf.min.js'), contentType: 'text/javascript' });
    if (u.includes('pdf.worker.min.js')) return r.fulfill({ path: require('path').join(__dirname,'node_modules/pdfjs-dist/build/pdf.worker.min.js'), contentType: 'text/javascript' });
    if (u.startsWith('file:')) return r.continue();
    return r.fulfill({ body: '' });
  });
  await p.addInitScript(() => {
    const store = {}; const listeners = [];
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const units = ["ACC Vanagaram (In-house)","Apollo Main Hospital, Greams Road","Apollo Cancer Centre, Teynampet","Apollo Hospitals, OMR","International Patient Desk","External – Private doctor / clinic"];
    const docs = ["Dr. Suresh S","Dr. Harish Kumar K","Dr. Rajesh Kar","Dr. Gowri Meena","Dr. Kenny Robert J"];
    const ctry = ["India","India","India","India","India","Bangladesh","Bangladesh","Nepal","Oman"];
    const st = ["Scheduled","Scan Done","Reported","Reported","Cancelled","Prep Informed"];
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const today = new Date();
    for (let i = 0; i < 260; i++) {
      const d = new Date(today); d.setDate(d.getDate() - Math.floor(rnd() * 120) + 3);
      const country = pick(ctry);
      const t = country === 'India' ? 'Domestic' : country === 'Bangladesh' ? 'International – Bangladesh' : country === 'Nepal' ? 'International – Other SAARC' : 'International – Non-SAARC';
      store['cases/c' + i] = { name: 'Patient ' + i, age: 20 + Math.floor(rnd() * 60), gender: pick(['Male', 'Female']), uhid: 'APJ1.' + (100000 + i), country, patientType: t, referredBy: pick(docs), unit: pick(units), referredTo: 'Dr. Abdul Rahim Syed', date: ymd(d), time: pad(8 + Math.floor(rnd() * 9)) + ':' + pick(['00', '30']), scanType: 'Whole Body FDG PET-CT', status: pick(st), history: [] };
    }
    const fire = () => listeners.forEach(l => l());
    const snapDoc = (k) => ({ id: k.split('/').pop(), exists: k in store, data: () => store[k] ? JSON.parse(JSON.stringify(store[k])) : undefined, metadata: {} });
    const db = {
      doc: (pth) => ({ path: pth, get: async () => snapDoc(pth), set: async d => { store[pth] = d; fire(); }, update: async d => { Object.assign(store[pth], d); fire(); }, delete: async () => { delete store[pth]; fire(); },
        onSnapshot: (n) => { const l = () => n(snapDoc(pth)); listeners.push(l); setTimeout(l, 10); return () => {}; } }),
      collection: (c) => ({ add: async d => { const id='n'+Date.now()+Math.floor(Math.random()*1000); store[c + '/' + id] = JSON.parse(JSON.stringify(d)); fire(); return {id}; },
        onSnapshot: (n) => { const l = () => { const ks = Object.keys(store).filter(k => k.startsWith(c + '/')); n({ docs: ks.map(snapDoc), size: ks.length }); }; listeners.push(l); setTimeout(l, 20); return () => {}; } })
    };
    const sample = async () => ({ text: '{}' });
    sample.json = async (pr, o) => { if(pr.includes('WhatsApp message')) return {cases:[{name:'kavitha r',age:46,gender:'Female',referredBy:'Dr. Harish Kumar K',unitMatch:'ACC Vanagaram (In-house)',country:'India',appointmentDate:null,appointmentTime:'10:30'},{name:'abul kalam',age:61,gender:'Male',country:'Bangladesh',referredBy:'Dr. Suresh S'}]}; window.__imgs = o.images.length; return { name: 'MD RAHMAN HOSSAIN', age: 54, gender: 'Male', uhid: 'apj1.0000998877', referredBy: 'dr. suresh s', referringUnitRaw: 'Apollo Dhaka Info Centre', unitMatch: 'International Patient Desk', country: 'Bangladesh', phone: '+880 1711 000000', diagnosis: 'Ca lung, staging', scanMatch: 'Whole Body FDG PET-CT', appointmentDate: null, uncertain: ['age'] }; };
    sample.limits = async () => ({ images: true });
    const user = { id: async () => 'u1', can: async () => true, profiles: async (ids) => Object.fromEntries(ids.map(i => [i, { name: 'Hemakumar' }])), isOwner: () => true };
    store['config/settings']={monthlyTarget:150,openingScans:820,deskPhone:'044-xxxx'}; Object.keys(store).forEach((k,i)=>{ if(k.startsWith('cases/')){ const c=store[k]; c.amount = 18000+ (i%5)*2000; c.billing=['Cash','Insurance','International package'][i%3]; c.visitType=['Baseline / staging','Follow-up / response'][i%2]; c.prep={fasting:true,renal:i%2==0}; const t=new Date(c.date+'T10:00:00'); c.createdAt=new Date(t-86400e3).toISOString(); c.history=[{s:'Scan Done',at:t.toISOString()},{s:'Reported',at:new Date(+t+ (6+i%30)*3600e3).toISOString()}]; if(c.status==='Scan Done') c.history=[{s:'Scan Done',at:new Date(+t-40*3600e3).toISOString()}]; }});window.claude = { use: async n => ({ db, sample, user, downloads: null }[n] ?? null) };
  });
  await p.goto('file://' + path.resolve(''+require('path').resolve(__dirname,'../claude/index.html')+'') + '#today');
  await p.waitForTimeout(800);
  await p.screenshot({ path: require('path').join(__dirname,'out','today.png'), fullPage: true });
  // add flow
  await p.goto('file://' + path.resolve(''+require('path').resolve(__dirname,'../claude/index.html')+'') + '#add');
  await p.waitForTimeout(500);
  // make test image
  await p.setInputFiles('.camIn[data-src=screen]', require('path').join(__dirname,'fixture/blank-page.png')).catch(e => errs.push('setInput ' + e.message));
  await p.waitForTimeout(800);
  await p.click('#readBtn');
  await p.waitForTimeout(600);
  await p.screenshot({ path: require('path').join(__dirname,'out','add.png'), fullPage: true });
  console.log('imgs sent', await p.evaluate(() => window.__imgs));
  console.log('form name', await p.inputValue('[name=name]'), await p.inputValue('[name=uhid]'), await p.inputValue('[name=referredTo]'), await p.textContent('#a_typeBadge'));
  await p.click('#saveCase');
  await p.waitForTimeout(600);
  console.log('hash', await p.evaluate(() => location.hash));
  await p.evaluate(() => location.hash = '#add');
  await p.fill('#waText', 'Pt Kavitha 46/F ref Dr Harish 10.30am; BD pt Abul Kalam 61M');
  await p.click('#waBtn'); await p.waitForTimeout(400);
  console.log('wa1', await p.inputValue('[name=name]'), await p.inputValue('[name=time]'), await p.textContent('#queueLbl'));
  await p.click('#saveCase'); await p.waitForTimeout(400);
  console.log('wa2', await p.inputValue('[name=name]'), await p.textContent('#a_typeBadge'));
  await p.click('#saveCase'); await p.waitForTimeout(400);
  console.log('hash2', await p.evaluate(() => location.hash));
  await p.click('#snapBtn'); await p.waitForTimeout(1200);
  const src = await p.getAttribute('#sheet img','src');
  require('fs').writeFileSync(require('path').join(__dirname,'out','snap.png'), Buffer.from(src.split(',')[1],'base64'));
  await p.click('#mClose');
  await p.evaluate(() => location.hash = '#dashboard');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: require('path').join(__dirname,'out','dash.png'), fullPage: true });
  await p.click('#rangeChips .chip[data-r=fy]');
  await p.waitForTimeout(600);
  await p.setViewportSize({ width: 1200, height: 900 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: require('path').join(__dirname,'out','dash_wide.png'), fullPage: true });
  await p.evaluate(() => location.hash = '#cases');
  await p.waitForTimeout(500);
  await p.click('#caseList .case');
  await p.waitForTimeout(300);
  await p.screenshot({ path: require('path').join(__dirname,'out','modal2.png'), fullPage:false });
  await p.click('#mClose');
  await p.evaluate(() => location.hash = '#today'); await p.waitForTimeout(300);
  await p.click('#goTom'); await p.waitForTimeout(300);
  await p.screenshot({ path: require('path').join(__dirname,'out','tom.png'), fullPage:true });
  await p.evaluate(() => { location.hash = '#cases'; }); await p.waitForTimeout(300);
  await p.click('#caseList .case');
  await p.waitForTimeout(400);
  await p.screenshot({ path: require('path').join(__dirname,'out','modal.png') });
  // discard-changes flow
  await p.click('#mClose').catch(()=>{});
  await p.evaluate(() => location.hash = '#today'); await p.waitForTimeout(200);
  await p.click('#goToday'); await p.waitForTimeout(200);
  const nx = await p.$('.nx'); if(nx){ await nx.click(); await p.waitForTimeout(300); }
  await p.click('#dayList .case'); await p.waitForTimeout(300);
  const nm = await p.textContent('#sheet h3');
  await p.click('#mDel'); await p.waitForTimeout(200);
  await p.click('.modal[style*="z-index: 70"] button[data-a="1"]'); await p.waitForTimeout(400);
  const cnt1 = await p.evaluate(()=>document.querySelectorAll('#dayList .case').length);
  await p.evaluate(() => location.hash = '#changes'); await p.waitForTimeout(500);
  await p.screenshot({path: require('path').join(__dirname,'out','changes.png'), fullPage:true});
  await p.click('#chgList .undo'); await p.waitForTimeout(200);
  await p.click('.modal[style*="z-index: 70"] button[data-a="1"]'); await p.waitForTimeout(400);
  await p.evaluate(() => location.hash = '#today'); await p.waitForTimeout(300);
  const cnt2 = await p.evaluate(()=>document.querySelectorAll('#dayList .case').length);
  console.log('deleted', nm, 'cases', cnt1, '-> after undo', cnt2);
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
