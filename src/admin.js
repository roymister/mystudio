/* ---------- Panel del dueño (editar sin tocar código) ---------- */
const ART_CHOICES=[["polo","Polo camisero"],["tee","Camiseta / polo cuello redondo"],["hoodie","Polera / buzo"],["jacket","Casaca"],["cap","Gorra"],["socks","Medias"],["bandana","Bandana"],["mask","Mascarilla"],["apron","Mandil"],["towel","Toalla"],
  ["mug","Taza"],["conical","Taza cónica"],["enamel","Taza enlozada"],["bottle","Botella / termo"],["chop","Chop"],["glass","Vaso"],["tote","Tote bag"],["gymsack","Gymsack"],["pencil","Cartuchera"],["case","Carcasa celular"],["pettag","Placa mascota"],
  ["mousepad","Mousepad"],["deskmat","Desk mat"],["lanyard","Lanyard"],["notebook","Libreta"],["coaster","Portavasos"],["pillow","Cojín"],["keychain","Llavero"],["puzzle","Rompecabezas"],["plate","Placa aluminio"],["slate","Roca pizarra"],["magnet","Imán"],["sandal","Sandalia"],["fan","Abanico"]];
const DRAFT_KEY="sublipro-draft-v1";
const clone=o=>JSON.parse(JSON.stringify(o));

function Field({label, children, hint}){ return html`<label class="af"><span>${label}</span>${children}${hint && html`<small>${hint}</small>`}</label>`; }

/* Ventana para ajustar una foto antes de guardarla: vista previa cuadrada (como se verá en la tienda),
   arrastrar para encuadrar, zoom, y "Ver completa" para no recortar (rellena con blanco). */
function ImageCropper({file, title="Ajustar foto", size=900, quality=0.82, count, onDone, onSkip, onCancel}){
  const F=300;                                            // tamaño del marco en pantalla (px)
  const [img,setImg]=useState(null), [err,setErr]=useState("");
  const [z,setZ]=useState(1), [o,setO]=useState({x:0,y:0});
  const drag=useRef(null);
  useEffect(()=>{ const u=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ setImg(im); setZ(1); setO({x:0,y:0}); }; im.onerror=()=>setErr("No se pudo leer esa imagen. Prueba con un JPG o PNG.");
    im.src=u; return ()=>URL.revokeObjectURL(u); },[file]);
  useEffect(()=>{ const k=e=>{ if(e.key==="Escape") onCancel(); }; addEventListener("keydown",k); return ()=>removeEventListener("keydown",k); },[]);
  const base = img ? Math.max(F/img.width, F/img.height) : 1;            // z=1: llena el cuadro
  const fit  = img ? Math.min(F/img.width, F/img.height)/base : 1;       // z mínimo: foto completa
  const s = base*z, w = img?img.width*s:0, h = img?img.height*s:0;
  const clamp = (p,zz=z) => { if(!img) return p; const ww=img.width*base*zz, hh=img.height*base*zz;
    const cx = ww>F ? Math.max(-(ww-F)/2, Math.min((ww-F)/2, p.x)) : 0, cy = hh>F ? Math.max(-(hh-F)/2, Math.min((hh-F)/2, p.y)) : 0; return {x:cx,y:cy}; };
  const zoom = v => { setZ(v); setO(p=>clamp(p,v)); };
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current={x:e.clientX-o.x, y:e.clientY-o.y}; };
  const move = e => { if(drag.current) setO(clamp({x:e.clientX-drag.current.x, y:e.clientY-drag.current.y})); };
  const up = () => { drag.current=null; };
  const save = () => { const c=document.createElement("canvas"); c.width=c.height=size; const k=size/F, x=c.getContext("2d");
    x.fillStyle="#fff"; x.fillRect(0,0,size,size); x.imageSmoothingQuality="high";
    x.drawImage(img, (F/2+o.x-w/2)*k, (F/2+o.y-h/2)*k, w*k, h*k); onDone(c.toDataURL("image/jpeg",quality)); };
  return html`<div class="overlay crop-ov" onClick=${e=>{ if(e.target===e.currentTarget) onCancel(); }}>
    <div class="cropper" role="dialog" aria-modal="true" aria-label=${title}>
      <header><h3>${title}${count?html` <small>${count}</small>`:""}</h3><button class="x" style=${{position:"static"}} onClick=${onCancel} aria-label="Cerrar">×</button></header>
      ${err ? html`<p class="err">${err}</p>` : html`
        <div class="crop-frame" style=${{width:F,height:F}} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}>
          ${img && html`<img src=${img.src} alt="" draggable="false" style=${{width:w,height:h,transform:`translate(-50%,-50%) translate(${o.x}px,${o.y}px)`}}/>`}
          <div class="crop-grid" aria-hidden="true"></div>
        </div>
        <small class="crop-tip">Arrastra la foto para encuadrarla. Así se verá en la tienda.</small>
        <label class="cz-range"><span>Zoom</span><input type="range" min=${fit.toFixed(3)} max="4" step="0.01" value=${z} onInput=${e=>zoom(+e.target.value)}/></label>
        <div class="crop-quick">
          <button class="btn sm" onClick=${()=>{ setZ(fit); setO({x:0,y:0}); }}>Ver completa</button>
          <button class="btn sm" onClick=${()=>{ setZ(1); setO({x:0,y:0}); }}>Llenar el cuadro</button>
        </div>`}
      <div class="crop-acts">
        ${onSkip && html`<button class="btn" onClick=${onSkip}>Omitir esta</button>`}
        <button class="btn" onClick=${onCancel}>Cancelar</button>
        <button class="btn primary" disabled=${!img} onClick=${save}>Usar foto</button>
      </div>
    </div></div>`;
}

