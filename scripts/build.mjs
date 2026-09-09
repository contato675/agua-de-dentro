import {readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LOCALES,LOCALE_CONFIG,localized as l,localePath} from './i18n.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const CONTENT=path.join(ROOT,'content');
const DIST=path.join(ROOT,'dist');
const e=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const local=(locale,rel='')=>'/' + localePath(locale) + rel;
const absolute=(site,locale,rel='')=>site.origin+local(locale,rel);

async function load(){
 const site=await readJson(path.join(CONTENT,'site.json'));
 const project=await readJson(path.join(CONTENT,'project.json'));
 const collections=await readJson(path.join(CONTENT,'collections.json'));
 const atlas=await readJson(path.join(CONTENT,'atlas.json'));
 const deliveries=await readJson(path.join(CONTENT,'deliveries.json'));
 const process=await readJson(path.join(CONTENT,'process.json'));
 const media=await readJson(path.join(ROOT,'media-manifest.json'));
 const dictionaries={};
 for(const loc of LOCALES)dictionaries[loc]=await readJson(path.join(CONTENT,'locales',loc+'.json'));
 return {site,project,collections,atlas,deliveries,process,media,dictionaries};
}
function validate(data){
 const errors=[];
 if(JSON.stringify(data.site.locales)!==JSON.stringify(LOCALES))errors.push('Locale contract must be en, pt-BR, fr, es.');
 if(data.site.defaultLocale!=='es')errors.push('Spanish must remain the canonical entry.');
 const keys=Object.keys(data.dictionaries.en).sort().join('|');
 for(const loc of LOCALES){
  const d=data.dictionaries[loc];
  if(Object.keys(d).sort().join('|')!==keys)errors.push(`UI key parity failed: ${loc}`);
  for(const [k,v] of Object.entries(d))if(typeof v!=='string'||!v.trim())errors.push(`Empty UI translation: ${loc}.${k}`);
 }
 const walk=(value,label)=>{
  if(!value||typeof value!=='object')return;
  const ks=Object.keys(value);
  if(LOCALES.every(loc=>ks.includes(loc))){
   for(const loc of LOCALES)if(typeof value[loc]!=='string'||!value[loc].trim())errors.push(`Missing ${label}.${loc}`);
   return;
  }
  for(const [k,v] of Object.entries(value))walk(v,`${label}.${k}`);
 };
 walk(data.project,'project');
 data.collections.forEach((x,i)=>walk(x,`collections.${i}`));
 data.atlas.forEach((x,i)=>walk(x,`atlas.${i}`));
 data.deliveries.forEach((x,i)=>walk(x,`deliveries.${i}`));
 data.process.forEach((x,i)=>walk(x,`process.${i}`));
 if(errors.length)throw new Error(errors.join('\n'));
}

