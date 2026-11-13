/* ---------- Asistente virtual "Tinti" ----------
   Preguntas y respuestas automáticas por palabras clave (sin IA ni servicios pagos).
   Se configura desde el Panel del dueño → pestaña "Asistente" (data.settings.bot). */

const BOT_DEFAULT = {
  name:"Tinti", enabled:true, teaser:true,
  greeting:"¡Hola! Soy {asistente}, el asistente de {nombre}. ¿En qué te ayudo? Puedes escribirme o tocar una opción.",
  hours:"Atendemos de lunes a sábado, de 9 a. m. a 7 p. m.",
  faqs:[
    {q:"¿Cuánto demora mi pedido?", keys:"demora, demoran, tarda, tardan, cuánto tiempo, cuanto tiempo, plazo, cuándo está listo, cuando esta listo, días, urgente, rápido, rapido",
     a:"Tu pedido está listo en 2 a 4 días hábiles después de que apruebes el diseño. Si lo necesitas urgente, lo hacemos en 48 h con un pequeño recargo.", action:""},
    {q:"¿Hacen envíos?", keys:"envío, envio, envían, envian, delivery, despacho, provincia, agencia, olva, shalom, recojo, recoger, llega, a domicilio",
     a:"¡Sí! Hacemos delivery en Lima y enviamos a todo el Perú por agencia. También puedes recoger tu pedido en nuestro taller. Escríbenos y coordinamos el envío.", action:"wa"},
    {q:"Formas de pago", keys:"pago, pagar, pagos, yape, plin, tarjeta, transferencia, depósito, deposito, efectivo, contraentrega, adelanto",
     a:"Aceptamos: {pagos}. Para empezar tu pedido pedimos un adelanto y el saldo se paga al recoger o antes del envío.", action:""},
    {q:"¿Desde cuántas unidades?", keys:"unidades, mínimo, minimo, cantidad mínima, por mayor, al por mayor, mayorista, docena, una sola, solo uno, descuento, descuentos, volumen",
     a:"Trabajamos desde 1 unidad 🙌. Y si pides más, ahorras: {descuentos}.", action:"cotizador"},
    {q:"¿Cómo envío mi diseño?", keys:"diseño, diseno, archivo, imagen, logo, foto, png, jpg, dpi, resolución, resolucion, no tengo diseño, no tengo diseno, plantilla",
     a:"Envíanos tu diseño en PNG o JPG, idealmente a 300 DPI. Puedes subirlo al personalizar el producto o mandarlo por WhatsApp. ¿No tienes diseño? Te ayudamos a crearlo.", action:"wa"},
    {q:"Diseñar en 3D", keys:"3d, simulador, personalizador, diseñar, disenar, vista previa, ver cómo queda, ver como queda, 360",
     a:"Puedes diseñar tu producto y verlo en 3D antes de pedirlo. Elige un personalizador:", action:"3d"},
    {q:"¿Se borra al lavar?", keys:"lavar, lavado, lavadora, se borra, se despinta, destiñe, destine, dura, durabilidad, planchar, plancha, secadora",
     a:"No se borra: en la sublimación la tinta se fusiona con la tela. Para que dure más, lávalo al revés, con agua fría y no planches directo sobre el estampado.", action:""},
    {q:"¿Sirve en polos de algodón u oscuros?", keys:"algodón, algodon, oscuro, oscuros, oscura, negro, negra, poliéster, poliester, qué tela, que tela",
     a:"La sublimación queda mejor en poliéster de color claro. Para algodón o prendas oscuras usamos otra técnica: escríbenos y te recomendamos la mejor opción.", action:"wa"},
    {q:"Pedidos para empresas", keys:"empresa, empresas, corporativo, evento, eventos, uniforme, uniformes, merchandising, mi marca, colegio, promoción, promocion, aniversario, campaña, campana",
     a:"Hacemos polos, tazas, lanyards, libretas y más con tu marca para empresas, colegios y eventos. Descuentos por volumen: {descuentos}. Calcula tu presupuesto al instante en el cotizador.", action:"cotizador"},
    {q:"Horario y ubicación", keys:"horario, hora, abren, atienden, atención, atencion, ubicación, ubicacion, ubicados, dirección, direccion, dónde están, donde estan, taller, local, tienda física",
     a:"{horario} Escríbenos por WhatsApp y coordinamos tu visita al taller o la entrega.", action:"wa"},
  ]
};
const BOT_ACTIONS = [["","Ninguno"],["wa","WhatsApp"],["cotizador","Cotizador"],["3d","Personalizadores 3D"],["catalogo","Catálogo"]];
const botCfg = () => { const b=CONFIG.bot; return b ? {...BOT_DEFAULT, ...b, faqs: Array.isArray(b.faqs)?b.faqs:BOT_DEFAULT.faqs} : BOT_DEFAULT; };

