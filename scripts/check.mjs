import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const DIST=path.join(ROOT,'dist');
const errors=[];
async function walk(dir){
 const out=[];
 for(const ent of await readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,ent.name);
  if(ent.isDirectory())out.push(...await walk(p)); else out.push(p);
 }
 return out;
}
const files=await walk(DIST);
const html=files.filter(f=>f.endsWith('.html'));
const rel=f=>path.relative(DIST,f).split(path.sep).join('/');
const text={};
for(const f of html)text[rel(f)]=await readFile(f,'utf8');
const expected=['index.html','pt-br/index.html','fr/index.html','en/index.html'];
for(const f of expected)if(!text[f])errors.push(`Missing locale home: ${f}`);
const collections=['research/water/','research/stones/','research/vegetation/','archive/mav-2018/','archive/educamais-2017/'];
const prefixes=['','pt-br/','fr/','en/'];
for(const prefix of prefixes)for(const route of collections){
 const f=prefix+route+'index.html'; if(!text[f])errors.push(`Missing localized gallery: ${f}`);
}
for(const [f,body] of Object.entries(text)){
 if(/<script(?![^>]+src=)/i.test(body))errors.push(`Inline script: ${f}`);
 if(/\sstyle=/i.test(body))errors.push(`Inline style: ${f}`);
 if(!body.includes('Content-Security-Policy'))errors.push(`Missing CSP: ${f}`);
 if(!body.includes('data-locale-link'))errors.push(`Missing locale links: ${f}`);
 if(/36 meses|36 months|36 mois/i.test(body))errors.push(`Obsolete 36-month wording: ${f}`);
 const srcs=[...body.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('//'));
 for(const src of srcs){
  const clean=src.split('#')[0].split('?')[0]; if(!clean||clean.endsWith('/'))continue;
  const target=path.join(DIST,decodeURIComponent(clean.slice(1)));
  try{await stat(target);}catch{if(!clean.endsWith('.html'))errors.push(`Missing asset ${clean} from ${f}`);}
 }
}
const counts={'research/water/':30,'research/stones/':29,'research/vegetation/':19,'archive/mav-2018/':13,'archive/educamais-2017/':41};
for(const prefix of prefixes)for(const [route,count] of Object.entries(counts)){
 const body=text[prefix+route+'index.html']||'';
 const actual=(body.match(/<figure id="image-/g)||[]).length;
 if(actual!==count)errors.push(`Gallery count ${prefix+route}: ${actual} != ${count}`);
}
for(const f of expected){
 const body=text[f]||'';
 if((body.match(/class="atlas-card"/g)||[]).length!==8)errors.push(`Atlas count failed: ${f}`);
 if(!body.includes('Vale do Pati'))errors.push(`Pati missing: ${f}`);
 if(!body.includes('EducaMais Jacareí'))errors.push(`EducaMais missing: ${f}`);
 if(!body.includes('MAV'))errors.push(`MAV missing: ${f}`);
}
if(!text['en/index.html']?.includes('5 years'))errors.push('English 5-year wording missing.');
if(!text['pt-br/index.html']?.includes('5 anos'))errors.push('Portuguese 5-year wording missing.');
if(!text['fr/index.html']?.includes('5 ans'))errors.push('French 5-year wording missing.');
if(!text['index.html']?.includes('5 años'))errors.push('Spanish 5-year wording missing.');
if(errors.length){console.error('CHECK_FAIL\n'+errors.join('\n'));process.exitCode=1;}else console.log('CHECK_OK',JSON.stringify({html:html.length,galleries:20,atlasEntries:8,fieldImages:78,archiveImages:54}));
