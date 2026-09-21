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
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}),errors=[],failed=[];
  const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.url()} ${r.status()}`)});
  page.on('dialog',dialog=>dialog.accept());
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
  await page.locator('#addStudent').click();await page.locator('#studentName').fill('Test Student');await page.locator('#studentInstrument').selectOption('electric-bass');await page.locator('#studentForm .primary').click();
  saved=await state(page);let testStudent=saved.students.find(s=>s.name==='Test Student');
  assert(testStudent?.instrumentId==='electric-bass'&&testStudent.balance===0,'Adding a student with an instrument or zero default failed');
  await page.evaluate(id=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1'));data.students.find(s=>s.id===id).balance=1250;localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))},testStudent.id);
  await page.reload({waitUntil:'networkidle'});await nav(page,'setup');saved=await state(page);testStudent=saved.students.find(s=>s.id===testStudent.id);

  const downloadPromise=page.waitForEvent('download');await page.locator('#setupBackup').click();const backupDownload=await downloadPromise,backupPath=path.join(proof,'test-backup.json');await backupDownload.saveAs(backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  assert(backup.data.students.find(s=>s.id===testStudent.id).instrumentId==='electric-bass','Backup omitted instrumentId');
  backup.data.students.find(s=>s.id===testStudent.id).instrumentId='flute';
  const restorePath=path.join(proof,'restore-test.json');fs.writeFileSync(restorePath,JSON.stringify(backup));
  await nav(page,'settings');await page.locator('#restoreBackup').click();await page.locator('#restoreFile').setInputFiles(restorePath);await page.locator('#confirmRestore').click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('restored'));
  saved=await state(page);assert(saved.students.find(s=>s.id===testStudent.id).instrumentId==='flute','Backup restore did not preserve instrument assignment');

  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1')),s=data.students[0];delete s.instrumentId;s.instrument='Bass clarinet';localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))});
  await page.reload({waitUntil:'networkidle'});saved=await state(page);assert(saved.students[0].instrumentId==='bass-clarinet','Legacy instrument migration failed');

  await nav(page,'settings');
  assert(await page.locator('#manageRoster').isVisible()&&await page.locator('#manageRewards').isVisible(),'Settings management sections are missing');
  await page.screenshot({path:path.join(proof,'settings-management.png'),fullPage:true});
  await page.locator('#manageRoster').click();
  assert(await page.locator('#backSettings').isVisible(),'Class Setup opened from Settings has no Back to Settings control');
  await page.locator('#setupClass').selectOption(saved.students.find(s=>s.id===testStudent.id).classId);
  let testRow=page.locator('tr').filter({hasText:'Test Student'});
  await testRow.locator('[data-edit]').click();await page.locator('#studentName').fill("O'Neil-Álvarez");await page.locator('#studentInstrument').selectOption('mallets-bells');await page.locator('#studentForm .primary').click();
  saved=await state(page);let renamed=saved.students.find(s=>s.id===testStudent.id);assert(renamed.name==="O'Neil-Álvarez"&&renamed.balance===1250&&renamed.instrumentId==='mallets-bells','Editing a student changed identity or balance');
  await page.locator('#bulkNames').fill("River K.\nRiver K.\n\nO'Neil-Álvarez");await page.locator('#previewBulk').click();
  assert((await page.locator('.preview-list .ready').count())===1&&(await page.locator('.preview-list .bad').count())===2,'Bulk preview did not flag duplicate and existing names');
  await page.locator('#confirmImport').click();saved=await state(page);assert(saved.students.filter(s=>s.name==='River K.').length===1,'Bulk import merged or duplicated entries');
  testRow=page.locator('tr').filter({hasText:"O'Neil-Álvarez"});await testRow.locator('[data-archive-student]').click();saved=await state(page);renamed=saved.students.find(s=>s.id===testStudent.id);assert(renamed.archived&&renamed.balance===1250,'Archiving lost the student balance');
  await nav(page,'class');assert((await page.locator('.student').filter({hasText:"O'Neil-Álvarez"}).count())===0,'Archived student remained on classroom screen');await nav(page,'rewards');assert((await page.locator('#rewardStudent option').filter({hasText:"O'Neil-Álvarez"}).count())===0,'Archived student remained a reward recipient');await nav(page,'setup');await page.locator('#setupClass').selectOption(renamed.classId);
  await page.locator('.archived-card summary').click();await page.locator(`[data-restore-student="${testStudent.id}"]`).click();saved=await state(page);assert(!saved.students.find(s=>s.id===testStudent.id).archived,'Archived student did not restore');
  await nav(page,'settings');await page.locator('#manageRewards').click();
  const initialRewards=(await state(page)).rewards.length;
  await page.locator('#addReward').click();await page.locator('#rewardName').fill('Unsaved Draft');await page.locator('[data-close]').click();assert((await state(page)).rewards.length===initialRewards,'Cancel saved a reward draft');
  const invalidCosts=['','0','-2','1.5'];for(const cost of invalidCosts){await page.locator('#addReward').click();await page.locator('#rewardName').fill('Invalid Cost');await page.locator('#rewardPrice').fill(cost);await page.locator('#rewardForm .primary').click();assert((await page.locator('#rewardPriceError').textContent()).includes('positive whole number'),`Cost ${cost||'blank'} was accepted`);await page.locator('[data-close]').click()}
  await page.locator('#addReward').click();await page.locator('#rewardName').fill('Nonnumeric Cost');await page.locator('#rewardPrice').evaluate(input=>input.type='text');await page.locator('#rewardPrice').fill('abc');await page.locator('#rewardForm .primary').click();assert((await page.locator('#rewardPriceError').textContent()).includes('positive whole number'),'Nonnumeric cost was accepted');await page.locator('[data-close]').click();
  await page.locator('#addReward').click();await page.locator('#rewardName').fill('Band Director for a Minute');await page.locator('#rewardDescription').fill('Lead one short classroom routine.');await page.locator('#rewardPrice').fill('11');await page.locator('#rewardForm .primary').click();
  saved=await state(page);let custom=saved.rewards.find(r=>r.name==='Band Director for a Minute');assert(custom&&custom.id&&custom.price===11&&custom.available,'New reward was not saved correctly');
  let customCard=page.locator('.reward-manage-card').filter({hasText:'Band Director for a Minute'});await customCard.locator('[data-edit-reward]').click();await page.locator('#rewardName').fill('Cancelled Name');await page.locator('[data-close]').click();assert((await state(page)).rewards.find(r=>r.id===custom.id).name==='Band Director for a Minute','Cancel changed a saved reward');
  await customCard.locator('[data-edit-reward]').click();await page.locator('#rewardName').fill('Junior Director Pass');await page.locator('#rewardPrice').fill('13');await page.locator('#rewardForm .primary').click();saved=await state(page);custom=saved.rewards.find(r=>r.id===custom.id);assert(custom.name==='Junior Director Pass'&&custom.price===13,'Reward edit failed or changed stable ID');
  customCard=page.locator('.reward-manage-card').filter({hasText:'Junior Director Pass'});await customCard.locator('[data-toggle-reward]').click();await nav(page,'rewards');assert((await page.locator('[data-reward]').allTextContents()).every(x=>!x.includes('Junior Director Pass')),'Hidden reward remained redeemable');
  await nav(page,'settings');await page.locator('#manageRewards').click();customCard=page.locator('.reward-manage-card').filter({hasText:'Junior Director Pass'});await customCard.locator('[data-toggle-reward]').click();await customCard.locator('[data-move-reward][data-direction="up"]').click();
  await page.screenshot({path:path.join(proof,'reward-management.png'),fullPage:true});
  await nav(page,'rewards');await page.locator(`[data-reward="${custom.id}"]`).click();await page.locator('#rewardStudent').selectOption(testStudent.id);const beforeRedeem=(await state(page)).students.find(s=>s.id===testStudent.id).balance;await page.locator('#redeem').click();saved=await state(page);const redemption=saved.events.find(e=>e.type==='redemption'&&e.rewardId===custom.id);assert(saved.students.find(s=>s.id===testStudent.id).balance===beforeRedeem-13,'Redemption deducted the wrong amount');assert(redemption?.rewardTitle==='Junior Director Pass'&&redemption.pointCost===13&&redemption.studentId===testStudent.id&&redemption.classId,'Redemption snapshot is incomplete');
  await nav(page,'settings');await page.locator('#manageRewards').click();customCard=page.locator('.reward-manage-card').filter({hasText:'Junior Director Pass'});await customCard.locator('[data-edit-reward]').click();await page.locator('#rewardName').fill('Renamed After Redemption');await page.locator('#rewardPrice').fill('99');await page.locator('#rewardForm .primary').click();saved=await state(page);const historical=saved.events.find(e=>e.id===redemption.id);assert(historical.rewardTitle==='Junior Director Pass'&&historical.pointCost===13,'Editing a reward rewrote redemption history');

  const managementDownload=page.waitForEvent('download');await nav(page,'settings');await page.locator('#exportBackup').click();const managementFile=await managementDownload,managementPath=path.join(proof,'management-backup.json');await managementFile.saveAs(managementPath);const managementBackup=JSON.parse(fs.readFileSync(managementPath,'utf8'));assert(managementBackup.data.rewards.find(r=>r.id===custom.id)?.name==='Renamed After Redemption','Backup omitted customized rewards');assert(managementBackup.data.students.find(s=>s.id===testStudent.id)?.archived===false,'Backup omitted archive state');
  managementBackup.data.students.find(s=>s.id===testStudent.id).archived=true;managementBackup.data.rewards.find(r=>r.id===custom.id).available=false;const currentRestorePath=path.join(proof,'management-restore.json');fs.writeFileSync(currentRestorePath,JSON.stringify(managementBackup));await page.locator('#restoreBackup').click();await page.locator('#restoreFile').setInputFiles(currentRestorePath);await page.locator('#confirmRestore').click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('restored'));saved=await state(page);assert(saved.students.find(s=>s.id===testStudent.id).archived&&saved.rewards.find(r=>r.id===custom.id).available===false,'Current backup restore lost archive or reward visibility');

  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1'));data.rewards.forEach(r=>r.available=false);localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))});await page.reload({waitUntil:'networkidle'});await nav(page,'rewards');assert(await page.getByText('No rewards available',{exact:true}).isVisible()&&!await page.locator('#redeem').isEnabled(),'All-hidden reward state is unsafe or unclear');
  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('derby-character-cash-v1'));for(const r of data.rewards){delete r.id;delete r.order;delete r.available}delete data.students[0].archived;localStorage.setItem('derby-character-cash-v1',JSON.stringify(data))});await page.reload({waitUntil:'networkidle'});saved=await state(page);assert(saved.rewards.every(r=>r.id&&Number.isInteger(r.order)&&r.available===true)&&saved.students[0].archived===false,'Older roster/reward data did not migrate safely');assert(new Set(saved.rewards.map(r=>r.id)).size===saved.rewards.length,'Reward migration created duplicate IDs');
  const invalidPath=path.join(proof,'invalid-backup.json');fs.writeFileSync(invalidPath,'{"format":"wrong"}');const beforeInvalid=JSON.stringify(await state(page));await nav(page,'settings');await page.locator('#restoreBackup').click();await page.locator('#restoreFile').setInputFiles(invalidPath);await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('Invalid backup'));assert(JSON.stringify(await state(page))===beforeInvalid,'Invalid backup altered current data');

  await page.setViewportSize({width:390,height:844});await nav(page,'class');
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cards:[...document.querySelectorAll('.student')].map(x=>x.getBoundingClientRect().width)}));
  assert(!mobile.overflow&&mobile.cards.every(w=>w>250),'Narrow layout is unusable');
  await page.screenshot({path:path.join(proof,'instrument-cards-phone.png'),fullPage:true});
  await nav(page,'settings');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),'Settings has horizontal overflow on phone');await page.locator('#manageRewards').click();assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),'Reward management has horizontal overflow on phone');await page.waitForTimeout(4500);await page.screenshot({path:path.join(proof,'reward-management-phone.png'),fullPage:true});

  assert(errors.length===0,'Console errors: '+errors.join(' | '));
  assert(failed.length===0,'Failed requests: '+failed.join(' | '));
  [backupPath,restorePath,managementPath,currentRestorePath,invalidPath].forEach(file=>fs.rmSync(file,{force:true}));
  await browser.close();server.close();
  console.log(JSON.stringify({ok:true,instruments:16,cards:24,pointTotals:[0,9,25,100,999,1250,-5],consoleErrors:errors.length,failedRequests:failed.length}));
})().catch(async error=>{console.error(error);server.close();process.exitCode=1});
