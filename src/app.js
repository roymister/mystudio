/* ===== Tienda de sublimados · React 18 + htm (sin compilación) =====
   Todo el contenido (productos, categorías, carrusel, ajustes) vive en DATOS
   editables desde el Panel del dueño. Al publicar, la página guarda los datos
   nuevos y todos los clientes ven la versión actualizada.
*/
const { useState, useEffect, useRef, useReducer, useMemo, useContext, createContext } = React;
const html = htm.bind(React.createElement);

/* ---------- Datos ---------- */
const DEFAULT_DATA = JSON.parse(document.getElementById("store-data").textContent);
let DATA, CONFIG, CATEGORIES, CATALOG, SLIDES;
function applyData(d){
  DATA=d; CONFIG=d.settings; CATEGORIES=d.categories; SLIDES=d.slides;
  CATALOG=d.products.filter(p=>!p.hidden && CATEGORIES.some(c=>c.id===p.cat));
}
applyData(DEFAULT_DATA);
const money = n => `${CONFIG.currency} ${(+n||0).toFixed(2)}`;
const bulkOff = q => [...CONFIG.bulk].sort((a,b)=>a.min-b.min).reduce((o,t)=> q>=t.min ? t.off/100 : o, 0);
const finalPrice = p => Math.round(p.price*(1-(p.discount||0)/100)*100)/100;
const productById = id => CATALOG.find(p=>p.id===id);
const TALLAS = { label:"Talla", values:["S","M","L","XL","XXL"] };
const slug = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"item";
const uniqueId = (base, taken) => { let id=slug(base), k=2; while(taken.includes(id)) id=slug(base)+"-"+(k++); return id; };

/* ===== Dónde se guarda la tienda =====
   - En Claude (página publicada): capacidades del artefacto.
   - En GitHub Pages: el Panel del dueño guarda docs/store-data.json en tu repositorio con un token de GitHub. */
const IN_CLAUDE = !!(window.claude && window.claude.use);
const GH_KEY = "sublipro-github";
function ghGuess(){
  const h=location.hostname, parts=location.pathname.split("/").filter(Boolean);
  if(h.endsWith(".github.io")){ const owner=h.split(".")[0]; return {owner, repo: parts[0] && !parts[0].includes(".") ? parts[0] : `${owner}.github.io`}; }
  return {owner:"", repo:""};
}
function ghLoad(){ try{ return JSON.parse(localStorage.getItem(GH_KEY))||null; }catch(e){ return null; } }
function ghSave(c){ try{ c?localStorage.setItem(GH_KEY,JSON.stringify(c)):localStorage.removeItem(GH_KEY); }catch(e){} }
async function gh(c, path, opt={}){
  const r=await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}${path}`,{...opt,headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${c.token}`,"X-GitHub-Api-Version":"2022-11-28",...(opt.headers||{})}});
  if(!r.ok){ const e=new Error("github "+r.status); e.status=r.status; try{ e.body=await r.json(); }catch(_){} throw e; }
  return r.status===204?null:r.json();
}
async function ghVerify(c){
  const info=await gh(c,"");
  if(!info.permissions || !info.permissions.push) throw Object.assign(new Error("sin permiso"),{status:403});
  return {...c, branch: c.branch || info.default_branch};
}
function toBase64(str){
  const bytes=new TextEncoder().encode(str); let bin="";
  for(let i=0;i<bytes.length;i+=0x8000) bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
  return btoa(bin);
}
const GH_DATA_PATH="docs/store-data.json";
const FB = window.FireStore || null;   // Firebase (GitHub Pages). null dentro de Claude o sin conexión a Firebase
let FB_EMPTY = false;                  // true cuando Firebase aún no tiene el catálogo

/* Carga: datos incrustados en la página o archivo de datos publicado (el más reciente gana) */
async function loadPublishedData(){
  if(FB){ try{ const d=await FB.load(); if(d) return d; FB_EMPTY=true; }catch(e){ console.warn("Firebase:",e); } }
  let file=null;
  try{ const r=await fetch("store-data.json?v="+Date.now(),{cache:"no-store"}); if(r.ok) file=await r.json(); }catch(e){}
  const emb=DEFAULT_DATA;
  return file && (file.updatedAt||0) > (emb.updatedAt||0) ? file : emb;
}