function PhotoInput({value, onChange, label="Foto"}){
  const [busy,setBusy]=useState(false), [err,setErr]=useState(""), [showUrl,setShowUrl]=useState(false), [url,setUrl]=useState("");
  const [file,setFile]=useState(null);
  const pick=e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return; setErr(""); setFile(f); };
  return html`<div class="af"><span>${label}</span><div class="photo-in">
    <div class="pv">${value?html`<${Photo} src=${value} fallback=${html`<small>No carga</small>`}/>`:html`<small>Sin foto</small>`}</div>
    <div style=${{display:"flex",flexDirection:"column",gap:6}}>
      <label class="btn">${busy?"Procesando…":value?"Cambiar foto":"Subir foto"}<input type="file" accept="image/*" onChange=${pick} hidden/></label>
      <button class="btn" onClick=${()=>setShowUrl(!showUrl)}>Pegar enlace</button>
      ${value && html`<button class="btn" onClick=${()=>onChange(null)}>Quitar foto</button>`}
    </div></div>
    ${showUrl && html`<div class="two"><input class="input" placeholder="https://… (enlace directo a la imagen)" value=${url} onInput=${e=>setUrl(e.target.value)}/><button class="btn" onClick=${()=>{ if(/^https:\/\/\S+$/.test(url.trim())){ onChange(url.trim()); setShowUrl(false); setUrl(""); setErr(""); } else setErr("Pega un enlace que empiece con https://"); }}>Usar enlace</button></div>`}
    ${err && html`<small class="err">${err}</small>`}
    ${file && html`<${ImageCropper} file=${file} title="Ajustar foto del producto" onDone=${d=>{ onChange(d); setFile(null); }} onCancel=${()=>setFile(null)}/>`}</div>`;
}
/* Modelos listos: fotos de trabajos ya hechos que el cliente ve en un carrusel */
const MAX_MODELS=8;
function ModelsInput({value, onChange}){
  const list=value||[];
  const [err,setErr]=useState(""), [queue,setQueue]=useState([]), [total,setTotal]=useState(0);
  const pick=e=>{ const files=[...e.target.files]; e.target.value=""; if(!files.length) return;
    const room=MAX_MODELS-list.length; if(room<=0){ setErr(`Máximo ${MAX_MODELS} modelos por producto.`); return; }
    setErr(files.length>room?`Solo se agregarán ${room}: el máximo es ${MAX_MODELS} modelos por producto.`:"");
    const q=files.slice(0,room); setQueue(q); setTotal(q.length); };
  // Cada foto pasa por la ventana de ajuste, una tras otra
  const listRef=useRef(list); listRef.current=list;
  const next=()=>setQueue(q=>q.slice(1));
  const done=d=>{ onChange([...listRef.current,d]); next(); };
  const move=(i,d)=>{ const n=[...list], j=i+d; if(j<0||j>=n.length) return; [n[i],n[j]]=[n[j],n[i]]; onChange(n); };
  return html`<div class="af"><span>Modelos listos (fotos de trabajos ya hechos que el cliente puede elegir)</span>
    <div class="models-in">
      ${list.map((m,i)=>html`<div class="mi" key=${i}><img src=${m} alt=${"Modelo "+(i+1)}/>
        <div class="mi-acts"><button class="btn sm" onClick=${()=>move(i,-1)} disabled=${i===0} aria-label="Mover a la izquierda">←</button>
          <button class="btn danger sm" onClick=${()=>onChange(list.filter((_,k)=>k!==i))} aria-label="Quitar modelo">×</button>
          <button class="btn sm" onClick=${()=>move(i,1)} disabled=${i===list.length-1} aria-label="Mover a la derecha">→</button></div></div>`)}
      ${list.length<MAX_MODELS && html`<label class="mi add">+ Agregar fotos<input type="file" accept="image/*" multiple onChange=${pick} hidden/></label>`}
    </div>
    <small>${list.length}/${MAX_MODELS} · Puedes elegir varias fotos a la vez; cada una se abre para ajustarla. El cliente las ve en un carrusel.</small>
    ${err && html`<small class="err">${err}</small>`}
    ${queue.length>0 && html`<${ImageCropper} key=${total-queue.length} file=${queue[0]} size=${700} quality=${0.8} title="Ajustar modelo"
      count=${total>1?`${total-queue.length+1} de ${total}`:""} onDone=${done} onSkip=${total>1?next:null} onCancel=${()=>setQueue([])}/>`}</div>`;
}
function ConfirmButton({label="Eliminar", ask="¿Eliminar?", onYes}){
  const [c,setC]=useState(false);
  return c ? html`<span class="confirm">${ask} <button class="btn danger sm" onClick=${()=>{setC(false);onYes();}}>Sí</button><button class="btn sm" onClick=${()=>setC(false)}>No</button></span>`
           : html`<button class="btn danger sm" onClick=${()=>setC(true)}>${label}</button>`;
}