/* Texto normalizado: minúsculas, sin tildes ni signos */
const botNorm = s => " "+(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim()+" ";
const botKeys = k => (Array.isArray(k)?k:String(k||"").split(",")).map(x=>botNorm(x).trim()).filter(Boolean);
const botStem = w => w.length>4 && w.endsWith("es") ? w.slice(0,-2) : w.length>3 && w.endsWith("s") ? w.slice(0,-1) : w;
const BOT_STOP = new Set("de la el los las un una unos unas uno para por con que cual cuales cuanto cuanta cuantos cuantas cuesta cuestan precio precios costo costos vale valen valor me mi mis tu tus su sus hay tienen tienes tiene quiero quisiera queria busco necesito del al en y o a es son esta estan como cuando donde favor porfa hola buenas info informacion sobre algo algun alguna ver tambien muy mas".split(" "));

function botFill(t){
  const c=botCfg();
  const bulk=[...(CONFIG.bulk||[])].sort((a,b)=>a.min-b.min).map(x=>`${x.off}% desde ${x.min} u.`).join(", ");
  return String(t||"")
    .replace(/\{nombre\}/g, CONFIG.name||"la tienda").replace(/\{asistente\}/g, c.name||"Tinti")
    .replace(/\{pagos\}/g, CONFIG.payments||"efectivo y transferencia")
    .replace(/\{descuentos\}/g, bulk||"consulta nuestros descuentos por volumen")
    .replace(/\{whatsapp\}/g, CONFIG.whatsappLabel||"").replace(/\{horario\}/g, c.hours||"")
    .replace(/ u\.\./g," u.");   // "desde 100 u.." → "desde 100 u."
}

/* Productos que coinciden con las palabras del cliente */
function botFindProducts(t){
  const words=t.trim().split(" ").filter(w=>w.length>2 && !BOT_STOP.has(w) && !/^\d+$/.test(w)).map(botStem);
  if(!words.length) return [];
  const hit=(toks,w)=>toks.some(x=>x===w || (w.length>=4 && (x.startsWith(w) || w.startsWith(x) && x.length>=4)));
  return CATALOG.map(p=>{
    const cat=(CATEGORIES.find(c=>c.id===p.cat)||{}).name||"";
    const nameT=botNorm(p.name).trim().split(" ").map(botStem), restT=botNorm(p.desc+" "+cat+" "+(p.tag||"")).trim().split(" ").map(botStem);
    const score=words.reduce((s,w)=>s+(hit(nameT,w)?2:hit(restT,w)?1:0),0);
    return {p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}

/* Decide la respuesta a un mensaje escrito */
function botAnswer(text){
  const c=botCfg(), t=botNorm(text), short=t.trim().split(" ").length<=4;
  if(!t.trim()) return null;
  if(short && /^ (hola|holi|buenas|buenos|buen dia|hey|saludos|que tal|alo) /.test(t)) return {text:botFill(c.greeting)};
  if(/ (gracias|muchas gracias|te agradezco|thank) /.test(t)) return {text:"¡Con gusto! Si necesitas algo más, aquí estoy."};
  if(/ (asesor|asesora|humano|persona|whatsapp|wsp|wasap|llamar|llamada|telefono|celular|hablar con|atencion al cliente) /.test(t))
    return {text:"¡Claro! Un asesor te atiende por WhatsApp. Toca el botón y escríbenos:", action:"wa"};
  const priceAsk=/ (cuanto|precio|precios|cuesta|cuestan|costo|vale|valen|valor|tarifa) /.test(t);
  const found=botFindProducts(t), best=found.length?found[0].score:0;
  let faq=null, fs=0;
  c.faqs.forEach(f=>{ const s=botKeys(f.keys).reduce((n,k)=>n+(t.includes(" "+k+" ")||(k.length>=4&&t.includes(" "+k))?(k.includes(" ")?2:1):0),0); if(s>fs){ fs=s; faq=f; } });
  if(priceAsk && best>=1 && fs<2) return botProducts(found);
  if(faq) return {text:botFill(faq.a), action:faq.action||""};
  if(best>=2) return botProducts(found);
  if(priceAsk) return botPrices();
  return {text:"No estoy seguro de haber entendido 🤔. Prueba con otras palabras o toca una de las opciones de abajo. Si prefieres, un asesor te ayuda por WhatsApp.", action:"wa"};
}
function botProducts(found){
  // Si algún nombre coincide (puntaje ≥ 2), solo se muestran esos; si no, los que coinciden por descripción o categoría
  const min = found[0].score>=2 ? Math.max(2, found[0].score/2) : 1;
  const top=found.filter(x=>x.score>=min).slice(0,4).map(x=>x.p.id);
  return {text: top.length>1?"Esto es lo que encontré 👇":"Encontré esto para ti 👇", products:top};
}
function botPrices(){
  const lines=CATEGORIES.map(c=>{ const ps=CATALOG.filter(p=>p.cat===c.id).map(finalPrice); return ps.length?`• ${c.name}: desde ${money(Math.min(...ps))}`:null; }).filter(Boolean);
  return {text:`Estos son nuestros precios de referencia:\n${lines.join("\n")}\n\nEscríbeme el producto que buscas (por ejemplo "taza") y te muestro el precio exacto.`, action:"catalogo"};
}

/* Mascota: gotita de tinta con carita */
let mascotUid=0;
function Mascot({size=44, mood="happy"}){
  const id=useMemo(()=>"tinti"+(++mascotUid),[]);
  return html`<svg class="mascot" width=${size} height=${size} viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id=${id} x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#3DD0F0"/><stop offset="0.55" stop-color="#3B3FD8"/><stop offset="1" stop-color="#E2457A"/></linearGradient></defs>
    <path d="M32 4 C27 14 12 27 12 40 a20 20 0 0 0 40 0 C52 27 37 14 32 4 Z" fill=${`url(#${id})`}/>
    <ellipse cx="22" cy="26" rx="3.2" ry="6" fill="#fff" opacity=".35" transform="rotate(28 22 26)"/>
    <ellipse cx="32" cy="42" rx="14" ry="11" fill="#fff"/>
    <circle cx="27" cy="40" r="2.3" fill="#1E2638"/><circle cx="37" cy="40" r="2.3" fill="#1E2638"/>
    <circle cx="27.8" cy="39.2" r=".7" fill="#fff"/><circle cx="37.8" cy="39.2" r=".7" fill="#fff"/>
    <ellipse cx="22.5" cy="45" rx="2.6" ry="1.6" fill="#F4A6C0" opacity=".85"/><ellipse cx="41.5" cy="45" rx="2.6" ry="1.6" fill="#F4A6C0" opacity=".85"/>
    ${mood==="think"
      ? html`<path d="M29 47.5 L35 47.5" stroke="#1E2638" stroke-width="1.8" stroke-linecap="round"/>`
      : html`<path d="M28.5 46 Q32 50 35.5 46" fill="none" stroke="#1E2638" stroke-width="1.8" stroke-linecap="round"/>`}
  </svg>`;
}

/* La conversación vive fuera del componente: se mantiene al navegar y al reabrir */
let BOT_LOG = [];
let botMsgId = 0;
const TEASER_KEY = "tinti-teaser";

function BotAction({action, close}){
  if(!action) return null;
  const go = () => { if(window.innerWidth<=520) close(); };
  if(action==="wa") return html`<div class="bot-acts"><a class="bot-btn wa" href=${waLink("Hola, vengo del asistente de la tienda y tengo una consulta.")} target="_blank" rel="noopener">${Icon.chat} Hablar por WhatsApp</a></div>`;
  if(action==="cotizador") return html`<div class="bot-acts"><a class="bot-btn" href="#cotizador" onClick=${go}>Abrir cotizador →</a></div>`;
  if(action==="catalogo") return html`<div class="bot-acts"><a class="bot-btn" href="#catalogo" onClick=${go}>Ver catálogo →</a></div>`;
  if(action==="3d") return html`<div class="bot-acts">${Object.values(SIM_PAGES).map(s=>html`<a key=${s.route} class="bot-btn" href=${"#"+s.route} onClick=${go}>${s.crumb} 3D →</a>`)}</div>`;
  return null;
}
function BotProducts({ids, onOpen, close}){
  const list=ids.map(id=>CATALOG.find(p=>p.id===id)).filter(Boolean);
  if(!list.length) return null;
  const go = () => { if(window.innerWidth<=520) close(); };
  return html`<div class="bot-prods">${list.map(p=>html`<div class="bot-prod" key=${p.id}>
    <div class="bp-ph"><${ProductMedia} p=${p}/></div>
    <div class="bp-info"><b>${p.name}</b><span>${money(finalPrice(p))}${p.discount>0 && html` <em>−${p.discount}%</em>`}</span></div>
    ${p.sim ? html`<a class="bot-btn sm" href=${"#"+simRoute(p)} onClick=${go}>Diseñar</a>`
            : html`<button class="bot-btn sm" onClick=${()=>{ go(); onOpen(p); }}>Ver</button>`}
  </div>`)}</div>`;
}

function ChatBot({onOpen}){
  const c=botCfg();
  const [open,setOpen]=useState(false), [msgs,setMsgs]=useState(BOT_LOG), [typing,setTyping]=useState(false);
  const [input,setInput]=useState(""), [teaser,setTeaser]=useState(false);
  const listRef=useRef(null), inputRef=useRef(null), timer=useRef(null);
  const push = m => setMsgs(prev=>{ const n=[...prev,{id:++botMsgId,...m}]; BOT_LOG=n; return n; });
  const reply = make => { setTyping(true); clearTimeout(timer.current);
    timer.current=setTimeout(()=>{ setTyping(false); const r=make(); if(r) push({from:"bot",...r}); }, 600+Math.random()*800); };
  const chips = [
    ...c.faqs.slice(0,5).map((f,i)=>({label:f.q, run:()=>({text:botFill(f.a), action:f.action||""})})),
    {label:"Ver precios", run:botPrices},
    {label:"Hablar con un asesor", run:()=>({text:"¡Claro! Un asesor te atiende por WhatsApp. Toca el botón y escríbenos:", action:"wa"})},
  ];
  const openChat = () => { setOpen(true); setTeaser(false); if(!BOT_LOG.length) reply(()=>({text:botFill(c.greeting)})); };
  const close = () => setOpen(false);
  const send = e => { e && e.preventDefault(); const t=input.trim(); if(!t) return; setInput(""); push({from:"user",text:t}); reply(()=>botAnswer(t)); };
  const chip = ch => { push({from:"user",text:ch.label}); reply(ch.run); };
  // Burbuja de saludo a los 6 s (una vez por sesión)
  useEffect(()=>{ if(!c.teaser) return; let seen=false; try{ seen=!!sessionStorage.getItem(TEASER_KEY); }catch(e){}
    if(seen) return; const t=setTimeout(()=>{ setTeaser(true); try{ sessionStorage.setItem(TEASER_KEY,"1"); }catch(e){} },6000); return ()=>clearTimeout(t); },[]);
  useEffect(()=>{ const el=listRef.current; if(el) el.scrollTop=el.scrollHeight; },[msgs,typing,open]);
  useEffect(()=>{ if(!open) return; const k=e=>{ if(e.key==="Escape") close(); }; addEventListener("keydown",k);
    if(window.innerWidth>520 && inputRef.current) inputRef.current.focus(); return ()=>removeEventListener("keydown",k); },[open]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  if(c.enabled===false) return null;
  return html`<div class=${"bot-root"+(open?" is-open":"")}>
    ${teaser && !open && html`<div class="bot-teaser" role="status">
      <button class="bt-txt" onClick=${openChat}>¡Hola! Soy ${c.name} 👋 ¿Te ayudo con tu pedido?</button>
      <button class="bt-x" onClick=${()=>setTeaser(false)} aria-label="Cerrar saludo">×</button></div>`}
    ${open && html`<section class="bot-panel" role="dialog" aria-label=${"Asistente "+c.name}>
      <header class="bot-head"><${Mascot} size=${40} mood=${typing?"think":"happy"}/>
        <div class="bh-txt"><b>${c.name}</b><small>Asistente de ${CONFIG.name} · responde al instante</small></div>
        <button class="bh-x" onClick=${close} aria-label="Cerrar asistente">×</button></header>
      <div class="bot-msgs" ref=${listRef} aria-live="polite">
        ${msgs.map(m=>m.from==="bot"
          ? html`<div class="bot-msg from-bot" key=${m.id}><span class="bm-av"><${Mascot} size=${26}/></span>
              <div class="bm-body"><div class="bubble">${m.text}</div>
                ${m.products && html`<${BotProducts} ids=${m.products} onOpen=${onOpen} close=${close}/>`}
                <${BotAction} action=${m.action} close=${close}/></div></div>`
          : html`<div class="bot-msg from-user" key=${m.id}><div class="bubble">${m.text}</div></div>`)}
        ${typing && html`<div class="bot-msg from-bot"><span class="bm-av"><${Mascot} size=${26} mood="think"/></span>
          <div class="bubble typing" aria-label="escribiendo"><i></i><i></i><i></i></div></div>`}
      </div>
      <div class="bot-chips">${chips.map((ch,i)=>html`<button key=${i} onClick=${()=>chip(ch)} disabled=${typing}>${ch.label}</button>`)}</div>
      <form class="bot-input" onSubmit=${send}>
        <input ref=${inputRef} value=${input} onInput=${e=>setInput(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Escribe tu pregunta" maxlength="300"/>
        <button type="submit" disabled=${!input.trim()} aria-label="Enviar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg></button>
      </form>
    </section>`}
    <button class="bot-fab" onClick=${()=>open?close():openChat()} aria-label=${open?"Cerrar asistente":"Abrir asistente "+c.name} aria-expanded=${open}>
      <span class="bf-m"><${Mascot} size=${46}/></span></button>
  </div>`;
}