/* Publicar en Claude: archivo de datos; si no está disponible, republica la página entera. */
const RESET_CSS=":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}";
function buildPage(d){
  const txt=id=>document.getElementById(id).textContent;
  const scripts=[...document.querySelectorAll("script[data-cdn]")].map(s=>`<script data-cdn src="${s.getAttribute("src")}"></`+`script>`).join("");
  const json=JSON.stringify(d).replace(/</g,"\\u003c");
  return `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${RESET_CSS}</style></head><body>`+
    `<title>${document.title.replace(/</g,"")}</title><meta name="claude:viewport-fit-sides" content="cover">`+
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">`+
    `<style id="css">${txt("css")}</style><div id="root"></div>${scripts}`+
    `<script id="store-data" type="application/json">${json}</`+`script>`+
    `<script id="sim-src">${txt("sim-src")}</`+`script><script id="app-src">${txt("app-src")}</`+`script></body></html>`;
}
async function publishData(d){
  if(FB){
    try{ await FB.publish(d); FB_EMPTY=false; return "firebase"; }
    catch(e){ throw {code: e.code==="fb_login"||e.code==="too_large" ? e.code : e.code==="permission-denied" ? "fb_perm" : "fb_error"}; }
  }
  if(!IN_CLAUDE){
    const c=ghLoad(); if(!c||!c.token) throw {code:"gh_login"};
    let sha;
    try{ const cur=await gh(c,`/contents/${GH_DATA_PATH}?ref=${encodeURIComponent(c.branch)}`); sha=cur.sha; }catch(e){ if(e.status!==404) throw {code:e.status===401?"gh_token":"gh_error"}; }
    try{ await gh(c,`/contents/${GH_DATA_PATH}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Actualiza la tienda desde el Panel del dueño",content:toBase64(JSON.stringify(d,null,1)),branch:c.branch,...(sha?{sha}:{})})}); }
    catch(e){ throw {code:e.status===401?"gh_token":e.status===403?"gh_perm":e.status===409||e.status===422?"gh_conflict":e.status===413?"too_large":"gh_error"}; }
    return "github";
  }
  const art = await claude.use("artifact");
  if(!art) throw {code:"not_granted"};
  try{
    await art.publish({"store-data.json":{content:JSON.stringify(d), contentType:"application/json"}});
    return "files";
  }catch(e){
    if(["capability_disabled","capability_removed","invalid_content","transform_error"].includes(e&&e.code)){ await art.publish(buildPage(d)); return "page"; }
    throw e;
  }
}
const PUBLISH_ERRORS={
  not_writer:"Tu cuenta puede ver la tienda pero no editarla. Pide permiso de edición al dueño.",
  not_granted:"Esta vista no permite guardar cambios. Ábrela desde tu cuenta de dueño.",
  conflict:"Alguien publicó cambios hace un momento. La página se recargará; tu borrador queda guardado.",
  too_large:"Las fotos pesan demasiado. Quita algunas fotos o usa imágenes más pequeñas.",
  rate_limited:"Publicaste hace muy poco. Espera unos segundos e inténtalo otra vez.",
  gh_login:"Inicia sesión con tu token de GitHub para publicar.",
  gh_token:"Tu token de GitHub venció o no es válido. Cierra sesión y entra con un token nuevo.",
  gh_perm:"El token no tiene permiso de escritura en este repositorio. Créalo con «Contents: Read and write».",
  gh_conflict:"El archivo cambió en GitHub mientras editabas. Vuelve a presionar «Publicar cambios».",
  gh_error:"GitHub no respondió. Revisa tu internet e inténtalo de nuevo.",
  fb_login:"Tu sesión terminó. Vuelve a iniciar sesión con Google.",
  fb_perm:"Esta cuenta de Google no tiene permiso para guardar. Revisa las reglas de Firestore.",
  fb_error:"No se pudo guardar en Firebase. Revisa tu internet e inténtalo de nuevo."
};

/* Imagen subida → JPG comprimido */
function compressImage(file, max=900, q=0.8){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onerror=rej; r.onload=()=>{ const im=new Image(); im.onerror=rej; im.onload=()=>{
    const k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement("canvas"); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
    const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height); res(c.toDataURL("image/jpeg",q)); }; im.src=r.result; }; r.readAsDataURL(file); });
}

/* ---------- Carrito ---------- */
const CartCtx = createContext(null);
const STORAGE_KEY = "sublipro-cart-v2";
function cartReducer(state, a){
  switch(a.type){
    case "add": return [...state, { ...a.item, key: Date.now()+Math.random() }];
    case "qty": return state.map(i=> i.key===a.key ? {...i, qty:Math.max(1,a.qty)} : i);
    case "remove": return state.filter(i=>i.key!==a.key);
    case "clear": return [];
    default: return state;
  }
}
function loadCart(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]; }catch(e){ return []; } }
function CartProvider({children}){
  const [items, dispatch] = useReducer(cartReducer, null, loadCart);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  useEffect(()=>{ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }catch(e){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i=>({...i, thumb:null, print:null})))); }catch(_){}
  }},[items]);
  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(null),2600); return ()=>clearTimeout(t); },[toast]);
  const totals = useMemo(()=>{
    const units = items.reduce((s,i)=>s+i.qty,0), sub = items.reduce((s,i)=>s+i.qty*i.unit,0), off = bulkOff(units);
    return { units, sub, off, discount: sub*off, total: sub*(1-off) };
  },[items, DATA]);
  const add = item => { dispatch({type:"add", item}); setToast(`Agregado: ${item.name}`); };
  return html`<${CartCtx.Provider} value=${{items, dispatch, totals, open, setOpen, add, setToast}}>
    ${children}
    ${toast && html`<div class="toast" role="status">${toast}</div>`}
  <//>`;
}
const useCart = () => useContext(CartCtx);

/* ---------- Router por hash ---------- */
function useHash(){
  const get = () => (location.hash||"").replace("#","");
  const [h,setH] = useState(get);
  useEffect(()=>{ const f=()=>{ setH(get()); window.scrollTo({top:0}); }; addEventListener("hashchange",f); return ()=>removeEventListener("hashchange",f); },[]);
  return h;
}
const go = r => { location.hash = r; };
const fixedRoutes = ["inicio","catalogo","polos","tazas-3d","mousepads-3d","cotizador","buscar"];

/* ---------- WhatsApp ---------- */
const waLink = text => `https://wa.me/${(CONFIG.whatsapp||"").replace(/\D/g,"")}?text=${encodeURIComponent(text)}`;
const PAY_METHODS = ["Yape", "Transferencia", "Efectivo en taller", "Contraentrega"];
function orderText(items, totals, pay){
  const lines = items.map(i=>`• ${i.qty} × ${i.name}${i.detail?` (${i.detail})`:""} — ${money(i.qty*i.unit)}`);
  return `Hola ${CONFIG.name}, quiero hacer este pedido:\n${lines.join("\n")}\n\nSubtotal: ${money(totals.sub)}`+
    (totals.off?`\nDescuento por volumen (${Math.round(totals.off*100)}%): -${money(totals.discount)}`:"")+
    `\nTotal a pagar: ${money(totals.total)}`+
    (pay?`\nMedio de pago: ${pay}`:"")+
    `\n\nEnviaré mis diseños por este chat.`;
}

/*@include art.js*/

/* Foto con respaldo: si la imagen no carga, se muestra la ilustración */
const BROKEN = new Set();
function Photo({src, alt, fallback}){
  const [bad,setBad] = useState(BROKEN.has(src));
  useEffect(()=>{ setBad(BROKEN.has(src)); },[src]);
  if(!src || bad) return fallback;
  return html`<img class="photo" src=${src} alt=${alt||""} loading="lazy" decoding="async" referrerpolicy="no-referrer" onError=${()=>{ BROKEN.add(src); setBad(true); }}/>`;
}
function ProductMedia({p, print}){
  const art = html`<${ProductArt} type=${p.art} color=${p.color} inner=${p.inner} thermo=${p.thermo} pattern=${p.pattern} print=${print}/>`;
  if(p.photo && !print) return html`<${Photo} src=${p.photo} alt=${p.name} fallback=${art}/>`;
  return art;
}
function Price({p, size}){
  const f=finalPrice(p);
  return html`<div class="price" style=${size?{fontSize:size}:null}>${money(f)} ${p.discount>0 && html`<s class="was">${money(p.price)}</s>`}</div>`;
}

const Icon = {
  search: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  bag: html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  chat: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>`,
  calc: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>`,
  gear: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>`,
  truck: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
  shield: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  drop: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/></svg>`,
  cube: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>`,
  tag: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="8" cy="8" r="1.5"/></svg>`
};

/* ---------- Cabecera, navegación y pie ---------- */
function TopBar({canEdit, onAdmin}){
  return html`<div class="topbar"><div class="wrap">
    <span><span class="dot"></span>${CONFIG.topbar}</span>
    <div class="tb-r"><span>WhatsApp directo: <b>${CONFIG.whatsappLabel}</b></span>
      ${canEdit && html`<button class="tb-admin" onClick=${onAdmin}>${Icon.gear} Panel del dueño</button>`}</div>
  </div></div>`;
}
function Logo(){
  const n=CONFIG.name||"", sp=n.indexOf(" ");
  // Primera palabra normal; el resto (desde el primer espacio) en color. Sin espacio: nombre entero sin color.
  return html`<a class="logo" href="#inicio" aria-label=${n+" inicio"}><b>${sp<0?n:html`${n.slice(0,sp)}<span>${n.slice(sp)}</span>`}</b><small>${CONFIG.tagline}</small></a>`;
}
function Header({query,setQuery}){
  const {totals,setOpen} = useCart();
  return html`<header class="head"><div class="wrap">
    <${Logo}/>
    <form class="search" role="search" onSubmit=${e=>{e.preventDefault(); go("buscar");}}>
      <span style=${{color:"var(--muted)",display:"flex"}}>${Icon.search}</span>
      <input id="q" type="search" placeholder="Buscar productos…" value=${query} onInput=${e=>setQuery(e.target.value)} aria-label="Buscar productos"/>
      <button type="submit">Buscar</button>
    </form>
    <div class="hd-actions">
      <a class="pill soft" href="#cotizador">${Icon.calc}<span class="lbl">Cotizador</span></a>
      <a class="pill wa" href=${waLink("Hola, quiero información sobre sus productos personalizados.")} target="_blank" rel="noopener">${Icon.chat}<span class="lbl">WhatsApp</span></a>
      <button class="cartbtn" onClick=${()=>setOpen(true)} aria-label=${`Abrir carrito, ${totals.units} productos`}>${Icon.bag}<span class="lbl">${totals.units>0?money(totals.total):"Carrito"}</span>${totals.units>0 && html`<span class="badge">${totals.units}</span>`}</button>
    </div>
  </div></header>`;
}
function NavMenu({id,label,items,route,open,setOpen}){
  const active=items.some(([r])=>r===route), isOpen=open===id;
  return html`<li class=${"nav-dd"+(isOpen?" open":"")} onMouseEnter=${()=>setOpen(id)} onMouseLeave=${()=>setOpen(null)}>
    <button type="button" class=${active?"on":""} aria-expanded=${isOpen} aria-haspopup="true" onClick=${()=>setOpen(isOpen?null:id)}>${label}<span class="caret" aria-hidden="true">▾</span></button>
    <div class="nav-panel">${items.map(([r,l,sep])=>html`<a key=${r} href=${"#"+r} class=${sep?"sep":""} aria-current=${route===r?"page":undefined} onClick=${()=>setOpen(null)}>${l}</a>`)}</div>
  </li>`;
}
function Nav({route}){
  const [open,setOpen]=useState(null);
  useEffect(()=>setOpen(null),[route]);
  const productos=[["catalogo","Ver todo el catálogo",true],...CATEGORIES.map(c=>[c.id,c.name])];
  const disena=[["polos","Polo personalizado"],["tazas-3d","Taza personalizada"],["mousepads-3d","Mousepad personalizado"]];
  const link=(r,l)=>html`<li><a href=${"#"+r} aria-current=${route===r?"page":undefined}>${l}</a></li>`;
  const maxOff=Math.max(0,...CONFIG.bulk.map(t=>t.off));
  return html`<nav class="nav" aria-label="Principal"><div class="wrap">
    <ul>
      ${link("inicio","Inicio")}
      <${NavMenu} id="productos" label="Productos" items=${productos} route=${route} open=${open} setOpen=${setOpen}/>
      <${NavMenu} id="disena" label="Diseña en 3D" items=${disena} route=${route} open=${open} setOpen=${setOpen}/>
      ${link("cotizador","Empresas y eventos")}
    </ul>
    <div class="tags"><span class="tag sky">Calidad garantizada 300 DPI</span>${maxOff>0 && html`<span class="tag pink">Hasta ${maxOff}% OFF por volumen</span>`}</div>
  </div></nav>`;
}
function Footer(){
  return html`<footer class="foot"><div class="wrap">
    <div class="fcols">
      <div><${Logo}/><p>${CONFIG.about}</p>
        <div class="fbadges"><span class="fbadge">${Icon.truck} Envíos a todo el país</span><span class="fbadge">${Icon.shield} Garantía de impresión</span></div></div>
      <div><h4>Productos</h4><ul>${CATEGORIES.map(c=>html`<li key=${c.id}><a href=${"#"+c.id}>${c.name}</a></li>`)}<li><a href="#cotizador">Packs para empresas y eventos</a></li></ul></div>
      <div><h4>Servicio al cliente</h4><ul>
        <li><a href="#cotizador">Cotizador por volumen</a></li>
        <li><a href="#polos">Diseña tu polo en 3D</a></li>
        <li><a href=${waLink("Hola, ¿cómo envío mi archivo de diseño?")} target="_blank" rel="noopener">Cómo enviar tus archivos (300 DPI)</a></li>
        <li><a href=${waLink("Hola, necesito asesoría para un pedido.")} target="_blank" rel="noopener">Contacto y asesoría</a></li>
      </ul></div>
    </div>
    <div class="fbottom"><div class="pay">Medios de pago: ${(CONFIG.payments||"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>html`<span key=${s}>${s}</span>`)}</div><div>© ${new Date().getFullYear()} ${CONFIG.name}. Todos los derechos reservados. Fotos de referencia: <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>.</div></div>
  </div></footer>`;
}

/* ---------- Carrusel principal ---------- */
function Carousel(){
  const n=SLIDES.length;
  const [i,setI] = useState(0), [paused,setPaused] = useState(false);
  const startX=useRef(null);
  useEffect(()=>{ if(i>=n) setI(0); },[n]);
  useEffect(()=>{ if(paused || n<2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return; const t=setInterval(()=>setI(v=>(v+1)%n),5500); return ()=>clearInterval(t); },[paused,n]);
  if(!n) return null;
  return html`<section class="hero wrap" aria-roledescription="carrusel" aria-label="Promociones">
    <div class="carousel" onMouseEnter=${()=>setPaused(true)} onMouseLeave=${()=>setPaused(false)}
      onTouchStart=${e=>{startX.current=e.touches[0].clientX;}} onTouchEnd=${e=>{const d=e.changedTouches[0].clientX-(startX.current||0); if(Math.abs(d)>40) setI(v=>(v+(d<0?1:-1)+n)%n);}}>
      <div class="track" style=${{transform:`translateX(-${Math.min(i,n-1)*100}%)`}}>
        ${SLIDES.map((s,k)=>html`<div class="slide" key=${k} style=${{background:`linear-gradient(115deg,${s.bg1||"#1E2638"} 30%,${s.bg2||"#2B2F7A"})`}} aria-hidden=${k!==i} role="group" aria-label=${`${k+1} de ${n}`}>
          <div class="txt">${s.kicker && html`<span class="kicker">${s.kicker}</span>`}<h1>${s.title}</h1>${s.text && html`<p>${s.text}</p>`}
            <div class="ctas">${s.cta&&s.cta[0] && html`<a class="cta" href=${"#"+s.cta[1]} tabIndex=${k===i?0:-1}>${s.cta[0]} →</a>`}${s.cta2&&s.cta2[0] && html`<a class="cta ghost" href=${"#"+s.cta2[1]} tabIndex=${k===i?0:-1}>${s.cta2[0]}</a>`}</div></div>
          <div class="art">${s.photo ? html`<img class="slide-photo" src=${s.photo} alt=""/>` : html`<${ProductArt} type=${s.art||"tee"} inner=${s.art==="mug"?"#E2457A":undefined}/>`}</div>
        </div>`)}
      </div>
      ${n>1 && html`<button class="car-btn prev" onClick=${()=>setI((i-1+n)%n)} aria-label="Anterior">‹</button>
      <button class="car-btn next" onClick=${()=>setI((i+1)%n)} aria-label="Siguiente">›</button>
      <div class="dots">${SLIDES.map((_,k)=>html`<button key=${k} aria-label=${`Ir a la promoción ${k+1}`} aria-current=${k===i} onClick=${()=>setI(k)}></button>`)}</div>`}
    </div>
  </section>`;
}

/* ---------- Carrusel en movimiento ---------- */
function Marquee({onOpen}){
  const items = CATALOG;
  if(!items.length) return null;
  const open = p => p.sim ? go(simRoute(p)) : onOpen(p);
  return html`<section class="section" style=${{paddingBottom:0}} aria-label="Todos nuestros productos">
    <div class="wrap sec-head"><div><span class="eyebrow">${items.length} productos</span><h2>Todo lo que sublimamos</h2></div><a class="link" href="#catalogo">Ver catálogo →</a></div>
    <div class="marquee"><div class="mq-track" style=${{animationDuration:Math.max(30,items.length*2.6)+"s"}}>
      ${[...items,...items].map((p,k)=>html`<button class="mq-item" key=${k} onClick=${()=>open(p)} tabIndex=${k>=items.length?-1:0} aria-hidden=${k>=items.length}>
        <span class="mq-ph"><${ProductMedia} p=${p}/></span>
        <span class="mq-name">${p.name}</span><span class="mq-price">${p.discount>0?`${p.discount}% OFF · `:"desde "}${money(finalPrice(p))}</span></button>`)}
    </div></div></section>`;
}

/* ---------- Productos ---------- */
/* Cada producto abre su página de personalización: 3D si tiene modelo, si no la vista previa 2D */
const productRoute = p => p.sim ? simRoute(p) : "personalizar/"+p.id;
function ProductCard({p}){
  const href = "#"+productRoute(p);
  return html`<article class="card">
    <a class="ph" href=${href} aria-label=${"Personalizar "+p.name}>${(p.tag||p.discount>0) && html`<span class="ribbon">${p.discount>0 && html`<span class="tag off">−${p.discount}%</span>`}${p.tag && html`<span class="tag pink">${p.tag}</span>`}</span>`}<${ProductMedia} p=${p}/></a>
    <div class="body"><h3><a class="card-link" href=${href}>${p.name}</a></h3><p>${p.desc}</p>
      <div class="cfoot"><${Price} p=${p}/>
        <a class="btn primary" href=${href}>${p.sim?"Diseñar en 3D":"Ordenar"}</a></div></div>
  </article>`;
}
function ProductGrid({items, onOpen}){
  if(!items.length) return html`<p class="lead">Pronto agregaremos productos aquí.</p>`;
  return html`<div class="grid">${items.map(p=>html`<${ProductCard} key=${p.id} p=${p} onOpen=${onOpen}/>`)}</div>`;
}
function Qty({value,set}){
  return html`<div class="qty"><button onClick=${()=>set(Math.max(1,value-1))} aria-label="Menos">−</button>
    <input type="number" min="1" value=${value} onInput=${e=>set(Math.max(1,parseInt(e.target.value)||1))} aria-label="Cantidad"/>
    <button onClick=${()=>set(value+1)} aria-label="Más">+</button></div>`;
}
/* ---------- Personalizador 2D (productos sin modelo 3D) ---------- */
const BASE_COLORS = [["Blanco","#FFFFFF"],["Negro","#1B1B1B"],["Gris","#C9CCCF"],["Rojo","#C8202F"],["Azul marino","#1C2A4A"],["Celeste","#A9D6F0"],["Rosa","#F4B6CC"],["Amarillo","#F7D84A"],["Verde menta","#B5E3C8"]];
function CustomPage({p, onOpen}){
  const {add} = useCart();
  const usesColor = artUsesColor(p.art);
  const [color,setColor] = useState(()=>BASE_COLORS.find(c=>c[1].toUpperCase()===(p.color||"").toUpperCase()) || BASE_COLORS[0]);
  const [opt,setOpt] = useState(p.options&&p.options.values.length?p.options.values[0]:null);
  const [qty,setQty] = useState(1), [print,setPrint] = useState(null), [note,setNote] = useState(""), [err,setErr] = useState("");
  const canCover = artCanCover(p.art);
  const [cover,setCover] = useState(canCover);   // true: el diseño cubre todo el producto
  const start = c => ({s:c?1:0.8,x:0,y:0});
  const [pos,setPos] = useState(()=>start(canCover));
  const setMode = c => { setCover(c); setPos(start(c)); };
  const models = (p.models||[]).filter(Boolean);
  const [model,setModel] = useState(null);       // índice del modelo listo elegido (null = diseño propio)
  const cur = useRef(null);                       // modelo actual al instante (clics rápidos en las flechas)
  const useModel = i => { cur.current=i; setPrint(models[i]); setModel(i); setPos(start(cover)); setErr(""); };
  const stepModel = d => { const n=models.length; if(!n) return; const c = cur.current==null ? (d>0?-1:0) : cur.current; useModel((c+d+n)%n); };
  const onFile = async e => { const f=e.target.files[0]; e.target.value=""; if(!f) return; setErr("");
    try{ setPrint(await compressImage(f,900,0.85)); setModel(null); cur.current=null; setPos(start(cover)); }catch(_){ setErr("No se pudo leer esa imagen. Prueba con un JPG o PNG."); } };
  const unit=finalPrice(p), cat=CATEGORIES.find(c=>c.id===p.cat);
  const artProps = {type:p.art, color:usesColor?color[1]:p.color, inner:p.inner, thermo:p.thermo, print, printPos:print?{...pos,full:cover}:null};
  const addToCart = () => {
    // Como archivo de imagen, el SVG necesita xmlns (si no, el <img> del carrito sale roto)
    const svg = artMarkup(p.art, artProps).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" ');
    const thumb = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
    add({ id:p.id, name:p.name, unit, qty, art:p.art, color:artProps.color, inner:p.inner, thumb,
      detail:[usesColor && `Color: ${color[0]}`, opt && `${p.options.label}: ${opt}`, model!=null && print && `Modelo listo #${model+1}`, print?(cover?"diseño en todo el producto":"diseño como logo"):"diseño por WhatsApp", note && `Nota: ${note}`].filter(Boolean).join(" · ") });
  };
  const slider = (label,key,min,max,step) => html`<label class="cz-range"><span>${label}</span>
    <input type="range" min=${min} max=${max} step=${step} value=${pos[key]} onInput=${e=>setPos({...pos,[key]:+e.target.value})}/></label>`;
  return html`<div>
    <${PageHead} title=${p.name} crumb=${html`${cat?html`<a href=${"#"+cat.id}>${cat.name}</a> / `:""}Personalizar`} text=${p.desc}/>
    <section class="section wrap"><div class="cz">
      <div class="cz-stage">
        <div class="cz-view">
          ${models.length>1 && html`<button class="cz-arrow prev" onClick=${()=>stepModel(-1)} aria-label="Modelo anterior">‹</button>`}
          <div class="cz-art"><${ProductArt} ...${artProps}/></div>
          ${models.length>1 && html`<button class="cz-arrow next" onClick=${()=>stepModel(1)} aria-label="Modelo siguiente">›</button>`}
        </div>
        ${models.length>0 && html`<div class="cz-count">${model!=null&&print?`Modelo ${model+1} de ${models.length}`:`${models.length} modelo${models.length>1?"s":""} listo${models.length>1?"s":""} · usa las flechas`}</div>`}
        <small class="cz-hint">${print?"Vista previa con tu diseño. El acabado final puede variar ligeramente.":"Sube tu diseño y mira cómo queda."}</small>
        ${p.photo && html`<div class="cz-photo"><${Photo} src=${p.photo} alt=${"Foto de "+p.name} fallback=${null}/><span>Foto real del producto</span></div>`}
      </div>
      <div class="cz-panel">
        <div style=${{display:"flex",gap:8,alignItems:"center"}}><${Price} p=${p} size=${22}/>${p.discount>0 && html`<span class="tag off">−${p.discount}%</span>`}</div>
        ${usesColor && html`<div class="field">Color: <b>${color[0]}</b>
          <div class="cz-colors">${BASE_COLORS.map(c=>html`<button key=${c[1]} class="cz-sw" style=${{background:c[1]}} aria-pressed=${c[1]===color[1]} aria-label=${c[0]} title=${c[0]} onClick=${()=>setColor(c)}></button>`)}</div></div>`}
        ${models.length>0 && html`<div class="field">Modelos listos <small class="cz-sub">Toca uno para verlo en tu producto</small>
          <div class="cz-models">${models.map((m,i)=>html`<button key=${i} class="cz-model" aria-pressed=${model===i&&!!print} aria-label=${"Modelo "+(i+1)} onClick=${()=>useModel(i)}><img src=${m} alt="" loading="lazy"/><span>#${i+1}</span></button>`)}</div></div>`}
        <div class="field">${models.length?"O sube tu propio diseño":"Tu diseño"}
          <label class="drop">${print&&model==null?"Cambiar mi diseño":"Subir mi diseño (PNG / JPG, ideal 300 DPI)"}<input type="file" accept="image/*" onChange=${onFile}/></label>
          ${err && html`<small class="pay-warn">${err}</small>`}
          ${print && html`<div class="cz-adjust">
            ${canCover && html`<div class="chips" role="group" aria-label="Dónde va el diseño">
              <button aria-pressed=${cover} onClick=${()=>setMode(true)}>Todo el producto</button>
              <button aria-pressed=${!cover} onClick=${()=>setMode(false)}>Solo un logo</button></div>`}
            ${slider(cover?"Zoom":"Tamaño","s",cover?1:0.3,cover?3:1.6,0.05)}${slider("Horizontal","x",-0.5,0.5,0.02)}${slider("Vertical","y",-0.5,0.5,0.02)}
            <div style=${{display:"flex",gap:8}}><button class="btn" onClick=${()=>setPos(start(cover))}>Centrar</button><button class="btn" onClick=${()=>{ setPrint(null); setModel(null); cur.current=null; }}>Quitar diseño</button></div>
          </div>`}
        </div>
        ${p.options && p.options.values.length>0 && html`<div class="field">${p.options.label}<div class="chips">${p.options.values.map(v=>html`<button key=${v} aria-pressed=${v===opt} onClick=${()=>setOpt(v)}>${v}</button>`)}</div></div>`}
        <div class="field"><label for="note">Indicaciones (opcional)</label><textarea id="note" placeholder="Ej.: nombre en la parte de atrás, fondo azul…" value=${note} onInput=${e=>setNote(e.target.value)}></textarea></div>
        <div style=${{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",justifyContent:"space-between"}}>
          <div class="field">Cantidad<${Qty} value=${qty} set=${setQty}/></div>
          <div class="total">${money(unit*qty)}<small>${bulkOff(qty)?`${Math.round(bulkOff(qty)*100)}% OFF por volumen en el carrito`:CONFIG.bulk.length?`Desde ${Math.min(...CONFIG.bulk.map(t=>t.min))} u. tienes descuento`:""}</small></div>
        </div>
        <button class="btn primary block" onClick=${addToCart}>Agregar al carrito</button>
      </div>
    </div></section>
    ${cat && html`<section class="section wrap" style=${{paddingTop:0}}>
      <div class="sec-head"><h2>Más ${cat.name.toLowerCase()}</h2><a class="link" href=${"#"+cat.id}>Ver todo →</a></div>
      <${ProductGrid} items=${CATALOG.filter(x=>x.cat===cat.id&&x.id!==p.id).slice(0,4)} onOpen=${onOpen}/>
    </section>`}
  </div>`;
}

/* ---------- Carrito ---------- */
function CartDrawer(){
  const {items,dispatch,totals,open,setOpen} = useCart();
  const [pay,setPay] = useState(null), [payWarn,setPayWarn] = useState(false);
  useEffect(()=>{ if(!open) return; const k=e=>{ if(e.key==="Escape") setOpen(false); }; addEventListener("keydown",k); return ()=>removeEventListener("keydown",k); },[open]);
  if(!open) return null;
  const next = [...CONFIG.bulk].sort((a,b)=>a.min-b.min).find(t=>totals.units<t.min);
  return html`<div class="overlay" style=${{justifyContent:"flex-end",padding:0}} onClick=${e=>{ if(e.target===e.currentTarget) setOpen(false); }}>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Carrito">
      <header><h2 style=${{fontSize:18}}>Tu carrito</h2><button class="x" style=${{position:"static"}} onClick=${()=>setOpen(false)} aria-label="Cerrar carrito">×</button></header>
      <div class="items">
        ${!items.length && html`<div class="empty-cart"><p>Tu carrito está vacío.</p><a class="btn primary" href="#catalogo" onClick=${()=>setOpen(false)}>Ver catálogo</a></div>`}
        ${items.map(i=>html`<div class="item" key=${i.key}>
          <div class="th">${i.thumb?html`<img src=${i.thumb} alt=""/>`:html`<${Photo} src=${i.print?null:i.photo} fallback=${html`<${ProductArt} type=${i.art} color=${i.color} inner=${i.inner} print=${i.print}/>`}/>`}</div>
          <div><h4>${i.name}</h4><small>${i.detail}</small>
            <div style=${{display:"flex",gap:10,alignItems:"center",marginTop:6}}><${Qty} value=${i.qty} set=${q=>dispatch({type:"qty",key:i.key,qty:q})}/><button class="rm" onClick=${()=>dispatch({type:"remove",key:i.key})}>Quitar</button></div></div>
          <div class="price" style=${{fontSize:14}}>${money(i.qty*i.unit)}</div>
        </div>`)}
      </div>
      ${items.length>0 && html`<div class="sum">
        ${next && html`<div class="note-cfg">Agrega ${next.min-totals.units} unidad(es) más y obtén ${next.off}% de descuento.</div>`}
        <div class="ln"><span>Subtotal (${totals.units} u.)</span><span>${money(totals.sub)}</span></div>
        ${totals.off>0 && html`<div class="ln off"><span>Descuento por volumen ${Math.round(totals.off*100)}%</span><span>−${money(totals.discount)}</span></div>`}
        <div class="ln big"><span>Total</span><span>${money(totals.total)}</span></div>
        <div class="field pay-field">¿Cómo deseas pagar?
          <div class="chips" role="group" aria-label="Medio de pago">${PAY_METHODS.map(m=>html`<button key=${m} aria-pressed=${pay===m} onClick=${()=>{ setPay(m); setPayWarn(false); }}>${m}</button>`)}</div>
          ${payWarn && html`<small class="pay-warn" role="alert">Elige un medio de pago para continuar.</small>`}</div>
        <a class="btn wa block" href=${pay?waLink(orderText(items,totals,pay)):"#"} target="_blank" rel="noopener" aria-disabled=${!pay}
          onClick=${e=>{ if(!pay){ e.preventDefault(); setPayWarn(true); } }}>${Icon.chat} Pagar · enviar pedido por WhatsApp</a>
        <button class="btn block" onClick=${()=>dispatch({type:"clear"})}>Vaciar carrito</button>
        <div class="note-cfg">Se abre WhatsApp con el resumen de tu pedido y el total para coordinar el pago con ${CONFIG.whatsappLabel}.</div>
      </div>`}
    </aside></div>`;
}

/* ---------- Páginas ---------- */
function Home({onOpen}){
  const featured = CATALOG.filter(p=>p.featured);
  const tiers=[...CONFIG.bulk].sort((a,b)=>a.min-b.min);
  return html`<div>
    <${Carousel}/>
    <${Marquee} onOpen=${onOpen}/>
    <section class="section wrap">
      <div class="sec-head"><div><span class="eyebrow">Categorías</span><h2>¿Qué quieres personalizar hoy?</h2></div><a class="link" href="#catalogo">Ver todo el catálogo →</a></div>
      <div class="cats">${CATEGORIES.map(c=>html`<a class="cat" key=${c.id} href=${"#"+c.id}><div class="ph"><${Photo} src=${c.photo} fallback=${html`<${ProductArt} type=${c.art} inner=${c.art==="mug"?"#3B3FD8":undefined}/>`}/></div><h3>${c.name}</h3><small>${c.blurb}</small></a>`)}</div>
    </section>
    ${featured.length>0 && html`<section class="section wrap" style=${{paddingTop:0}}>
      <div class="sec-head"><div><span class="eyebrow">Destacados</span><h2>Los más pedidos</h2></div></div>
      <${ProductGrid} items=${featured} onOpen=${onOpen}/>
    </section>`}
    <section class="section wrap" style=${{paddingTop:0}}>
      <div class="perks">
        <div class="perk"><span class="ic">${Icon.drop}</span><h3>Tinta HD que no se borra</h3><p>La sublimación se fusiona con la fibra: no se cuartea ni se despega.</p></div>
        <div class="perk"><span class="ic">${Icon.cube}</span><h3>Vista previa en 3D</h3><p>Diseña tu polo y revisa cada lado antes de pagar.</p></div>
        <div class="perk"><span class="ic">${Icon.tag}</span><h3>Desde 1 unidad</h3><p>Y descuentos por volumen en el carrito.</p></div>
        <div class="perk"><span class="ic">${Icon.truck}</span><h3>Envíos a todo el país</h3><p>Recojo en taller o delivery coordinado.</p></div>
      </div>
    </section>
    <section class="section wrap" style=${{paddingTop:0}}>
      <div class="sec-head"><div><span class="eyebrow">Cómo pedir</span><h2>Tu producto en 3 pasos</h2></div></div>
      <div class="steps">
        <div class="step"><b>1</b><h3>Elige y personaliza</h3><p>Sube tu imagen o diseña tu polo en el personalizador 3D.</p></div>
        <div class="step"><b>2</b><h3>Envía tu pedido</h3><p>El carrito arma el mensaje y lo mandas por WhatsApp.</p></div>
        <div class="step"><b>3</b><h3>Recibe tu prueba y producción</h3><p>Te enviamos la prueba de diseño; al aprobarla, imprimimos.</p></div>
      </div>
    </section>
    ${tiers.length>0 && html`<section class="wrap"><div class="bulk"><div><span class="eyebrow" style=${{color:"var(--cyan)"}}>Empresas y eventos</span><h2>Más unidades, mejor precio</h2><p>Descuento automático en el carrito y el cotizador.</p></div>
      <div class="tiers">${tiers.map(t=>html`<div class="tier" key=${t.min}><b>${t.off}% OFF</b><span>desde ${t.min} u.</span></div>`)}</div>
      <a class="cta" href="#cotizador">Cotizar ahora →</a></div></section>`}
  </div>`;
}
function PageHead({title, text, crumb}){
  return html`<div class="page-head"><div class="wrap"><div class="crumbs"><a href="#inicio">Inicio</a> / ${crumb||title}</div><h1>${title}</h1>${text && html`<p class="lead">${text}</p>`}</div></div>`;
}
function CategoryPage({cat, onOpen}){
  const c = CATEGORIES.find(x=>x.id===cat);
  const items = CATALOG.filter(p=>p.cat===cat);
  return html`<div><${PageHead} title=${c.name} text=${c.blurb}/>
    ${[...new Set(items.filter(p=>p.sim).map(simKind))].map(k=>html`<section class="wrap" key=${k} style=${{paddingTop:24}}><div class="bulk"><div><span class="eyebrow" style=${{color:"var(--cyan)"}}>Personalizador 3D</span><h2>${{taza:"Diseña tu taza y gírala en 360°",mousepad:"Diseña tu mousepad en 3D"}[k]||"Diseña tu polo y gíralo en 360°"}</h2><p>${{taza:"Tu foto, logo o frase alrededor de la taza, con vista previa real.",mousepad:"Elige el tamaño real, el color del borde y tu diseño."}[k]||"Color, estampado completo y logos en pecho, espalda o mangas."}</p></div><a class="cta" href=${"#"+SIM_PAGES[k].route}>Abrir personalizador →</a></div></section>`)}
    <section class="section wrap"><${ProductGrid} items=${items} onOpen=${onOpen}/></section></div>`;
}
function CatalogPage({onOpen}){
  return html`<div><${PageHead} title="Catálogo" text="Todos nuestros productos personalizables."/>
    ${CATEGORIES.map(c=>html`<section class="section wrap" key=${c.id} style=${{paddingBottom:0}}>
      <div class="sec-head"><h2>${c.name}</h2><a class="link" href=${"#"+c.id}>Ver ${c.name.toLowerCase()} →</a></div>
      <${ProductGrid} items=${CATALOG.filter(p=>p.cat===c.id)} onOpen=${onOpen}/></section>`)}</div>`;
}
function SearchPage({query, onOpen}){
  const q = query.trim().toLowerCase();
  const res = q ? CATALOG.filter(p=>(p.name+" "+p.desc+" "+p.tag).toLowerCase().includes(q)) : CATALOG;
  return html`<div><${PageHead} title=${q?`Resultados para “${query}”`:"Buscar"} crumb="Búsqueda"/>
    <section class="section wrap">${res.length ? html`<${ProductGrid} items=${res} onOpen=${onOpen}/>` : html`<p class="lead">No encontramos productos con esa palabra.</p>`}</section></div>`;
}
/* Personalizadores 3D: un mismo componente para polos y tazas */
const SIM_PAGES={
  polo:{ route:"polos", model:"polo-model.txt", title:"Personalizador de polos 3D", crumb:"Polos", art:"polo",
    text:"Gira el polo, elige color, aplica un estampado en toda la tela o coloca tus diseños en pecho, espalda y mangas.",
    fallback:{id:"polo-3d",name:"Polo personalizado",price:35,discount:0,cat:""},
    groups:[{label:"Material",values:[["Poliéster",0],["Tacto algodón",5]]},{label:"Cuello",values:[["Camisero",0],["Redondo",0]]},{label:"Talla",values:TALLAS.values.map(v=>[v,0])}],
    name:(o)=>`Polo ${o.Cuello.toLowerCase()} · ${o.Material}` },
  taza:{ route:"tazas-3d", model:"taza-model.txt", title:"Personalizador de tazas 3D", crumb:"Tazas", art:"mug",
    text:"Gira la taza, elige su color, aplica un estampado alrededor o coloca tu foto, logo o frase donde quieras.",
    fallback:{id:"taza-3d",name:"Taza personalizada",price:18,discount:0,cat:""},
    groups:[{label:"Acabado",values:[["Brillante",0],["Mate",2]]},{label:"Caja de regalo",values:[["Sin caja",0],["Con caja",4]]}],
    name:(o)=>`Taza 11 oz · ${o.Acabado}` },
  mousepad:{ route:"mousepads-3d", model:"mousepad-model.txt", title:"Personalizador de mousepads 3D", crumb:"Mousepads", art:"deskmat",
    text:"Elige el tamaño, el color del borde y coloca tu diseño o un estampado en toda la superficie. El modelo 3D cambia al tamaño real.",
    fallback:{id:"mousepad-3d",name:"Mousepad personalizado",price:15,discount:0,cat:""},
    groups:[{label:"Tamaño",values:[["22 × 18 cm",0],["30 × 25 cm",8],["70 × 30 cm",25],["80 × 30 cm",30],["90 × 40 cm",40]]},{label:"Grosor",values:[["3 mm",0],["5 mm",4]]}],
    name:(o)=>`Mousepad ${o["Tamaño"]} · ${o.Grosor}`,
    onSel:(api,o)=>{ const m=/(\d+) × (\d+)/.exec(o["Tamaño"]||""); if(m && api.setSize) api.setSize(+m[1],+m[2]); },
    initial:{"Tamaño":"80 × 30 cm"} }
};
const simKind = p => p && p.sim ? (p.sim===true ? "polo" : p.sim) : null;
const simRoute = p => SIM_PAGES[simKind(p)] ? SIM_PAGES[simKind(p)].route : "polos";
function SimPage({kind, onOpen}){
  const S=SIM_PAGES[kind];
  const host = useRef(null), api = useRef(null);
  const {add} = useCart();
  const [sel,setSel] = useState(()=>Object.fromEntries(S.groups.map(g=>[g.label, (S.initial&&S.initial[g.label]) || (g.label==="Talla"?"M":g.values[0][0])])));
  useEffect(()=>{ if(S.onSel && api.current) S.onSel(api.current, sel); },[sel]);
  const [qty,setQty] = useState(1);
  useEffect(()=>{ api.current = window.PoloSimulator.mount(host.current, S.model, {kind}); if(S.onSel) S.onSel(api.current, sel); return ()=>api.current && api.current.destroy(); },[kind]);
  const p = CATALOG.find(x=>simKind(x)===kind) || S.fallback;
  const extra = S.groups.reduce((t,g)=>t+((g.values.find(v=>v[0]===sel[g.label])||[0,0])[1]),0);
  const unitBase = finalPrice(p) + extra;
  const addItem = () => {
    const s = api.current ? api.current.summary() : {};
    const unit = unitBase + (s.full ? (+CONFIG.fullPrintExtra||0) : 0);
    add({ id:p.id, name:S.name(sel), unit, qty, art:S.art, thumb: api.current && api.current.snapshot(),
      detail:[...S.groups.filter(g=>["Talla","Caja de regalo","Tamaño","Grosor"].includes(g.label)).map(g=>`${g.label} ${sel[g.label]}`), `Color ${s.color||""}`, s.pattern && `Estampado completo: ${s.pattern}`, s.designs && s.designs.length ? `Diseños: ${s.designs.join(", ")}` : "Sin diseños"].filter(Boolean).join(" · ") });
  };
  const cat = CATEGORIES.find(c=>c.id===p.cat);
  return html`<div>
    <${PageHead} title=${S.title} crumb=${(cat?cat.name+" / ":"")+S.crumb} text=${S.text}/>
    <section class="section wrap sim-wrap">
      <div class="sim" ref=${host}></div>
      <div class="buybar">
        <div class="opts">
          ${S.groups.map(g=>html`<div class="field" key=${g.label}>${g.label}<div class="sizes">${g.values.map(([n,x])=>html`<button key=${n} aria-pressed=${sel[g.label]===n} onClick=${()=>setSel({...sel,[g.label]:n})}>${n}${x?` +${money(x)}`:""}</button>`)}</div></div>`)}
          <div class="field">Cantidad<${Qty} value=${qty} set=${setQty}/></div>
        </div>
        <div style=${{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
          <div class="total">${money(unitBase*qty)}<small>${money(unitBase)} c/u${CONFIG.fullPrintExtra>0?` · +${money(CONFIG.fullPrintExtra)} c/u con estampado completo`:""}</small></div>
          <button class="btn primary" onClick=${addItem}>Agregar al carrito</button>
        </div>
      </div>
    </section>
    ${cat && html`<section class="section wrap" style=${{paddingTop:0}}>
      <div class="sec-head"><h2>Más ${cat.name.toLowerCase()}</h2><a class="link" href=${"#"+cat.id}>Ver todo →</a></div>
      <${ProductGrid} items=${CATALOG.filter(x=>x.cat===cat.id&&!x.sim).slice(0,4)} onOpen=${onOpen}/>
    </section>`}
  </div>`;
}
function QuotePage(){
  const {add} = useCart();
  const first = CATALOG[0];
  const [pid,setPid] = useState(first?first.id:""), [qty,setQty] = useState(24), [two,setTwo] = useState(false), [rush,setRush] = useState(false);
  const [company,setCompany] = useState(""), [date,setDate] = useState("");
  const p = productById(pid) || first;
  if(!p) return html`<div><${PageHead} title="Cotizador"/><section class="section wrap"><p class="lead">Aún no hay productos.</p></section></div>`;
  const unit = finalPrice(p) + (two?6:0) + (rush?4:0);
  const off = bulkOff(qty), sub = unit*qty, total = sub*(1-off);
  const msg = `Hola ${CONFIG.name}, quiero cotizar:\n• Producto: ${p.name}\n• Cantidad: ${qty}\n`+(two?"• Diseño a doble cara\n":"")+(rush?"• Entrega urgente\n":"")+
    (company?`• Empresa/evento: ${company}\n`:"")+(date?`• Fecha requerida: ${date}\n`:"")+`\nEstimado: ${money(total)} (${Math.round(off*100)}% OFF)`;
  return html`<div><${PageHead} title="Cotizador para empresas y eventos" crumb="Cotizador" text="Calcula tu presupuesto al instante. El descuento por volumen se aplica solo."/>
    <section class="section wrap"><div class="quote">
      <div class="box">
        <div class="field"><label for="qp">Producto</label><select id="qp" value=${p.id} onChange=${e=>setPid(e.target.value)}>
          ${CATEGORIES.map(c=>html`<optgroup key=${c.id} label=${c.name}>${CATALOG.filter(x=>x.cat===c.id).map(x=>html`<option key=${x.id} value=${x.id}>${x.name} — ${money(finalPrice(x))}</option>`)}</optgroup>`)}</select></div>
        <div class="two"><div class="field">Cantidad<${Qty} value=${qty} set=${setQty}/></div>
          <div class="field"><label for="qd">Fecha requerida</label><input id="qd" class="input" type="date" value=${date} onInput=${e=>setDate(e.target.value)}/></div></div>
        <div class="field"><label for="qc">Empresa o evento (opcional)</label><input id="qc" class="input" type="text" placeholder="Ej.: Aniversario colegio, equipo de ventas…" value=${company} onInput=${e=>setCompany(e.target.value)}/></div>
        <label class="check"><input id="q2" type="checkbox" checked=${two} onChange=${e=>setTwo(e.target.checked)}/> Diseño a doble cara (+${money(6)} c/u)</label>
        <label class="check"><input id="qr" type="checkbox" checked=${rush} onChange=${e=>setRush(e.target.checked)}/> Entrega urgente 48 h (+${money(4)} c/u)</label>
        <div class="tiers" style=${{marginTop:4}}>${[...CONFIG.bulk].sort((a,b)=>a.min-b.min).map(t=>html`<span key=${t.min} class=${"tag "+(qty>=t.min?"pink":"sky")}>${t.min}+ u. · ${t.off}% OFF</span>`)}</div>
      </div>
      <div class="box dark">
        <div style=${{display:"flex",gap:14,alignItems:"center"}}><div class="qthumb"><${ProductMedia} p=${p}/></div><div><h3 style=${{color:"#fff"}}>${p.name}</h3><span style=${{color:"#C9D2E6",fontSize:12.5}}>${qty} unidades</span></div></div>
        <div class="ln"><span>Precio unitario</span><span>${money(unit)}</span></div>
        <div class="ln"><span>Subtotal</span><span>${money(sub)}</span></div>
        <div class="ln"><span>Descuento por volumen</span><span>${off?`−${money(sub*off)} (${Math.round(off*100)}%)`:"—"}</span></div>
        <div class="ln big"><span>Total estimado</span><span>${money(total)}</span></div>
        <div class="ln"><span>Precio final c/u</span><span>${money(total/qty)}</span></div>
        <a class="btn wa block" href=${waLink(msg)} target="_blank" rel="noopener">${Icon.chat} Pedir cotización formal por WhatsApp</a>
        <button class="btn block" onClick=${()=>add({id:p.id,name:p.name,unit,qty,art:p.art,color:p.color,inner:p.inner,photo:p.photo,detail:[two&&"Doble cara",rush&&"Urgente",company].filter(Boolean).join(" · ")||"Pedido por volumen"})}>Agregar al carrito</button>
      </div>
    </div></section></div>`;
}

/*@include admin.js*/

/* ---------- App ---------- */
function App(){
  const hash = useHash();
  const [data,setData] = useState(DEFAULT_DATA);       // lo que se muestra (borrador en vivo)
  const [saved,setSaved] = useState(DEFAULT_DATA);     // última versión publicada
  const [ready,setReady] = useState(false);
  const [canEdit,setCanEdit] = useState(false), [admin,setAdmin] = useState(false), [login,setLogin] = useState(false);
  const [query,setQuery] = useState("");
  useEffect(()=>{ let done=false; const t=setTimeout(()=>{ if(!done){done=true;setReady(true);} },2500);
    loadPublishedData().then(d=>{ if(done&&d===DEFAULT_DATA) return; done=true; clearTimeout(t); setData(d); setSaved(d); setReady(true); }); return ()=>clearTimeout(t); },[]);
  useEffect(()=>{ (async()=>{
    if(FB) return;
    if(IN_CLAUDE){ try{ const u=await claude.use("user"); if(u && await u.canEdit()) setCanEdit(true); }catch(e){} }
    else if(ghLoad()) setCanEdit(true);
  })(); },[]);
  const [authReady,setAuthReady] = useState(!FB);
  useEffect(()=>{ if(!FB) return; return FB.onAuth((u,adm)=>{ setCanEdit(adm); setAuthReady(true); if(!adm) setAdmin(false); }); },[]);
  useEffect(()=>{ if(hash!=="admin" || !authReady) return;
    if(FB){ if(canEdit) setAdmin(true); else setLogin(true); return; }
    if(IN_CLAUDE||ghLoad()) { if(canEdit||!IN_CLAUDE) setAdmin(true); } else setLogin(true); },[hash,canEdit,authReady]);
  applyData(data);
  const routes=[...fixedRoutes,...CATEGORIES.map(c=>c.id)];
  const custom = hash.startsWith("personalizar/") ? productById(decodeURIComponent(hash.slice(13))) : null;
  const route = custom ? custom.cat : routes.includes(hash) ? hash : "inicio";
  const onOpen = p => go(productRoute(p));
  let page;
  if(custom) page=html`<${CustomPage} key=${custom.id} p=${custom} onOpen=${onOpen}/>`;
  else if(route==="inicio") page=html`<${Home} onOpen=${onOpen}/>`;
  else if(route==="catalogo") page=html`<${CatalogPage} onOpen=${onOpen}/>`;
  else if(route==="polos") page=html`<${SimPage} key="polo" kind="polo" onOpen=${onOpen}/>`;
  else if(route==="tazas-3d") page=html`<${SimPage} key="taza" kind="taza" onOpen=${onOpen}/>`;
  else if(route==="mousepads-3d") page=html`<${SimPage} key="mousepad" kind="mousepad" onOpen=${onOpen}/>`;
  else if(route==="cotizador") page=html`<${QuotePage}/>`;
  else if(route==="buscar") page=html`<${SearchPage} query=${query} onOpen=${onOpen}/>`;
  else page=html`<${CategoryPage} cat=${route} onOpen=${onOpen}/>`;
  const dirty = JSON.stringify(data)!==JSON.stringify(saved);
  return html`<${CartProvider}>
    <${TopBar} canEdit=${canEdit} onAdmin=${()=>setAdmin(true)}/>
    <${Header} query=${query} setQuery=${setQuery}/><${Nav} route=${route}/>
    ${canEdit && dirty && !admin && html`<div class="draftbar"><div class="wrap"><span>Estás viendo un <b>borrador</b>: tus clientes aún no ven estos cambios.</span><button class="btn primary" onClick=${()=>setAdmin(true)}>Volver al panel y publicar</button></div></div>`}
    <main key=${custom?hash:route}>${page}</main>
    <${Footer}/>
    <${CartDrawer}/>
    ${admin && html`<${AdminPanel} data=${data} setData=${setData} saved=${saved} setSaved=${setSaved} onClose=${()=>{ setAdmin(false); if(location.hash==="#admin") history.replaceState(null,"",location.pathname+location.search); }} onLogout=${FB?()=>{ FB.signOut(); setAdmin(false); }:IN_CLAUDE?null:()=>{ ghSave(null); setCanEdit(false); setAdmin(false); }}/>`}
    ${login && FB && html`<${GoogleLogin} onClose=${()=>{ setLogin(false); history.replaceState(null,"",location.pathname+location.search); }} onOk=${()=>{ setLogin(false); setCanEdit(true); setAdmin(true); }}/>`}
    ${login && !FB && html`<${GitHubLogin} onClose=${()=>{ setLogin(false); history.replaceState(null,"",location.pathname+location.search); }} onOk=${()=>{ setLogin(false); setCanEdit(true); setAdmin(true); }}/>`}
  <//>`;
}
ReactDOM.createRoot(document.getElementById("root")).render(html`<${App}/>`);