function ProductEditor({p, cats, onChange, onClose}){
  const set=(k,v)=>onChange({...p,[k]:v});
  return html`<div class="aedit">
    <div class="agrid">
      <${Field} label="Nombre"><input class="input" value=${p.name} onInput=${e=>set("name",e.target.value)}/><//>
      <${Field} label="Categoría"><select value=${p.cat} onChange=${e=>set("cat",e.target.value)}>${cats.map(c=>html`<option key=${c.id} value=${c.id}>${c.name}</option>`)}</select><//>
      <${Field} label=${`Precio (${CONFIG.currency})`}><input class="input" type="number" min="0" step="0.5" value=${p.price} onInput=${e=>set("price",Math.max(0,+e.target.value||0))}/><//>
      <${Field} label="Descuento (%)" hint=${p.discount>0?`Precio final: ${money(finalPrice(p))}`:"0 = sin oferta"}><input class="input" type="number" min="0" max="90" step="1" value=${p.discount||0} onInput=${e=>set("discount",Math.min(90,Math.max(0,parseInt(e.target.value)||0)))}/><//>
      <${Field} label="Etiqueta" hint="Ej.: Nuevo, Más vendido (opcional)"><input class="input" value=${p.tag||""} onInput=${e=>set("tag",e.target.value)}/><//>
      <${Field} label="Opciones para el cliente" hint="Nombre de la opción y valores separados por comas"><div class="two"><input class="input" placeholder="Ej.: Talla" value=${p.options?p.options.label:""} onInput=${e=>set("options",{label:e.target.value,values:p.options?p.options.values:[]})}/>
        <input class="input" placeholder="S, M, L, XL" value=${p.options?p.options.values.join(", "):""} onInput=${e=>set("options",{label:p.options?p.options.label:"Opción",values:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/></div><//>
    </div>
    <${Field} label="Descripción"><textarea value=${p.desc} onInput=${e=>set("desc",e.target.value)}></textarea><//>
    <div class="agrid">
      <${PhotoInput} value=${p.photo} onChange=${v=>set("photo",v)}/>
      <div class="af"><span>Ilustración (si no hay foto)</span><div class="photo-in"><div class="pv">${html`<${ProductArt} type=${p.art} color=${p.color} inner=${p.inner} thermo=${p.thermo}/>`}</div>
        <div style=${{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:0}}><select value=${p.art} onChange=${e=>set("art",e.target.value)}>${ART_CHOICES.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select>
        <label class="inline">Color <input type="color" value=${(p.color||"#ffffff").toLowerCase()} onInput=${e=>set("color",e.target.value.toUpperCase())}/></label></div></div></div>
    </div>
    <${ModelsInput} value=${p.models} onChange=${v=>set("models",v)}/>
    <div class="arow">
      <label class="check"><input type="checkbox" checked=${!p.hidden} onChange=${e=>set("hidden",!e.target.checked)}/> Visible en la tienda</label>
      <label class="check"><input type="checkbox" checked=${!!p.featured} onChange=${e=>set("featured",e.target.checked)}/> Mostrar en "Los más pedidos"</label>
      <label class="inline">Personalizador 3D <select value=${simKind(p)||""} onChange=${e=>set("sim",e.target.value||false)}><option value="">Ninguno</option><option value="polo">Polo</option><option value="taza">Taza</option><option value="mousepad">Mousepad</option></select></label>
      <button class="btn primary sm" style=${{marginLeft:"auto"}} onClick=${onClose}>Listo</button>
    </div>
  </div>`;
}