function imageById(data,id){
 for(const rows of Object.values(data.media.field))for(const row of rows)if(row.id===id)return row;
 throw new Error(`Unknown image id: ${id}`);
}
function collectionImages(data,c){
 return c.type==='field' ? data.media.field[c.mediaKey] : data.media.exhibitions[c.mediaKey];
}
function altFor(data,locale,c,index){
 const u=data.dictionaries[locale], title=l(c.title,locale);
 return c.type==='archive' ? `${title} — ${u.archivePhoto} ${String(index+1).padStart(2,'0')}.` : `${title} — ${u.record} ${String(index+1).padStart(2,'0')}.`;
}
const publicAsset=row=>row.path.startsWith('assets/')?'/'+row.path:'/assets/'+row.path;
function picture(data,locale,row,alt,eager=false){
 return `<img src="${e(publicAsset(row))}" alt="${e(alt)}" width="${row.width}" height="${row.height}" loading="${eager?'eager':'lazy'}" decoding="async" draggable="false"${eager?' fetchpriority="high"':''}>`;
}
function localeRoute(locale,route=''){return local(locale,route);}
function localeNav(data,locale,route=''){
 const u=data.dictionaries[locale];
 return `<nav class="locale-nav" aria-label="${e(u.language)}">${LOCALES.map(loc=>`<a class="control" data-locale-link href="${e(localeRoute(loc,route))}" lang="${e(loc)}" hreflang="${e(loc)}"${loc===locale?' aria-current="page"':''}>${e(data.dictionaries[loc].localeName)}</a>`).join('')}</nav>`;
}
function mainLinks(data,locale){
 const u=data.dictionaries[locale], base=local(locale);
 const links=[['project',u.project],['research',u.research],['routes',u.routes],['atlas-color',u.atlas],['paintings',u.paintings],['film',u.film],['school',u.school]];
 return links.map(([id,label])=>`<a class="control" href="${e(base+'#'+id)}">${e(label)}</a>`).join('');
}
function header(data,locale,route=''){
 const u=data.dictionaries[locale], links=mainLinks(data,locale), locales=localeNav(data,locale,route);
 return `<header class="site-header"><div class="wrap header-inner"><div class="desktop-navigation"><nav class="main-nav" aria-label="${e(u.mainNav)}">${links}</nav><details class="language-picker" data-language-picker><summary class="control language-picker-trigger"><span class="sr-only">${e(u.language)}: </span><span>${e(u.localeName)}</span><span class="language-chevron" aria-hidden="true"></span></summary><div class="language-picker-panel">${locales}</div></details></div><details class="mobile-fallback" data-mobile-fallback><summary class="control">${e(u.menu)}</summary><div class="fallback-links"><nav class="main-nav" aria-label="${e(u.mainNav)}">${links}</nav>${locales}</div></details><button class="menu-toggle" type="button" data-menu-open hidden aria-controls="mobile-navigation" aria-haspopup="dialog" aria-expanded="false" aria-label="${e(u.menu)}"><span>${e(u.menu)}</span><span class="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span></button></div></header>`;
}
function drawer(data,locale,route=''){
 const u=data.dictionaries[locale], links=mainLinks(data,locale), locales=localeNav(data,locale,route);
 return `<dialog id="mobile-navigation" class="nav-drawer" data-navigation aria-labelledby="navigation-title"><div class="nav-drawer-inner"><div class="drawer-heading"><h2 id="navigation-title">${e(u.navigation)}</h2><button type="button" data-menu-close aria-label="${e(u.closeMenu)}"><span aria-hidden="true">×</span></button></div><nav class="main-nav" aria-label="${e(u.mainNav)}">${links}</nav><div class="drawer-languages"><p class="eyebrow">${e(u.language)}</p>${locales}</div></div></dialog>`;
}
function footer(data,locale){
 const u=data.dictionaries[locale];
 return `<footer><div class="wrap"><div class="footer-links"><a class="control" href="https://renataalberigi.com.br/${locale==='en'?'':locale==='pt-BR'?'pt-br/':locale+'/'}">${e(u.mainPortfolio)} ↗</a><a class="control" href="https://axl.sssom.com/">${e(u.axlSite)} ↗</a></div><p class="meta">${e(u.rights)}</p></div></footer>`;
}
function alternates(data,route=''){
 return LOCALES.map(loc=>`<link rel="alternate" hreflang="${e(loc)}" href="${e(absolute(data.site,loc,route))}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${e(absolute(data.site,'es',route))}">`;
}
function document(data,locale,route,title,description,main){
 const u=data.dictionaries[locale], canonical=absolute(data.site,locale,route);
 return `<!doctype html><html lang="${e(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="${e(data.site.robots)}"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="${e(LOCALE_CONFIG[locale].og)}"><link rel="canonical" href="${e(canonical)}">${alternates(data,route)}<link rel="stylesheet" href="/assets/css/tokens.css"><link rel="stylesheet" href="/assets/css/scaffold.css"><link rel="stylesheet" href="/assets/css/gallery.css"><link rel="stylesheet" href="/assets/css/navigation.css"><link rel="stylesheet" href="/assets/css/brand.css"><link rel="stylesheet" href="/assets/css/project.css"><link rel="stylesheet" href="/assets/css/atlas-colors.css"><script src="/assets/js/locale-navigation.js" defer></script><script src="/assets/js/navigation.js" defer></script><script src="/assets/js/language-picker.js" defer></script></head><body><a class="skip" href="#content">${e(u.skip)}</a>${header(data,locale,route)}${drawer(data,locale,route)}<main id="content" class="wrap">${main}</main>${footer(data,locale)}</body></html>`;
}
const processLabels={
 en:['Field photograph','Sketchbook study','Painting'],
 'pt-BR':['Fotografia de campo','Estudo no sketchbook','Pintura'],
 fr:['Photographie de terrain','Étude dans le carnet','Peinture'],
 es:['Fotografía de campo','Estudio en cuaderno','Pintura']
};
function processStrip(data,locale){
 const labels=processLabels[locale];
 return data.process.map(item=>{
  const media=data.media.processSeries.find(x=>x.id===item.id);
  if(!media)throw new Error(`Missing process media: ${item.id}`);
  const keys=['field','sketch','painting'];
  return `<div class="process-series"><div class="project-subheading"><h3>${e(l(item.title,locale))}</h3><p class="project-note">${e(l(item.meta,locale))}</p></div><div class="grid process-strip">${keys.map((key,i)=>`<figure class="process-step">${picture(data,locale,media[key],`${labels[i]} — ${l(item.title,locale)}.`)}<figcaption class="caption"><h3>${i+1} · ${e(labels[i])}</h3></figcaption></figure>`).join('')}</div></div>`;
 }).join('');
}
function collectionCard(data,locale,c){
 const rows=collectionImages(data,c), cover=rows[Math.min(c.cover,rows.length-1)], u=data.dictionaries[locale];
 return `<li class="project"><a href="${e(local(locale,c.route))}" aria-labelledby="card-${e(c.id)}"><figure>${picture(data,locale,cover,altFor(data,locale,c,c.cover))}<figcaption class="caption"><h3 id="card-${e(c.id)}">${e(l(c.title,locale))}</h3><p>${e(l(c.description,locale))}</p><span class="project-number">${rows.length} ${e(u.images)}</span></figcaption></figure></a></li>`;
}
const colorClass=color=>'c-'+color.slice(1).toLowerCase();
function atlasCards(data,locale){
 const u=data.dictionaries[locale];
 return `<div class="gallery grid">${data.atlas.map(entry=>{
  const row=imageById(data,entry.imageId), title=l(entry.title,locale);
  return `<article class="atlas-card">${picture(data,locale,row,`${title} — ${u.colorStudy}.`)}<div class="caption"><h3>${e(title)}</h3><div class="swatches" aria-label="${e(u.colorStudy)}">${entry.colors.map(color=>`<span class="swatch ${colorClass(color)}" title="${e(color)}"></span>`).join('')}</div><div class="swatch-labels" aria-hidden="true">${entry.colors.map(color=>`<span>${e(color)}</span>`).join('')}</div><p class="meta">${e(data.project.location[locale])}</p></div></article>`;
 }).join('')}</div>`;
}
const soundGroups={
 en:[['Water','current · waterfall · bank'],['Path','steps · rock · crossing'],['Environment','wind · vegetation · relative silence'],['Local life','birds · animals · authorised activities']],
 'pt-BR':[['Água','correnteza · cachoeira · margem'],['Caminho','passos · pedra · travessia'],['Ambiente','vento · vegetação · silêncio relativo'],['Vida local','aves · animais · atividades autorizadas']],
 fr:[['Eau','courant · cascade · rive'],['Chemin','pas · pierre · traversée'],['Ambiance','vent · végétation · silence relatif'],['Vie locale','oiseaux · animaux · activités autorisées']],
 es:[['Agua','corriente · cascada · margen'],['Camino','pasos · piedra · travesía'],['Ambiente','viento · vegetación · silencio relativo'],['Vida local','aves · animales · actividades autorizadas']]
};
function soundCards(data,locale){
 const u=data.dictionaries[locale];
 return `<div class="grid">${soundGroups[locale].map(([a,b])=>`<article class="sound-card"><p class="eyebrow">${e(a)}</p><h3>${e(b)}</h3><p class="meta">${e(u.soundComing)}</p></article>`).join('')}</div>`;
}
const routeCopy={
 en:[['Caeté-Açu','Recurring fieldwork','Water, vegetation, rocks, memory, conversations and repeated return to the studio.'],['Vale do Pati','Seven-day immersion','Walking, permanence, water, agriculture, housing, work, hospitality and soundscape.'],['Mucugê / Igatu','Historical field axis','Mining histories, stone construction, water, archives, memory and contemporary life.']],
 'pt-BR':[['Caeté-Açu','Campo recorrente','Água, vegetação, pedras, memória, conversas e retorno continuado ao ateliê.'],['Vale do Pati','Imersão de sete dias','Caminhada, permanência, água, agricultura, moradia, trabalho, hospitalidade e paisagem sonora.'],['Mucugê / Igatu','Eixo histórico de campo','Histórias do garimpo, pedra construída, água, arquivos, memória e vida contemporânea.']],
 fr:[['Caeté-Açu','Terrain récurrent','Eau, végétation, roches, mémoire, conversations et retours réguliers à l’atelier.'],['Vale do Pati','Immersion de sept jours','Marche, séjour, eau, agriculture, habitat, travail, hospitalité et paysage sonore.'],['Mucugê / Igatu','Axe historique de terrain','Histoires du garimpo, constructions en pierre, eau, archives, mémoire et vie contemporaine.']],
 es:[['Caeté-Açu','Campo recurrente','Agua, vegetación, piedras, memoria, conversaciones y retorno continuado al taller.'],['Vale do Pati','Inmersión de siete días','Caminata, permanencia, agua, agricultura, vivienda, trabajo, hospitalidad y paisaje sonoro.'],['Mucugê / Igatu','Eje histórico de campo','Historias del garimpo, piedra construida, agua, archivos, memoria y vida contemporánea.']]
};
function routeCards(data,locale){
 const u=data.dictionaries[locale], images=[imageById(data,'water-05'),data.media.routes.pati,data.media.routes.igatu];
 const credits=['Renata / Axel · Caeté-Açu','Jardelsliumba, 2015 · CC BY-SA 3.0 · Wikimedia Commons','Adelano Lázaro, 2009 · public domain · Wikimedia Commons'];
 return `<div class="grid">${routeCopy[locale].map(([name,label,body],i)=>`<article class="route-card">${picture(data,locale,images[i],`${u.referenceImage}: ${name}.`)}<p class="eyebrow">${e(label)}</p><h3>${e(name)}</h3><p>${e(body)}</p><p class="meta">${e(credits[i])}</p></article>`).join('')}</div>`;
}
function proposedWorks(data,locale){
 const u=data.dictionaries[locale], word=locale==='en'?'Work':locale==='fr'?'Œuvre':'Obra';
 return `<ol class="future-grid grid">${Array.from({length:8},(_,i)=>`<li><p class="eyebrow">${e(u.proposal)}</p><h3>${e(word)} ${String(i+1).padStart(2,'0')}</h3><p class="meta">100 × 80 cm</p></li>`).join('')}</ol>`;
}
function sectionStart(id,number,label,title,body=''){
 return `<section id="${e(id)}" aria-labelledby="${e(id)}-title"><div class="section-heading"><p class="eyebrow">${e(number)} / ${e(label)}</p><h2 id="${e(id)}-title">${e(title)}</h2>${body?`<p class="collection-intro">${e(body)}</p>`:''}</div>`;
}
function deliveries(data,locale){
 return `<ul class="future-grid grid">${data.deliveries.map(item=>`<li><p class="eyebrow">${e(l(item.label,locale))}</p><p>${e(l(item.body,locale))}</p></li>`).join('')}</ul>`;
}
function references(locale){
 const title=locale==='en'?'Historical research and sources':locale==='pt-BR'?'Pesquisa histórica e fontes':locale==='fr'?'Recherche historique et sources':'Investigación histórica y fuentes';
 const items=locale==='en'?[['Theodoro Sampaio · 1905','Travel, drawing, landscape and cartography.'],['Maria Cristina Dantas Pina · 2001','Slavery, work and trajectories in Mucugê.'],['Vale do Pati research · 2022/2025','Territory, agriculture, housing and tourism.'],['IPHAN · Igatu','Historical ensemble, ruins and mining.'],['ICMBio · Chapada Diamantina National Park','Environmental context, including Atlantic Forest, Cerrado and Caatinga.']]:locale==='pt-BR'?[['Theodoro Sampaio · 1905','Viagem, desenho, paisagem e cartografia.'],['Maria Cristina Dantas Pina · 2001','Escravidão, trabalho e trajetórias em Mucugê.'],['Pesquisas sobre o Vale do Pati · 2022/2025','Território, agricultura, moradia e turismo.'],['IPHAN · Igatu','Conjunto histórico, ruínas e mineração.'],['ICMBio · Parque Nacional da Chapada Diamantina','Contexto ambiental, incluindo Mata Atlântica, Cerrado e Caatinga.']]:locale==='fr'?[['Theodoro Sampaio · 1905','Voyage, dessin, paysage et cartographie.'],['Maria Cristina Dantas Pina · 2001','Esclavage, travail et trajectoires à Mucugê.'],['Recherches sur la Vale do Pati · 2022/2025','Territoire, agriculture, habitat et tourisme.'],['IPHAN · Igatu','Ensemble historique, ruines et exploitation minière.'],['ICMBio · Parc national de la Chapada Diamantina','Contexte environnemental, notamment forêt atlantique, Cerrado et Caatinga.']]:[['Theodoro Sampaio · 1905','Viaje, dibujo, paisaje y cartografía.'],['Maria Cristina Dantas Pina · 2001','Esclavitud, trabajo y trayectorias en Mucugê.'],['Investigaciones sobre el Vale do Pati · 2022/2025','Territorio, agricultura, vivienda y turismo.'],['IPHAN · Igatu','Conjunto histórico, ruinas y minería.'],['ICMBio · Parque Nacional de la Chapada Diamantina','Contexto ambiental, incluyendo Mata Atlántica, Cerrado y Caatinga.']];
 return `<div class="project-subheading"><h3>${e(title)}</h3></div><ul class="source-list">${items.map(([a,b])=>`<li><strong>${e(a)}</strong> — ${e(b)}</li>`).join('')}</ul>`;
}
function homeMain(data,locale){
 const p=data.project,u=data.dictionaries[locale], fieldCollections=data.collections.filter(c=>c.type==='field'), archives=data.collections.filter(c=>c.type==='archive');
 const hero=`<section class="grid hero" aria-labelledby="name"><div class="hero-copy"><p class="eyebrow">${e(l(p.role,locale))}</p><h1 id="name">${e(l(p.title,locale))}</h1><p class="intro">${e(l(p.intro,locale))}</p><p class="meta">${e(l(p.location,locale))}</p><div class="hero-actions"><a class="control primary" href="#research">${e(u.research)} <span aria-hidden="true">↓</span></a><a class="control" href="#routes">${e(u.routes)}</a></div></div><figure class="project-hero-media">${picture(data,locale,data.media.processSeries[0].field,`${l(p.title,locale)} — ${u.record}.`,true)}</figure></section>`;
 const project=sectionStart('project','01',u.project,l(p.sections.project.title,locale),l(p.sections.project.body,locale))+`<div class="grid"><div class="section-title"><h3>${e(locale==='en'?'Central question':locale==='pt-BR'?'Pergunta central':locale==='fr'?'Question centrale':'Pregunta central')}</h3></div><div class="section-content"><p class="intro">${e(l(p.question,locale))}</p></div></div><div class="project-subheading"><h3>${e(locale==='en'?'Deliveries and public structure':locale==='pt-BR'?'Entregas e estrutura pública':locale==='fr'?'Livrables et structure publique':'Entregas y estructura pública')}</h3></div>${deliveries(data,locale)}</section>`;
 const research=sectionStart('research','02',u.research,l(p.sections.research.title,locale),l(p.sections.research.body,locale))+processStrip(data,locale)+`<div class="project-subheading"><h3>${e(locale==='en'?'Field galleries':locale==='pt-BR'?'Galerias de campo':locale==='fr'?'Galeries de terrain':'Galerías de campo')}</h3></div><ul class="gallery grid">${fieldCollections.map(c=>collectionCard(data,locale,c)).join('')}</ul></section>`;
 const color=sectionStart('atlas-color','03',u.atlasColor,l(p.sections.atlasColor.title,locale),l(p.sections.atlasColor.body,locale))+atlasCards(data,locale)+`</section>`;
 const sound=sectionStart('atlas-sound','04',u.atlasSound,l(p.sections.atlasSound.title,locale),l(p.sections.atlasSound.body,locale))+soundCards(data,locale)+`</section>`;
 const routes=sectionStart('routes','05',u.routes,l(p.sections.routes.title,locale),l(p.sections.routes.body,locale))+routeCards(data,locale)+references(locale)+`</section>`;
 const paints=sectionStart('paintings','06',u.paintings,l(p.sections.paintings.title,locale),l(p.sections.paintings.body,locale))+proposedWorks(data,locale)+`</section>`;
 const film=sectionStart('film','07',u.film,l(p.sections.film.title,locale),l(p.sections.film.body,locale))+`<div class="placeholder video-slot"><p>${e(locale==='en'?'The film will be produced from the field research and studio process. No placeholder footage is used on this proposal website.':locale==='pt-BR'?'O filme será produzido a partir da pesquisa de campo e do processo no ateliê. O site da proposta não usa imagens de vídeo fictícias.':locale==='fr'?'Le film sera produit à partir de la recherche de terrain et du processus en atelier. Le site de proposition n’utilise aucune séquence vidéo fictive.':'La película se producirá a partir de la investigación de campo y el proceso en el taller. El sitio de la propuesta no utiliza imágenes de video ficticias.')}</p></div></section>`;
 const school=sectionStart('school','08',u.school,l(p.sections.school.title,locale),l(p.sections.school.body,locale))+`<div class="project-subheading"><h3>${e(l(p.sections.exhibitions.title,locale))}</h3><p class="project-note">${e(l(p.sections.exhibitions.body,locale))}</p></div><ul class="gallery grid">${archives.map(c=>collectionCard(data,locale,c)).join('')}</ul></section>`;
 const team=sectionStart('team','09',u.team,l(p.sections.team.title,locale))+`<div class="grid project-team"><article><p class="eyebrow">Renata Alberigi</p><p>${e(l(p.sections.team.renata,locale))}</p><a class="control" href="https://renataalberigi.com.br/${locale==='en'?'':locale==='pt-BR'?'pt-br/':locale+'/'}">${e(u.mainPortfolio)} ↗</a></article><article><p class="eyebrow">Axel Alberigi · A.X.L.</p><p>${e(l(p.sections.team.axel,locale))}</p><a class="control" href="https://axl.sssom.com/">${e(u.axlSite)} ↗</a></article><article><p class="eyebrow">${e(locale==='en'?'Local guides':locale==='pt-BR'?'Guias e condutores locais':locale==='fr'?'Guides locaux':'Guías locales')}</p><p>${e(l(p.sections.team.guides,locale))}</p></article></div></section>`;
 return hero+project+research+color+sound+routes+paints+film+school+team;
}
function galleryMain(data,locale,c){
 const u=data.dictionaries[locale], rows=collectionImages(data,c);
 const label=c.type==='archive'?u.archive:u.field;
 return `<article class="work-heading"><a class="control" href="${e(local(locale))}#${c.type==='archive'?'school':'research'}">← ${e(u.backHome)}</a><p class="eyebrow">${e(label)}</p><h1>${e(l(c.title,locale))}</h1><p class="intro">${e(l(c.description,locale))}</p><p class="meta">${rows.length} ${e(u.images)}</p></article><div class="brand-full-gallery">${rows.map((row,i)=>`<figure id="image-${i+1}">${picture(data,locale,row,altFor(data,locale,c,i),i===0)}<figcaption>${e(c.type==='archive'?u.archivePhoto:u.record)} ${String(i+1).padStart(2,'0')}</figcaption></figure>`).join('')}</div>`;
}
function homeMarkdown(data,locale){
 const p=data.project,u=data.dictionaries[locale];
 const lines=[`# ${l(p.title,locale)}`,l(p.intro,locale),'',`## ${l(p.sections.project.title,locale)}`,l(p.sections.project.body,locale),'',`**${locale==='en'?'Central question':locale==='pt-BR'?'Pergunta central':locale==='fr'?'Question centrale':'Pregunta central'}:** ${l(p.question,locale)}`,'',`## ${l(p.sections.research.title,locale)}`,l(p.sections.research.body,locale)];
 for(const c of data.collections)lines.push(`- [${l(c.title,locale)}](${absolute(data.site,locale,c.route)})`);
 lines.push('',`## ${l(p.sections.atlasColor.title,locale)}`,l(p.sections.atlasColor.body,locale),'',`## ${l(p.sections.atlasSound.title,locale)}`,l(p.sections.atlasSound.body,locale),'',`## ${l(p.sections.routes.title,locale)}`,l(p.sections.routes.body,locale),'',`## ${l(p.sections.paintings.title,locale)}`,l(p.sections.paintings.body,locale),'',`## ${l(p.sections.film.title,locale)}`,l(p.sections.film.body,locale),'',`## ${l(p.sections.school.title,locale)}`,l(p.sections.school.body,locale));
 return lines.join('\n')+'\n';
}
function galleryMarkdown(data,locale,c){
 const rows=collectionImages(data,c), u=data.dictionaries[locale];
 return [`# ${l(c.title,locale)}`,l(c.description,locale),'',...rows.map((row,i)=>`![${altFor(data,locale,c,i)}](${data.site.origin}${publicAsset(row)})`),'',`[${u.backHome}](${absolute(data.site,locale)})`].join('\n\n')+'\n';
}
function structured(data,locale){
 return {
  '@context':'https://schema.org','@type':'CreativeWork',name:l(data.project.title,locale),description:l(data.project.intro,locale),url:absolute(data.site,locale),
  creator:{'@type':'Person',name:'Renata Alberigi',url:'https://renataalberigi.com.br/'},
  spatialCoverage:'Chapada Diamantina, Bahia, Brazil',inLanguage:locale,
  hasPart:data.collections.map(c=>({'@type':'CollectionPage',name:l(c.title,locale),url:absolute(data.site,locale,c.route)}))
 };
}
function atlasCss(data){
 const colors=[...new Set(data.atlas.flatMap(x=>x.colors))];
 return colors.map(color=>`.swatch.${colorClass(color)}{background:${color};}`).join('\n')+'\n';
}
async function write(rel,content){
 const file=path.join(DIST,rel); await mkdir(path.dirname(file),{recursive:true}); await writeFile(file,content);
}
async function build(){
 const data=await load(); validate(data); await rm(DIST,{recursive:true,force:true}); await mkdir(DIST,{recursive:true});
 await cp(path.join(ROOT,'assets'),path.join(DIST,'assets'),{recursive:true});
 await write('assets/css/atlas-colors.css',atlasCss(data));
 for(const locale of LOCALES){
  const title=`${l(data.project.title,locale)} — ${l(data.project.subtitle,locale)}`;
  await write(localePath(locale)+'index.html',document(data,locale,'',title,l(data.project.intro,locale),homeMain(data,locale)));
  await write(localePath(locale)+'index.md',homeMarkdown(data,locale));
  await write(localePath(locale)+'project.json',JSON.stringify(structured(data,locale),null,2)+'\n');
  for(const c of data.collections){
   const route=c.route;
   await write(localePath(locale)+route+'index.html',document(data,locale,route,`${l(c.title,locale)} — ${l(data.project.title,locale)}`,l(c.description,locale),galleryMain(data,locale,c)));
   await write(localePath(locale)+route+'index.md',galleryMarkdown(data,locale,c));
  }
 }
 await write('CNAME',data.site.customDomain+'\n');
 await write('.nojekyll','');
 await write('robots.txt','User-agent: *\nAllow: /\n');
 const llms=['# Água de Dentro','',l(data.project.intro,'es'),'','## Languages',...LOCALES.map(loc=>`- ${data.dictionaries[loc].localeName}: ${absolute(data.site,loc)}`),'','## Research galleries',...data.collections.map(c=>`- ${l(c.title,'en')}: ${absolute(data.site,'en',c.route)}`)];
 await write('llms.txt',llms.join('\n')+'\n');
 const urls=[]; for(const loc of LOCALES){urls.push(absolute(data.site,loc)); for(const c of data.collections)urls.push(absolute(data.site,loc,c.route));}
 await write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>`  <url><loc>${e(url)}</loc></url>`).join('\n')+'\n</urlset>\n');
 const notFound=`<section><h1>Página no encontrada</h1><p>Esta ruta no forma parte de Água de Dentro.</p><a class="control" href="/">Volver al proyecto</a></section>`;
 await write('404.html',document(data,'es','404.html','Página no encontrada — Água de Dentro','Página no encontrada',notFound));
 console.log('BUILD_OK',JSON.stringify({locales:LOCALES,collections:data.collections.length,fieldImages:Object.values(data.media.field).flat().length,archiveImages:Object.values(data.media.exhibitions).flat().length,atlas:data.atlas.length}));
}

build().catch(error=>{console.error('BUILD_FAIL',error.stack||error.message);process.exitCode=1;});
