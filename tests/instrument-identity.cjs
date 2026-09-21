const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),proof=path.join(root,'proof');
fs.mkdirSync(proof,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
  const rel=request.url==='/'?'index.html':decodeURIComponent(request.url.split('?')[0].replace(/^\//,''));
  const target=path.resolve(root,rel);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){response.writeHead(404);response.end();return}
  response.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');
  fs.createReadStream(target).pipe(response);
});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('derby-character-cash-v1')));
const nav=(page,name)=>page.locator(`[data-view="${name}"]`).click();

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true}),errors=[],failed=[];
  const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.url()} ${r.status()}`)});
  await page.goto(base,{waitUntil:'networkidle'});

  assert(await page.locator('.student').count()===24,'Default classroom did not load 24 fictional students');
  assert(await page.locator('.student-card-body').count()===24,'Two-panel card body missing');
  assert(await page.locator('.points-panel').count()===24,'Points panels missing');
  assert(await page.locator('.instrument-panel').count()===24,'Instrument panels missing');
  assert(await page.locator('.instrument-art use').count()===24,'Seed instrument graphics did not load');
  const desktopLayout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cards:[...document.querySelectorAll('.student')].map(card=>{const instrument=card.querySelector('.instrument-panel').getBoundingClientRect(),points=card.querySelector('.points-panel').getBoundingClientRect();return {card:card.getBoundingClientRect().width,instrument:instrument.width,points:points.width}})}));
  assert(!desktopLayout.overflow,'1366px classroom has horizontal overflow');
  assert(desktopLayout.cards.every(x=>x.instrument>35&&x.points>x.instrument),'Instrument/points proportions are not readable');

  const first=page.locator('.student').first(),firstPoints=Number((await first.locator('.points-value').textContent()).replace(',',''));
  await first.focus();await page.keyboard.press('Enter');
  assert(await first.getAttribute('aria-pressed')==='true','Keyboard card selection failed');
  await page.locator('[data-pillar="Responsibility"]').click();
  assert(Number((await page.locator('.student').first().locator('.points-value').textContent()).replace(',',''))===firstPoints+1,'Point award failed');
  await page.locator('#undo').click();
  assert(Number((await page.locator('.student').first().locator('.points-value').textContent()).replace(',',''))===firstPoints,'Undo failed');

  await page.locator('#classSearch').fill('Maya');
  assert(await page.locator('.student').count()===1,'Class search failed');
  await page.locator('#classSearch').fill('');
  const secondClass=await page.locator('#classSelect option').nth(1).getAttribute('value');
  await page.locator('#classSelect').selectOption(secondClass);
  assert((await state(page)).currentClassId===secondClass,'Class switching did not persist');
  const musicClass=await page.locator('#classSelect option').filter({hasText:'Period 3'}).getAttribute('value');
  await page.locator('#classSelect').selectOption(musicClass);

  await nav(page,'setup');
  const ids=['flute','oboe','bassoon','clarinet','bass-clarinet','alto-sax','tenor-sax','baritone-sax','trumpet','french-horn','trombone','euphonium','tuba','electric-bass','percussion','mallets-bells'];
  for(let i=0;i<ids.length;i++)await page.locator('[data-instrument-select]').nth(i).selectOption(ids[i]);
  let saved=await state(page),musicStudents=saved.students.filter(s=>s.classId===saved.currentClassId);
  assert(ids.every((id,i)=>musicStudents[i].instrumentId===id),'All instrument assignments did not persist');
  await page.reload({waitUntil:'networkidle'});await nav(page,'setup');
  for(let i=0;i<ids.length;i++)assert(await page.locator('[data-instrument-select]').nth(i).inputValue()===ids[i],`Refresh lost ${ids[i]}`);
  await page.screenshot({path:path.join(proof,'instrument-class-setup.png'),fullPage:true});

  await nav(page,'class');
  let hrefs=await page.locator('.instrument-art use').evaluateAll(nodes=>nodes.slice(0,16).map(n=>n.getAttribute('href')));
  assert(new Set(hrefs).size===16,'The classroom did not render all 16 distinct instrument symbols');
  await nav(page,'setup');

  const beforeChange=await state(page),student=beforeChange.students.find(s=>s.classId===beforeChange.currentClassId),events=beforeChange.events.length,balance=student.balance;
  await page.locator('[data-instrument-select]').first().selectOption('tuba');
  const afterChange=await state(page),changed=afterChange.students.find(s=>s.id===student.id);
  assert(changed.balance===balance&&afterChange.events.length===events&&changed.instrumentId==='tuba','Instrument change altered points or history');

  await nav(page,'class');
  assert(await page.locator('.instrument-label').first().textContent()==='Tuba','Class card did not update immediately');

  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1')),students=data.students.filter(s=>s.classId===data.currentClassId),values=[0,9,25,100,999,1250,-5];values.forEach((value,i)=>students[i].balance=value);localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))});
  await page.reload({waitUntil:'networkidle'});
  const pointFit=await page.locator('.student').evaluateAll(cards=>cards.slice(0,7).map(c=>{const value=c.querySelector('.points-value'),panel=c.querySelector('.points-panel');return {text:value.textContent,fit:value.scrollWidth<=panel.clientWidth+1,scroll:value.scrollWidth,width:panel.clientWidth,font:getComputedStyle(value).fontSize}}));
  assert(pointFit.every(x=>x.fit),'A tested point total clipped: '+JSON.stringify(pointFit));
  await page.screenshot({path:path.join(proof,'instrument-cards-1366.png'),fullPage:true});

  await nav(page,'setup');await page.locator('#newClass').click();await page.locator('#className').fill('Fictional Test Band');await page.locator('#classForm .primary').click();
  await page.locator('#addStudent').click();await page.locator('#studentName').fill('Test Student');await page.locator('#studentInstrument').selectOption('electric-bass');await page.locator('#studentBalance').fill('1250');await page.locator('#studentForm .primary').click();
  saved=await state(page);let testStudent=saved.students.find(s=>s.name==='Test Student');
  assert(testStudent?.instrumentId==='electric-bass'&&testStudent.balance===1250,'Adding a student with an instrument failed');

  const downloadPromise=page.waitForEvent('download');await page.locator('#setupBackup').click();const backupDownload=await downloadPromise,backupPath=path.join(proof,'test-backup.json');await backupDownload.saveAs(backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  assert(backup.data.students.find(s=>s.id===testStudent.id).instrumentId==='electric-bass','Backup omitted instrumentId');
  backup.data.students.find(s=>s.id===testStudent.id).instrumentId='flute';
  const restorePath=path.join(proof,'restore-test.json');fs.writeFileSync(restorePath,JSON.stringify(backup));
  await nav(page,'settings');await page.locator('#restoreBackup').click();await page.locator('#restoreFile').setInputFiles(restorePath);await page.locator('#confirmRestore').click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('restored'));
  saved=await state(page);assert(saved.students.find(s=>s.id===testStudent.id).instrumentId==='flute','Backup restore did not preserve instrument assignment');

  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1')),s=data.students[0];delete s.instrumentId;s.instrument='Bass clarinet';localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))});
  await page.reload({waitUntil:'networkidle'});saved=await state(page);assert(saved.students[0].instrumentId==='bass-clarinet','Legacy instrument migration failed');

  await page.setViewportSize({width:390,height:844});await nav(page,'class');
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cards:[...document.querySelectorAll('.student')].map(x=>x.getBoundingClientRect().width)}));
  assert(!mobile.overflow&&mobile.cards.every(w=>w>250),'Narrow layout is unusable');
  await page.screenshot({path:path.join(proof,'instrument-cards-phone.png'),fullPage:true});

  assert(errors.length===0,'Console errors: '+errors.join(' | '));
  assert(failed.length===0,'Failed requests: '+failed.join(' | '));
  fs.rmSync(backupPath,{force:true});fs.rmSync(restorePath,{force:true});
  await browser.close();server.close();
  console.log(JSON.stringify({ok:true,instruments:16,cards:24,pointTotals:[0,9,25,100,999,1250,-5],consoleErrors:errors.length,failedRequests:failed.length}));
})().catch(async error=>{console.error(error);server.close();process.exitCode=1});