/* Filtros rápidos del listado de productos (también son las tarjetas del resumen) */
const P_FILTERS=[
  ["all","Total",p=>true],
  ["visible","Visibles",p=>!p.hidden],
  ["hidden","Ocultos",p=>!!p.hidden],
  ["featured","Destacados",p=>!!p.featured],
  ["offer","Con oferta",p=>p.discount>0],
  ["sim","Con 3D",p=>!!p.sim],
  ["models","Con modelos",p=>(p.models||[]).length>0],
  ["nophoto","Sin foto",p=>!p.photo],
];
const SIM_NAMES={polo:"Polo 3D",taza:"Taza 3D",mousepad:"Mousepad 3D"};
function ProductsTab({d, update}){
  const [q,setQ]=useState(""), [cat,setCat]=useState("all"), [open,setOpen]=useState(null);
  const [state,setState]=useState("all"), [sort,setSort]=useState("store");
  const catName=id=>(d.categories.find(c=>c.id===id)||{name:"Sin categoría"}).name;
  const test=(P_FILTERS.find(f=>f[0]===state)||P_FILTERS[0])[2];
  const qq=q.trim().toLowerCase();
  let list=d.products.filter(p=>(cat==="all"||p.cat===cat) && test(p) && (!qq || (p.name+" "+(p.desc||"")+" "+(p.tag||"")).toLowerCase().includes(qq)));
  if(sort==="name") list=[...list].sort((a,b)=>a.name.localeCompare(b.name,"es"));
  if(sort==="up") list=[...list].sort((a,b)=>finalPrice(a)-finalPrice(b));
  if(sort==="down") list=[...list].sort((a,b)=>finalPrice(b)-finalPrice(a));
  const inCat=d.products.filter(p=>cat==="all"||p.cat===cat);
  const change=np=>update(x=>{ x.products=x.products.map(p=>p.id===np.id?np:p); });
  const toggle=(p,k)=>update(x=>{ const y=x.products.find(z=>z.id===p.id); if(y) y[k]=!y[k]; });
  const move=(p,k)=>update(x=>{ const i=x.products.findIndex(y=>y.id===p.id), j=i+k; if(i<0||j<0||j>=x.products.length) return; [x.products[i],x.products[j]]=[x.products[j],x.products[i]]; });
  const addNew=()=>{ const id=uniqueId("producto nuevo",d.products.map(p=>p.id));
    const c=cat!=="all"?cat:(d.categories[0]&&d.categories[0].id);
    update(x=>{ x.products.unshift({id,cat:c,name:"Producto nuevo",price:20,discount:0,desc:"Describe aquí el producto.",tag:"Nuevo",art:"tee",color:"#FFFFFF",inner:null,thermo:false,pattern:false,options:null,photo:null,featured:false,hidden:false,sim:false}); });
    setState("all"); setOpen(id); };
  const dup=p=>{ const id=uniqueId(p.name+" copia",d.products.map(x=>x.id)); update(x=>{ const i=x.products.findIndex(y=>y.id===p.id); x.products.splice(i+1,0,{...clone(p),id,name:p.name+" (copia)",sim:false}); }); setOpen(id); };
  const prices=inCat.map(finalPrice);
  return html`<div class="atab">
    <div class="pstats">${P_FILTERS.map(([k,l,f])=>{ const n=inCat.filter(f).length;
      return html`<button key=${k} class=${"pstat"+(k==="nophoto"&&n?" warn":"")} aria-pressed=${state===k} onClick=${()=>setState(state===k&&k!=="all"?"all":k)}><b>${n}</b><span>${l}</span></button>`; })}</div>
    ${prices.length>0 && html`<p class="note-cfg">${cat==="all"?"Toda la tienda":catName(cat)} · precios desde ${money(Math.min(...prices))} hasta ${money(Math.max(...prices))} · promedio ${money(prices.reduce((a,b)=>a+b,0)/prices.length)}</p>`}
    <div class="atools"><input class="input" placeholder="Buscar por nombre, descripción o etiqueta…" value=${q} onInput=${e=>setQ(e.target.value)}/>
      <select value=${cat} onChange=${e=>setCat(e.target.value)} aria-label="Categoría"><option value="all">Todas las categorías</option>${d.categories.map(c=>html`<option key=${c.id} value=${c.id}>${c.name} (${d.products.filter(p=>p.cat===c.id).length})</option>`)}</select>
      <select value=${sort} onChange=${e=>setSort(e.target.value)} aria-label="Ordenar"><option value="store">Orden de la tienda</option><option value="name">Nombre A–Z</option><option value="up">Precio: menor a mayor</option><option value="down">Precio: mayor a menor</option></select>
      <button class="btn primary" onClick=${addNew} disabled=${!d.categories.length}>+ Nuevo producto</button></div>
    <p class="note-cfg">Mostrando ${list.length} de ${d.products.length} productos${state!=="all"?` · filtro: ${P_FILTERS.find(f=>f[0]===state)[1].toLowerCase()}`:""}${(state!=="all"||cat!=="all"||qq)?html` · <button class="linkbtn" onClick=${()=>{ setState("all"); setCat("all"); setQ(""); }}>Quitar filtros</button>`:""}</p>
    <div class="alist">${list.map(p=>{ const fp=finalPrice(p), nm=(p.models||[]).length, opts=p.options&&p.options.values&&p.options.values.length?p.options:null;
      return html`<div class=${"arow-item"+(p.hidden?" off":"")} key=${p.id}>
      <div class="ahead pro">
        <div class="th"><${Photo} src=${p.photo} fallback=${html`<${ProductArt} type=${p.art} color=${p.color} inner=${p.inner} thermo=${p.thermo}/>`}/></div>
        <div class="meta">
          <div class="pname"><b>${p.name}</b>${p.tag && html`<span class="tag pink">${p.tag}</span>`}</div>
          <small>${catName(p.cat)} · ID: ${p.id}</small>
          <div class="pbadges">
            <span class=${"pb "+(p.hidden?"bad":"ok")}>${p.hidden?"Oculto":"Visible"}</span>
            ${p.featured && html`<span class="pb star">★ Destacado</span>`}
            ${p.sim && html`<span class="pb info">${SIM_NAMES[simKind(p)]||"3D"}</span>`}
            ${nm>0 && html`<span class="pb info">${nm} modelo${nm>1?"s":""}</span>`}
            ${opts && html`<span class="pb" title=${opts.values.join(", ")}>${opts.label}: ${opts.values.length} opciones</span>`}
            ${!p.photo && html`<span class="pb warn">Sin foto</span>`}
            ${!(p.desc||"").trim() && html`<span class="pb warn">Sin descripción</span>`}
          </div>
        </div>
        <div class="pprice"><b>${money(fp)}</b>${p.discount>0 && html`<small><s>${money(p.price)}</s> <span class="tag off">−${p.discount}%</span></small>`}</div>
        <div class="acts">
          <button class=${"btn sm qt"+(p.hidden?"":" on")} onClick=${()=>toggle(p,"hidden")} title=${p.hidden?"Mostrar en la tienda":"Ocultar de la tienda"} aria-label=${p.hidden?"Mostrar en la tienda":"Ocultar de la tienda"}>${p.hidden?"🙈":"👁"}</button>
          <button class=${"btn sm qt"+(p.featured?" on":"")} onClick=${()=>toggle(p,"featured")} title=${p.featured?"Quitar de destacados":"Marcar como destacado"} aria-label=${p.featured?"Quitar de destacados":"Marcar como destacado"}>${p.featured?"★":"☆"}</button>
          ${sort==="store" && html`<button class="btn sm" onClick=${()=>move(p,-1)} title="Subir en la tienda" aria-label="Subir">↑</button><button class="btn sm" onClick=${()=>move(p,1)} title="Bajar en la tienda" aria-label="Bajar">↓</button>`}
          <button class="btn sm" onClick=${()=>setOpen(open===p.id?null:p.id)}>${open===p.id?"Cerrar":"Editar"}</button>
          <button class="btn sm" onClick=${()=>dup(p)}>Duplicar</button>
          <a class="btn sm" href=${"#"+productRoute(p)} target="_blank" rel="noopener" title="Ver en la tienda">Ver</a>
          <${ConfirmButton} onYes=${()=>update(x=>{ x.products=x.products.filter(y=>y.id!==p.id); })}/></div>
      </div>
      ${open===p.id && html`<${ProductEditor} p=${p} cats=${d.categories} onChange=${change} onClose=${()=>setOpen(null)}/>`}
    </div>`; })}${!list.length && html`<p class="note-cfg">No hay productos con ese filtro.</p>`}</div>
  </div>`;
}

