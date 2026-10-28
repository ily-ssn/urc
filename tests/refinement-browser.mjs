import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=5206,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;
try {
 for(let n=0;n<60;n++){try{if((await fetch(base)).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const p=await context.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:1000});
  for(const route of ['/events','/gallery','/club','/partners','/shop','/events/reset','/first-run']){
   await p.goto(base+route);await p.locator('.shared-masthead').waitFor();
   const band=await p.locator('.runs-diagonal').evaluate(el=>({transform:getComputedStyle(el).transform,clip:getComputedStyle(el).clipPath,b:el.getBoundingClientRect().toJSON()}));
   assert.equal(band.transform,'none');assert.match(band.clip,/polygon/);assert.ok(band.b.width>=width-1);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await p.goto(base+'/club');await p.locator('.photo-row-dark').waitFor();
  assert.equal(await p.locator('.footer').evaluate(el=>getComputedStyle(el).marginTop),'0px');
  await p.locator('.photo-row-reverse').evaluate(el=>scrollTo(0,el.offsetTop-25));
  await p.waitForFunction(()=>document.querySelector('.wordmark-link').dataset.tone==='dark');
  await p.getByLabel('Navigation menu').click();
  assert.equal(await p.locator('.site-menu-panel a[href="/first-run"],.site-menu-panel a[href="/impact"]').count(),0);
  await p.waitForFunction(()=>document.querySelector('#main').inert);
  assert.match(await p.locator('#main').evaluate(el=>getComputedStyle(el).filter),/blur/);
  await p.keyboard.press('Escape');
  await p.waitForFunction(()=>!document.querySelector('#main').inert);
  assert.equal(await p.evaluate(()=>document.activeElement.id),'open-site-menu');
  await p.goto(base+'/first-run');await p.locator('.first-run-photo-cards article').first().waitFor();assert.equal(await p.locator('.first-run-photo-cards a').count(),0);
 }
 await p.setViewportSize({width:1440,height:1000});
 await p.goto(base+'/');await p.locator('.home-event-copy h1').waitFor();
 assert.equal(await p.locator('.home-event-copy h1').innerText(),'THE RESET');
 assert.match(await p.locator('.home-event-date').innerText(),/31 October 2026/);
 await p.evaluate(()=>scrollTo(0,400));await p.waitForTimeout(150);
 assert.ok(Number(await p.locator('.home-event-overlay').evaluate(el=>getComputedStyle(el).opacity))<.6);
 await p.goto(base+'/gallery');await p.locator('.gallery-official').waitFor();
 assert.equal(await p.getByRole('link',{name:'Browse the photos'}).getAttribute('href'),'https://drive.google.com/drive/folders/1gSvRyBC8tfaefQaFKjFlS5cx-83FpQWs?usp=drive_link');
 await p.goto(base+'/gallery/from-the-community');await p.locator('.gallery-grid').waitFor();
 assert.equal(await p.locator('.gallery-photo').count(),19);
 const imported=await p.locator('.gallery-photo img').evaluateAll(async images=>{
  await Promise.all(images.map(image=>{image.loading='eager';return image.decode();}));
  return images.every(image=>image.naturalWidth>0 && image.naturalHeight>0);
 });
 assert.ok(imported,'Existing and imported gallery photographs decode correctly');
 await p.goto(base+'/partners');await p.getByRole('heading',{name:'Luxenova Studios',exact:true}).waitFor();
 await p.goto(base+'/studio?preview=1');await p.getByRole('button',{name:'Edit homepage'}).click();
 await p.frameLocator('#visual-canvas').locator('.race-hero').waitFor();
 await p.getByRole('button',{name:'Phone',exact:true}).click();assert.equal(Math.round((await p.locator('#visual-canvas').boundingBox()).width),390);
 await p.locator('#back-list').click();await p.locator('#back-home').click();await p.locator('[data-section="event"]').click();await p.getByRole('button',{name:'Add a run'}).click();
 await p.getByLabel('Run title',{exact:true}).fill('Saturday Sauna');
 await p.getByLabel('Date and start time',{exact:true}).fill('2027-01-10T07:30');
 const arrival=p.locator('.editor-group').filter({has:p.locator('summary',{hasText:'Arrival and'})});await arrival.locator('summary').click();
 await p.getByLabel('Total distance',{exact:true}).fill('10 km');
 await p.getByLabel('Difficulty',{exact:true}).fill('Easy');
 await p.getByLabel('Elevation gain',{exact:true}).fill('72 m');
 await p.getByLabel('Intro headline',{exact:true}).fill('Run. Sauna. Breakfast.');
 await p.getByLabel('Run description',{exact:true}).fill('Meet at the club for a ten kilometre loop and breakfast afterward.');
 await p.frameLocator('#visual-canvas').getByRole('heading',{name:'Saturday Sauna',exact:true,level:1}).waitFor();
 await p.frameLocator('#visual-canvas').getByRole('heading',{name:'Run. Sauna. Breakfast.',exact:true}).waitFor();
 assert.match(await p.frameLocator('#visual-canvas').locator('.course-stat').first().innerText(),/10 km/);
 await p.getByRole('button',{name:'Save draft',exact:true}).click();await p.getByText('Kept in this preview only',{exact:true}).waitFor();
 await p.locator('#back-list').click();await p.getByRole('button',{name:/Saturday Sauna/}).click();assert.equal(await p.getByLabel('Difficulty',{exact:true}).inputValue(),'Easy');
 const motion=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});const m=await motion.newPage();
 await m.goto(base+'/');await m.locator('.urc-entrance').waitFor();await m.screenshot({path:'review/entrance-proof.png'});await m.getByRole('button',{name:'Skip intro',exact:true}).click();assert.equal(await m.locator('.urc-entrance').count(),0);
 // Even existing visitors with the old session flag see the entrance again.
 await m.evaluate(()=>sessionStorage.setItem('urc_entrance_v2','seen'));
 await m.reload();await m.locator('.entrance-full').waitFor();
 assert.equal(await m.locator('.entrance-portal > rect').getAttribute('fill'),'#181a19');
 const phases=await m.evaluate(async()=>{
  const frames=[];
  const capture=()=>({fills:[...document.querySelectorAll('.entrance-letter')].map(el=>getComputedStyle(el).fill),scale:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.entrance-cut')).transform).a,open:getComputedStyle(document.querySelector('.entrance-cut')).opacity});
  await new Promise(r=>setTimeout(r,1250));frames.push(capture());
  await new Promise(r=>setTimeout(r,800));frames.push(capture());
  await new Promise(r=>setTimeout(r,700));frames.push(capture());
  await new Promise(r=>setTimeout(r,550));frames.push(capture());
  return frames;
 });
 assert.ok(phases[0].fills.every(fill=>fill!=='rgba(0, 0, 0, 0)'),'Letters receive their colours before clearing');
 for(const phase of phases.slice(1,3)){
  assert.ok(phase.fills.every(fill=>fill==='rgba(0, 0, 0, 0)'),'Colours fully exit before the zoom');
  assert.equal(phase.open,'1');assert.equal(phase.scale,1,'Transparent lettering holds still during the pause');
 }
 assert.ok(phases[3].scale>1,'Zoom begins after the pause');
 await m.locator('.urc-entrance').waitFor({state:'detached'});
 await m.getByLabel('Navigation menu').click();
 await m.waitForFunction(()=>document.body.classList.contains('menu-is-open'));
 await m.waitForTimeout(80);
 const opening=await m.locator('#main').evaluate(el=>Number(getComputedStyle(el).filter.match(/[\d.]+/)[0]));
 assert.ok(opening>0 && opening<12,'Menu blur eases in instead of snapping');
 await m.waitForFunction(()=>getComputedStyle(document.querySelector('#main')).filter==='blur(12px)');
 await m.keyboard.press('Escape');await m.waitForFunction(()=>!document.body.classList.contains('menu-is-open'));
 await m.waitForTimeout(80);
 const closing=await m.locator('#main').evaluate(el=>Number(getComputedStyle(el).filter.match(/[\d.]+/)[0]));
 assert.ok(closing>0 && closing<12,'Menu blur eases out instead of snapping');
 await m.waitForFunction(()=>getComputedStyle(document.querySelector('#main')).filter==='blur(0px)');
 await m.getByLabel('Navigation menu').click();
 await m.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Gallery',exact:true}).click();
 await m.waitForURL(base+'/gallery');await m.locator('.entrance-quick').waitFor();
 await m.locator('.entrance-quick').waitFor({state:'detached',timeout:2200});
 await m.getByLabel('Navigation menu').click();
 await m.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'The club',exact:true}).click();
 await m.waitForURL(base+'/club');await m.locator('.entrance-quick').waitFor();
 await m.getByRole('button',{name:'Skip intro',exact:true}).click();
 await m.getByRole('link',{name:'URC home',exact:true}).click();await m.waitForURL(base+'/');
 await m.locator('.entrance-quick').waitFor();
 await m.getByRole('button',{name:'Skip intro',exact:true}).click();
 await m.reload();await m.locator('.urc-entrance').waitFor();
 await m.emulateMedia({reducedMotion:'reduce'});await m.locator('.urc-entrance').waitFor({state:'detached'});
 await m.reload();await m.locator('.home-event-copy').waitFor();assert.equal(await m.locator('.urc-entrance').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: 14 responsive mastheads, full diagonal bands, no horizontal overflow, footer seam removal, adaptive brand, blurred inert menu with Escape focus, non-clickable guide photos, hero event/fade, design partner, live run editor with saved fields, phone canvas, colour exit and pause before zoom, quick transitions through Gallery/Club/Home, smooth blur opening and closing, trimmed menu, refresh replay and reduced-motion support.');
}finally{await browser?.close();server.kill('SIGTERM');}