function CategoriesTab({d, update}){
  const move=(i,k)=>update(x=>{ const j=i+k; if(j<0||j>=x.categories.length) return; [x.categories[i],x.categories[j]]=[x.categories[j],x.categories[i]]; });
  const set=(i,k,v)=>update(x=>{ x.categories[i][k]=v; });
  const addNew=()=>update(x=>{ x.categories.push({id:uniqueId("categoria nueva",[...x.categories.map(c=>c.id),...fixedRoutes,"admin"]),name:"Categoría nueva",blurb:"Describe esta categoría.",art:"tee",photo:null}); });
  return html`<div class="atab">
    <div class="atools"><button class="btn primary" onClick=${addNew}>+ Nueva categoría</button></div>
    <div class="alist">${d.categories.map((c,i)=>{ const n=d.products.filter(p=>p.cat===c.id).length;
      return html`<div class="arow-item" key=${c.id}><div class="aedit" style=${{borderTop:0}}>
        <div class="agrid">
          <${Field} label="Nombre"><input class="input" value=${c.name} onInput=${e=>set(i,"name",e.target.value)}/><//>
          <${Field} label="Descripción corta"><input class="input" value=${c.blurb} onInput=${e=>set(i,"blurb",e.target.value)}/><//>
          <${PhotoInput} value=${c.photo} onChange=${v=>set(i,"photo",v)} label="Foto de la categoría"/>
          <${Field} label="Ilustración (si no hay foto)"><select value=${c.art} onChange=${e=>set(i,"art",e.target.value)}>${ART_CHOICES.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select><//>
        </div>
        <div class="arow"><span class="note-cfg">${n} producto(s)</span>
          <button class="btn sm" onClick=${()=>move(i,-1)} disabled=${i===0}>↑ Subir</button><button class="btn sm" onClick=${()=>move(i,1)} disabled=${i===d.categories.length-1}>↓ Bajar</button>
          ${n>0 ? html`<span class="note-cfg" style=${{marginLeft:"auto"}}>Para eliminarla, primero mueve o borra sus productos.</span>` : html`<span style=${{marginLeft:"auto"}}><${ConfirmButton} onYes=${()=>update(x=>{ x.categories.splice(i,1); })}/></span>`}</div>
      </div></div>`; })}</div>
  </div>`;
}

function SlidesTab({d, update}){
  const dests=[["inicio","Inicio"],["catalogo","Catálogo"],["polos","Polos 3D"],["tazas-3d","Tazas 3D"],["mousepads-3d","Mousepads 3D"],["cotizador","Cotizador"],...d.categories.map(c=>[c.id,c.name])];
  const set=(i,k,v)=>update(x=>{ x.slides[i][k]=v; });
  const setCta=(i,k,j,v)=>update(x=>{ const a=(x.slides[i][k]||["",""]).slice(); a[j]=v; x.slides[i][k]=a; });
  const move=(i,k)=>update(x=>{ const j=i+k; if(j<0||j>=x.slides.length) return; [x.slides[i],x.slides[j]]=[x.slides[j],x.slides[i]]; });
  return html`<div class="atab">
    <div class="atools"><button class="btn primary" onClick=${()=>update(x=>{ x.slides.push({kicker:"Promoción",title:"Nuevo título",text:"Texto de la promoción.",cta:["Ver catálogo","catalogo"],cta2:["",""],art:"tee",bg1:"#1E2638",bg2:"#2B2F7A",photo:null}); })}>+ Nueva diapositiva</button></div>
    <div class="alist">${d.slides.map((s,i)=>html`<div class="arow-item" key=${i}><div class="aedit" style=${{borderTop:0}}>
      <div class="slide-pv" style=${{background:`linear-gradient(115deg,${s.bg1} 30%,${s.bg2})`}}><div><small>${s.kicker}</small><b>${s.title}</b></div><div class="spv-art">${s.photo?html`<img src=${s.photo} alt=""/>`:html`<${ProductArt} type=${s.art}/>`}</div></div>
      <div class="agrid">
        <${Field} label="Texto pequeño superior"><input class="input" value=${s.kicker} onInput=${e=>set(i,"kicker",e.target.value)}/><//>
        <${Field} label="Título"><input class="input" value=${s.title} onInput=${e=>set(i,"title",e.target.value)}/><//>
      </div>
      <${Field} label="Texto"><textarea value=${s.text} onInput=${e=>set(i,"text",e.target.value)}></textarea><//>
      <div class="agrid">
        <${Field} label="Botón principal"><div class="two"><input class="input" placeholder="Texto del botón" value=${(s.cta||[])[0]||""} onInput=${e=>setCta(i,"cta",0,e.target.value)}/><select value=${(s.cta||[])[1]||"inicio"} onChange=${e=>setCta(i,"cta",1,e.target.value)}>${dests.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select></div><//>
        <${Field} label="Botón secundario (opcional)"><div class="two"><input class="input" placeholder="Texto del botón" value=${(s.cta2||[])[0]||""} onInput=${e=>setCta(i,"cta2",0,e.target.value)}/><select value=${(s.cta2||[])[1]||"inicio"} onChange=${e=>setCta(i,"cta2",1,e.target.value)}>${dests.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select></div><//>
        <${PhotoInput} value=${s.photo} onChange=${v=>set(i,"photo",v)} label="Imagen (opcional)"/>
        <div class="af"><span>Ilustración y colores de fondo</span><div class="two"><select value=${s.art} onChange=${e=>set(i,"art",e.target.value)}>${ART_CHOICES.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select>
          <span style=${{display:"flex",gap:8,alignItems:"center"}}><input type="color" value=${s.bg1.toLowerCase()} onInput=${e=>set(i,"bg1",e.target.value)} aria-label="Color 1"/><input type="color" value=${s.bg2.toLowerCase()} onInput=${e=>set(i,"bg2",e.target.value)} aria-label="Color 2"/></span></div></div>
      </div>
      <div class="arow"><button class="btn sm" onClick=${()=>move(i,-1)} disabled=${i===0}>↑ Subir</button><button class="btn sm" onClick=${()=>move(i,1)} disabled=${i===d.slides.length-1}>↓ Bajar</button>
        <span style=${{marginLeft:"auto"}}><${ConfirmButton} onYes=${()=>update(x=>{ x.slides.splice(i,1); })}/></span></div>
    </div></div>`)}</div>
  </div>`;
}

function SettingsTab({d, update}){
  const s=d.settings, set=(k,v)=>update(x=>{ x.settings[k]=v; });
  return html`<div class="atab">
    <div class="agrid">
      <${Field} label="Nombre de la tienda"><input class="input" value=${s.name} onInput=${e=>set("name",e.target.value)}/><//>
      <${Field} label="Subtítulo del logo"><input class="input" value=${s.tagline} onInput=${e=>set("tagline",e.target.value)}/><//>
      <${Field} label="Número de WhatsApp" hint="Con código de país, solo números. Ej.: 51987654321"><input class="input" inputmode="numeric" value=${s.whatsapp} onInput=${e=>set("whatsapp",e.target.value.replace(/\D/g,""))}/><//>
      <${Field} label="WhatsApp como se muestra"><input class="input" value=${s.whatsappLabel} onInput=${e=>set("whatsappLabel",e.target.value)}/><//>
      <${Field} label="Moneda"><input class="input" value=${s.currency} onInput=${e=>set("currency",e.target.value)}/><//>
      <${Field} label=${`Recargo por estampado completo en polos (${s.currency})`}><input class="input" type="number" min="0" value=${s.fullPrintExtra} onInput=${e=>set("fullPrintExtra",Math.max(0,+e.target.value||0))}/><//>
    </div>
    <${Field} label="Texto de la barra superior"><input class="input" value=${s.topbar} onInput=${e=>set("topbar",e.target.value)}/><//>
    <${Field} label="Descripción en el pie de página"><textarea value=${s.about} onInput=${e=>set("about",e.target.value)}></textarea><//>
    <${Field} label="Medios de pago" hint="Separados por comas"><input class="input" value=${s.payments} onInput=${e=>set("payments",e.target.value)}/><//>
    <div class="af"><span>Descuentos por volumen</span>
      <div class="alist">${s.bulk.map((t,i)=>html`<div class="arow" key=${i}>Desde <input class="input sm" type="number" min="1" value=${t.min} onInput=${e=>update(x=>{ x.settings.bulk[i].min=Math.max(1,parseInt(e.target.value)||1); })}/> unidades →
        <input class="input sm" type="number" min="0" max="90" value=${t.off} onInput=${e=>update(x=>{ x.settings.bulk[i].off=Math.min(90,Math.max(0,parseInt(e.target.value)||0)); })}/> % de descuento
        <${ConfirmButton} label="Quitar" ask="¿Quitar?" onYes=${()=>update(x=>{ x.settings.bulk.splice(i,1); })}/></div>`)}</div>
      <div><button class="btn sm" onClick=${()=>update(x=>{ x.settings.bulk.push({min:200,off:35}); })}>+ Agregar nivel</button></div></div>
  </div>`;
}

/* Asistente virtual: se guarda en data.settings.bot (se publica con el resto de ajustes) */
function BotTab({d, update}){
  const b = d.settings.bot || BOT_DEFAULT;
  const edit = fn => update(x=>{ if(!x.settings.bot) x.settings.bot=clone(BOT_DEFAULT); fn(x.settings.bot); });
  const keysText = k => Array.isArray(k) ? k.join(", ") : (k||"");
  const moveFaq = (i,k) => edit(bb=>{ const j=i+k; if(j<0||j>=bb.faqs.length) return; [bb.faqs[i],bb.faqs[j]]=[bb.faqs[j],bb.faqs[i]]; });
  return html`<div class="atab">
    <div class="bot-admin-head"><${Mascot} size=${56}/><div><b>${b.name||"Tinti"}</b><small>Responde automáticamente las preguntas frecuentes de tus clientes. No usa inteligencia artificial: busca palabras clave en lo que escriben.</small></div></div>
    <div class="agrid">
      <${Field} label="Nombre del asistente"><input class="input" value=${b.name} onInput=${e=>edit(bb=>{ bb.name=e.target.value; })}/><//>
      <${Field} label="Horario y ubicación" hint="Se usa en la variable {horario}"><input class="input" value=${b.hours} onInput=${e=>edit(bb=>{ bb.hours=e.target.value; })}/><//>
    </div>
    <${Field} label="Saludo"><textarea value=${b.greeting} onInput=${e=>edit(bb=>{ bb.greeting=e.target.value; })}></textarea><//>
    <div class="arow">
      <label class="check"><input type="checkbox" checked=${b.enabled!==false} onChange=${e=>edit(bb=>{ bb.enabled=e.target.checked; })}/> Mostrar el asistente en la tienda</label>
      <label class="check"><input type="checkbox" checked=${b.teaser!==false} onChange=${e=>edit(bb=>{ bb.teaser=e.target.checked; })}/> Saludar con una burbuja (a los 6 segundos)</label>
    </div>
    <p class="note-cfg">Variables que puedes usar en los textos: <b>{nombre}</b> nombre de la tienda · <b>{asistente}</b> nombre del asistente · <b>{pagos}</b> medios de pago · <b>{descuentos}</b> descuentos por volumen · <b>{whatsapp}</b> número de WhatsApp · <b>{horario}</b> horario y ubicación.</p>
    <div class="af"><span>Preguntas frecuentes (${b.faqs.length}) · las 5 primeras aparecen como botones rápidos</span>
      <div class="alist">${b.faqs.map((f,i)=>html`<div class="arow-item faq-item" key=${i}>
        <div class="faq-top"><b>#${i+1}</b>
          <div class="acts"><button class="btn sm" onClick=${()=>moveFaq(i,-1)} disabled=${i===0} aria-label="Subir">↑</button><button class="btn sm" onClick=${()=>moveFaq(i,1)} disabled=${i===b.faqs.length-1} aria-label="Bajar">↓</button>
            <${ConfirmButton} ask="¿Eliminar esta pregunta?" onYes=${()=>edit(bb=>{ bb.faqs.splice(i,1); })}/></div></div>
        <div class="agrid">
          <${Field} label="Pregunta / texto del botón"><input class="input" value=${f.q} onInput=${e=>edit(bb=>{ bb.faqs[i].q=e.target.value; })}/><//>
          <${Field} label="Botón de acción"><select value=${f.action||""} onChange=${e=>edit(bb=>{ bb.faqs[i].action=e.target.value; })}>${BOT_ACTIONS.map(([v,l])=>html`<option key=${v} value=${v}>${l}</option>`)}</select><//>
        </div>
        <${Field} label="Palabras clave" hint="Separadas por comas. Si el cliente escribe alguna, se muestra esta respuesta."><input class="input" value=${keysText(f.keys)} onInput=${e=>edit(bb=>{ bb.faqs[i].keys=e.target.value; })}/><//>
        <${Field} label="Respuesta"><textarea value=${f.a} onInput=${e=>edit(bb=>{ bb.faqs[i].a=e.target.value; })}></textarea><//>
      </div>`)}</div>
      <div class="arow"><button class="btn sm" onClick=${()=>edit(bb=>{ bb.faqs.push({q:"Nueva pregunta",keys:"",a:"Escribe aquí la respuesta.",action:""}); })}>+ Agregar pregunta</button>
        <${ConfirmButton} label="Restaurar sugeridas" ask="¿Reemplazar todas las preguntas por las sugeridas?" onYes=${()=>edit(bb=>{ bb.faqs=clone(BOT_DEFAULT.faqs); })}/></div>
    </div>
  </div>`;
}

// Navegadores internos de apps (WhatsApp, Instagram, Facebook…): Google no permite iniciar sesión ahí
const IN_APP = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|; wv\)/i.test(navigator.userAgent);
function loginError(x){
  const c=x&&x.code;
  return c==="not_admin"?`La cuenta ${x.email||""} no tiene permiso de administrador.`
    :c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request"?"Cerraste la ventana de Google antes de terminar."
    :c==="auth/popup-blocked"?"El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio e inténtalo otra vez."
    :c==="auth/unauthorized-domain"?"Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados)."
    :c==="gis_load"?"No se pudo cargar el botón de Google. Revisa tu internet y recarga la página."
    :"No se pudo iniciar sesión. Revisa tu internet e inténtalo de nuevo.";
}
function GoogleLogin({onClose, onOk}){
  const [busy,setBusy]=useState(false), [err,setErr]=useState(""), [copied,setCopied]=useState(false);
  const gisRef=useRef(null);
  // Con ID de cliente: botón oficial de Google (funciona en celulares). Sin ID: ventana emergente de Firebase.
  useEffect(()=>{ if(IN_APP || !FB.hasGis || !gisRef.current) return;
    FB.renderButton(gisRef.current, ()=>onOk(), x=>setErr(loginError(x))).catch(x=>setErr(loginError(x))); },[]);
  const go=async()=>{ setBusy(true); setErr(""); try{ await FB.signIn(); onOk(); }catch(x){ setErr(loginError(x)); } setBusy(false); };
  const copy=async()=>{ try{ await navigator.clipboard.writeText(location.href); setCopied(true); }catch(e){ setCopied("manual"); } };
  if(IN_APP) return html`<div class="overlay" onClick=${e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div class="modal login" role="dialog" aria-modal="true" aria-label="Acceso del dueño">
      <div class="info">
        <div><span class="eyebrow">Acceso del dueño</span><h2>Abre este enlace en tu navegador</h2>
          <p class="lead">Estás dentro de WhatsApp u otra app, y ahí Google no permite iniciar sesión. Toca <b>•••</b> y elige <b>«Abrir en el navegador»</b> (Safari o Chrome), o copia el enlace y pégalo en el navegador.</p></div>
        <button class="btn primary block" onClick=${copy}>${copied===true?"Enlace copiado ✓":"Copiar enlace"}</button>
        ${copied==="manual" && html`<input class="input" readOnly value=${location.href} onFocus=${e=>e.target.select()}/>`}
        <div class="arow"><button class="btn" onClick=${onClose}>Cancelar</button></div>
      </div>
    </div></div>`;
  if(FB.hasGis) return html`<div class="overlay" onClick=${e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div class="modal login" role="dialog" aria-modal="true" aria-label="Acceso del dueño">
      <div class="info">
        <div><span class="eyebrow">Acceso del dueño</span><h2>Entrar al Panel del dueño</h2><p class="lead">Inicia sesión con la cuenta de Google autorizada. Los cambios que publiques se ven al instante en la tienda.</p></div>
        <div class="gis-wrap"><div ref=${gisRef}></div></div>
        ${err && html`<div class="amsg bad" style=${{margin:0}}>${err}</div>`}
        <div class="arow"><button class="btn" onClick=${onClose}>Cancelar</button></div>
      </div>
    </div></div>`;
  return html`<div class="overlay" onClick=${e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div class="modal login" role="dialog" aria-modal="true" aria-label="Acceso del dueño">
      <div class="info">
        <div><span class="eyebrow">Acceso del dueño</span><h2>Entrar al Panel del dueño</h2><p class="lead">Inicia sesión con la cuenta de Google autorizada. Los cambios que publiques se ven al instante en la tienda.</p></div>
        <button class="btn google" onClick=${go} disabled=${busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          ${busy?"Abriendo Google…":"Iniciar sesión con Google"}</button>
        ${err && html`<div class="amsg bad" style=${{margin:0}}>${err}</div>`}
        <div class="arow"><button class="btn" onClick=${onClose}>Cancelar</button></div>
      </div>
    </div></div>`;
}

function GitHubLogin({onClose, onOk}){
  const g=ghGuess();
  const [owner,setOwner]=useState(g.owner), [repo,setRepo]=useState(g.repo), [token,setToken]=useState(""), [busy,setBusy]=useState(false), [err,setErr]=useState("");
  const submit=async e=>{ e.preventDefault(); setBusy(true); setErr("");
    try{ const c=await ghVerify({owner:owner.trim(),repo:repo.trim(),token:token.trim()}); ghSave(c); onOk(); }
    catch(x){ setErr(x.status===401?"El token no es válido.":x.status===404?"No encuentro ese repositorio con este token. Revisa el usuario, el nombre del repositorio y que el token tenga acceso a él.":x.status===403?"El token no tiene permiso de escritura (Contents: Read and write).":"No se pudo conectar con GitHub. Revisa tu internet."); }
    setBusy(false); };
  return html`<div class="overlay" onClick=${e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <form class="modal login" role="dialog" aria-modal="true" aria-label="Acceso del dueño" onSubmit=${submit}>
      <div class="info">
        <div><span class="eyebrow">Acceso del dueño</span><h2>Entrar al Panel del dueño</h2><p class="lead">Tus cambios se guardan en tu repositorio de GitHub y la tienda se actualiza para todos en 1 o 2 minutos.</p></div>
        <div class="two">
          <${Field} label="Usuario de GitHub"><input class="input" id="gh-owner" value=${owner} onInput=${e=>setOwner(e.target.value)} required/><//>
          <${Field} label="Repositorio"><input class="input" id="gh-repo" value=${repo} onInput=${e=>setRepo(e.target.value)} required/><//>
        </div>
        <${Field} label="Token de GitHub" hint="Se guarda solo en este navegador. Créalo en GitHub → Settings → Developer settings → Fine-grained tokens, con acceso a este repositorio y permiso «Contents: Read and write»."><input class="input" id="gh-token" type="password" autocomplete="off" value=${token} onInput=${e=>setToken(e.target.value)} required/><//>
        ${err && html`<div class="amsg bad" style=${{margin:0}}>${err}</div>`}
        <div class="arow"><button type="button" class="btn" onClick=${onClose}>Cancelar</button><button class="btn primary" disabled=${busy} style=${{marginLeft:"auto"}}>${busy?"Verificando…":"Entrar"}</button></div>
      </div>
    </form></div>`;
}

function AdminPanel({data, setData, saved, setSaved, onClose, onLogout}){
  const {setToast} = useCart();
  const [tab,setTab]=useState("productos"), [busy,setBusy]=useState(false), [msg,setMsg]=useState(null), [draftOffer,setDraftOffer]=useState(null);
  const dirty = JSON.stringify(data)!==JSON.stringify(saved);
  const update = fn => setData(prev=>{ const x=clone(prev); fn(x); return x; });
  useEffect(()=>{ try{ const raw=localStorage.getItem(DRAFT_KEY); if(raw){ const dr=JSON.parse(raw); if(JSON.stringify(dr.data)!==JSON.stringify(saved) && !dirty) setDraftOffer(dr); } }catch(e){} },[]);
  useEffect(()=>{ if(!dirty) return; const t=setTimeout(()=>{ try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({at:Date.now(), data})); }catch(e){} },800); return ()=>clearTimeout(t); },[data]);
  useEffect(()=>{ const k=e=>{ if(e.key==="Escape") onClose(); }; addEventListener("keydown",k); return ()=>removeEventListener("keydown",k); },[]);
  const size = useMemo(()=>new Blob([JSON.stringify(data)]).size,[data]);
  const publish = async () => {
    setBusy(true); setMsg(null);
    const next={...data, updatedAt:Date.now()};
    try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({at:Date.now(), data:next})); }catch(e){}
    try{
      await publishData(next);
      try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
      setData(next); setSaved(next); setMsg({ok:true,t:FB||IN_CLAUDE?"Publicado. Tus clientes ya ven los cambios.":"Guardado en GitHub. Tus clientes verán los cambios en 1 o 2 minutos."}); setToast("Cambios publicados");
    }catch(e){ setMsg({ok:false,t:PUBLISH_ERRORS[e&&e.code]||"No se pudo publicar. Inténtalo de nuevo en un momento."}); }
    setBusy(false);
  };
  const tabs=[["productos","Productos"],["categorias","Categorías"],["carrusel","Carrusel"],["ajustes","Ajustes de la tienda"],["asistente","Asistente"]];
  return html`<div class="overlay admin-ov">
    <div class="admin" role="dialog" aria-modal="true" aria-label="Panel del dueño">
      <header class="ahdr">
        <div><h2>Panel del dueño</h2><small>${FB && FB.user() ? `Sesión: ${FB.user().email} · ` : ""}${dirty?"Tienes cambios sin publicar":FB&&FB_EMPTY?"El catálogo aún no está en Firebase":"Todo está publicado"}${FB?"":` · Datos: ${(size/1048576).toFixed(1)} MB de 12 MB`}</small></div>
        <div class="acts">
          <button class="btn" onClick=${onClose}>${dirty?"Ver vista previa":"Cerrar"}</button>
          ${onLogout && html`<button class="btn" onClick=${onLogout}>Cerrar sesión</button>`}
          <button class="btn" disabled=${!dirty||busy} onClick=${()=>{ setData(saved); try{localStorage.removeItem(DRAFT_KEY);}catch(e){} setMsg(null); }}>Descartar cambios</button>
          <button class="btn primary" disabled=${(!dirty&&!(FB&&FB_EMPTY))||busy||(!FB&&size>12582912)} onClick=${publish}>${busy?"Publicando…":FB&&FB_EMPTY&&!dirty?"Subir catálogo a Firebase":"Publicar cambios"}</button>
        </div>
      </header>
      ${draftOffer && html`<div class="amsg">Tienes un borrador sin publicar del ${new Date(draftOffer.at).toLocaleString()}.
        <button class="btn sm primary" onClick=${()=>{ setData(draftOffer.data); setDraftOffer(null); }}>Recuperar</button>
        <button class="btn sm" onClick=${()=>{ try{localStorage.removeItem(DRAFT_KEY);}catch(e){} setDraftOffer(null); }}>Descartar</button></div>`}
      ${msg && html`<div class=${"amsg "+(msg.ok?"ok":"bad")} role="status">${msg.t}</div>`}
      ${FB && FB_EMPTY && html`<div class="amsg">Tu base de datos de Firebase está vacía. Presiona <b>«Subir catálogo a Firebase»</b> para pasar todos tus productos, categorías, carrusel y ajustes. Solo se hace una vez.</div>`}
      ${!FB && size>12582912 && html`<div class="amsg bad">Las fotos ocupan demasiado espacio. Quita algunas fotos para poder publicar.</div>`}
      <nav class="atabs">${tabs.map(([k,l])=>html`<button key=${k} aria-pressed=${tab===k} onClick=${()=>setTab(k)}>${l}</button>`)}</nav>
      <div class="abody">
        ${tab==="productos" && html`<${ProductsTab} d=${data} update=${update}/>`}
        ${tab==="categorias" && html`<${CategoriesTab} d=${data} update=${update}/>`}
        ${tab==="carrusel" && html`<${SlidesTab} d=${data} update=${update}/>`}
        ${tab==="ajustes" && html`<${SettingsTab} d=${data} update=${update}/>`}
        ${tab==="asistente" && html`<${BotTab} d=${data} update=${update}/>`}
      </div>
    </div></div>`;
}
