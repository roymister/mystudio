/* ===== Simulador 3D de productos (polo y taza) — módulo independiente =====
   PoloSimulator.mount(elemento, urlDelModelo, {kind:"polo"|"taza"}) → {destroy, snapshot, summary} */
const SIM_KINDS={
  polo:{ noun:"polo", colors:[["Blanco","#FFFFFF"],["Hueso","#F3EBDD"],["Gris jaspe","#C9CCCF"],["Celeste","#A9D6F0"],["Amarillo","#F7D84A"],["Rosa","#F4B6CC"],["Verde menta","#B5E3C8"],["Rojo","#C8202F"],["Azul marino","#1C2A4A"],["Negro","#141414"]],
    text:{COLOR_TITLE:"Color del polo",WARN:"La tinta de sublimación es transparente: en polos oscuros el diseño casi no se ve. Para colores fuertes usa polo blanco o claro de poliéster.",NOTE:"Recomendado: tela 100% poliéster o mínimo 65% para colores vivos.",
      FULL_TITLE:"Estampado en toda la tela",PAT_NOTE:"El fondo usa el color del polo",STAGE_LABEL:"Vista 3D del polo",HINT:"Arrastra para girar el polo · rueda o pellizca para acercar",LAYERS_LABEL:"Capas en el polo",MOVE:"Mover en el polo",
      TRIMS:'<div class="label">Color de cuello y puños</div><div class="trims" id="trims"></div>',
      CREDIT:'Modelo 3D basado en "<a href="https://sketchfab.com/3d-models/men-polo-shirt-camouflage-pattern-6a69ec2e7e6a4bc893bcc1f357a7b9bd" target="_blank" rel="noopener">men POLO shirt, camouflage pattern</a>" de <a href="https://sketchfab.com/funlab117" target="_blank" rel="noopener">funlab117</a>, con licencia <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Modificado: se retiró el estampado original.'},
    hintPlace:"Toca o arrastra sobre el polo para ubicar el diseño · también en mangas y espalda", patScale:0.1, heightCm:null },
  taza:{ noun:"taza", colors:[["Blanco","#FFFFFF"],["Crema","#F3EBDD"],["Celeste","#A9D6F0"],["Rosa","#F4B6CC"],["Amarillo","#F7D84A"],["Verde menta","#B5E3C8"],["Rojo","#C8202F"],["Azul","#2D5BD7"],["Negro (mágica)","#1B1B1B"]],
    text:{COLOR_TITLE:"Color de la taza",WARN:"En tazas oscuras el diseño solo se ve bien en tazas mágicas (se revela con bebida caliente). Para colores vivos usa taza blanca.",NOTE:"Taza de cerámica AAA de 11 oz con capa para sublimar. Área de impresión: 20 × 9 cm.",
      FULL_TITLE:"Estampado alrededor de la taza",PAT_NOTE:"El fondo usa el color de la taza",STAGE_LABEL:"Vista 3D de la taza",HINT:"Arrastra para girar la taza · rueda o pellizca para acercar",LAYERS_LABEL:"Capas en la taza",MOVE:"Mover en la taza",TRIMS:"",
      CREDIT:'Modelo 3D "<a href="https://sketchfab.com/3d-models/taza-6bb5e0879f234a8888038d960c869f4b" target="_blank" rel="noopener">Taza</a>" de <a href="https://sketchfab.com/panesito34" target="_blank" rel="noopener">little bread 34</a> (Sketchfab), licencia Sketchfab Standard.'},
    hintPlace:"Toca o arrastra sobre la taza para ubicar el diseño · gírala para estampar atrás", patScale:22, heightCm:9.5 },
  mousepad:{ noun:"mousepad", flat:true, widthCm:80, depthCm:30, trimMat:/^Material\.002/, trimDefault:"#141414",
    colors:[["Blanco","#FFFFFF"],["Gris claro","#D9DCE0"],["Crema","#F3EBDD"],["Celeste","#A9D6F0"],["Rosa","#F4B6CC"],["Negro","#1B1B1B"]],
    text:{COLOR_TITLE:"Color de la superficie",WARN:"En superficies oscuras el diseño casi no se ve. Para colores vivos usa base blanca.",NOTE:"Tela de poliéster con base de caucho antideslizante. La sublimación cubre toda la superficie.",
      FULL_TITLE:"Estampado en toda la superficie",PAT_NOTE:"El fondo usa el color de la superficie",STAGE_LABEL:"Vista 3D del mousepad",HINT:"Arrastra para girar el mousepad · rueda o pellizca para acercar",LAYERS_LABEL:"Capas en el mousepad",MOVE:"Mover en el mousepad",
      TRIMS:'<div class="label">Color del borde cosido</div><div class="trims" id="trims"></div>',
      CREDIT:'Modelo 3D basado en "<a href="https://sketchfab.com/3d-models/mouse-pad-keyboard-pad-7690f727d87847aaa737c8110c8e6531" target="_blank" rel="noopener">mouse pad (keyboard pad)</a>" de <a href="https://sketchfab.com/mfkffzl" target="_blank" rel="noopener">mfk</a>, con licencia <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Modificado: colores y tamaño.'},
    hintPlace:"Toca o arrastra sobre el mousepad para ubicar el diseño", patScale:1 }
};
window.PoloSimulator={ mount(root, MODEL_URL, opts){
const KIND=(opts&&opts.kind)||"polo", K=SIM_KINDS[KIND];
root.innerHTML=SIM_MARKUP.replace(/\{\{(\w+)\}\}/g,(_,k)=>K.text[k]||""); let dead=false;
if(KIND==="taza"){ const b=root.querySelector('[data-view="180"]'); if(b) b.textContent="Atrás"; }
const COLORS = K.colors;
let shirtColor="#FFFFFF", trimColor=K.trimDefault||null, H_CM=72;
const lum=h=>{const n=parseInt(h.slice(1),16);return(0.299*(n>>16)+0.587*(n>>8&255)+0.114*(n&255))/255;};
const $=id=>document.getElementById(id);

/* ---------- Escena ---------- */
const stage=$("stage");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.95;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(30,1,0.05,50);
camera.position.set(0,0.75,2.7);
if(KIND==="taza") camera.position.set(0,0.95,3.5);
if(K.flat) camera.position.set(0,1.95,1.15);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(0,0.5,0); controls.enableDamping=true; controls.enablePan=false;
controls.minDistance=0.9; controls.maxDistance=4.5; controls.autoRotateSpeed=3; controls.maxPolarAngle=Math.PI*0.62;
if(K.flat){ controls.target.set(0,0,0); controls.minDistance=0.45; controls.maxDistance=2.6; controls.maxPolarAngle=Math.PI*0.46; }
(function(){ // estudio fotográfico suave
  const env=new THREE.Scene(), g=new THREE.SphereGeometry(10,32,16), c=[], p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i)/10, v=0.5+0.5*Math.max(0,y); c.push(v,v,v);}
  g.setAttribute("color",new THREE.Float32BufferAttribute(c,3));
  env.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const box=(x,y,z,w,h,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);};
  box(4,5,5,6,4,2.4); box(-5,3,2,4,4,1.1); box(0,4,-6,6,3,1.3);
  scene.environment=new THREE.PMREMGenerator(renderer).fromScene(env,0.04).texture;
})();
scene.add(new THREE.HemisphereLight(0xffffff,0x9aa4a8,0.25));
const key=new THREE.DirectionalLight(0xffffff,1.0); key.position.set(1.4,2.4,2.4);
key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.0005; key.shadow.normalBias=0.01; key.shadow.radius=4;
Object.assign(key.shadow.camera,{left:-0.8,right:0.8,top:1.3,bottom:-0.3,near:0.5,far:6}); scene.add(key);
const rim=new THREE.DirectionalLight(0xffffff,0.45); rim.position.set(-1.5,1.5,-2.5); scene.add(rim);
if(K.flat){ renderer.toneMappingExposure=1.08; key.position.set(0.6,3,1.6); const top=new THREE.DirectionalLight(0xffffff,0.55); top.position.set(-0.5,3,0.5); scene.add(top); }
(function(){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
  const g=x.createRadialGradient(128,128,8,128,128,128);g.addColorStop(0,"rgba(0,0,0,.3)");g.addColorStop(.6,"rgba(0,0,0,.1)");g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=g;x.fillRect(0,0,256,256);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=-0.06;scene.add(m);})();

/* ---------- Modelo 3D real ---------- */
const fabricMats=new Set(), trimMats=new Set(), stitchMats=new Set(), fabricMeshes=[];
const shirt=new THREE.Group(); scene.add(shirt);
let bodyHalfW=0.3, ready=false, modelRef=null, flatBase=null, flatCm=[K.widthCm||0,K.depthCm||0];
/* Tamaño real del producto plano (mousepad): ancho = 1 unidad, fondo según la proporción */
function applyFlatSize(){
  if(!modelRef||!flatBase) return;
  const want=flatCm[1]/flatCm[0];
  modelRef.scale.z=flatBase.sz*want/flatBase.depth; modelRef.updateMatrixWorld(true);
  H_CM=flatCm[0];
  // UV planas en centímetros reales: el estampado completo se repite cada "patCm" cm
  const v=new THREE.Vector3();
  fabricMeshes.forEach(o=>{ const g=o.geometry, p=g.attributes.position, uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); uv[i*2]=(v.x+0.5)*H_CM; uv[i*2+1]=(want/2-v.z)*H_CM; }
    g.setAttribute("uv",new THREE.BufferAttribute(uv,2)); });
  fabricMeshes.forEach(m=>{ delete m.userData.box; });
  const hz=want/2-0.01;
  layers.forEach(L=>{ if(L.point){ L.point.z=Math.max(-hz,Math.min(hz,L.point.z)); } buildDecal(L); });
  if(typeof refresh==="function" && ready) refresh();
}
const hint=$("hint"); hint.textContent=`Cargando ${K.noun} 3D…`;
const onModel=gltf=>{
  const model=gltf.scene;
  shirt.add(model); model.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3());
  H_CM=K.heightCm||size.y*100; const k=1/(K.flat?size.x:size.y); model.scale.setScalar(k); model.updateMatrixWorld(true);
  if(K.flat){ H_CM=K.widthCm; flatBase={sz:model.scale.z, depth:size.z/size.x}; }
  box.setFromObject(model); const ctr=box.getCenter(new THREE.Vector3());
  model.position.x-=ctr.x; model.position.z-=ctr.z; model.position.y-=box.min.y; model.updateMatrixWorld(true);
  let btnZ=0,btnN=0;
  model.traverse(o=>{ if(!o.isMesh) return;
    o.castShadow=!K.flat; o.receiveShadow=!K.flat; // en planos finos la sombra propia oscurece la superficie
    const m=o.material, n=m.name||"";
    m.side=THREE.DoubleSide;
    if(n==="Material624078"){ m.color.set("#EEEEE8").convertSRGBToLinear(); m.roughness=0.35;
      const c=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); btnZ+=c.z; btnN++; return; }
    if(n==="Material2927"){ stitchMats.add(m); return; }
    if(K.trimMat && K.trimMat.test(n)){ trimMats.add(m); m.roughness=0.7; return; }
    if(/^Collar_(FRONT|BACK|SIDE)_2683/.test(n)){ trimMats.add(m); m.map&&m.map.encoding; return; }
    fabricMats.add(m);
    if(K.flat){ m.roughness=0.85; m.metalness=0; m.envMapIntensity=0.5; }
    else if(KIND==="taza"){ m.roughness=0.22; m.metalness=0; m.envMapIntensity=1.1; m.roughnessMap=null; m.metalnessMap=null; }
    else { m.roughness=0.95; m.metalness=0; m.envMapIntensity=0.6; }
    if(m.map){m.map=null;m.needsUpdate=true;}
    fabricMeshes.push(o);
  });
  if(btnN&&btnZ/btnN<0){ model.rotation.y=Math.PI; model.updateMatrixWorld(true); }
  if(KIND==="taza"){ // asa a la derecha y cuerpo centrado
    const mean=new THREE.Vector3(), v=new THREE.Vector3(); let n=0;
    fabricMeshes.forEach(o=>{ const p=o.geometry.attributes.position; for(let i=0;i<p.count;i+=7){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); mean.add(v); n++; } });
    mean.divideScalar(n||1); const bc=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    const dx=bc.x-mean.x, dz=bc.z-mean.z, ang=Math.atan2(dz,dx);
    model.rotation.y=ang; model.updateMatrixWorld(true);
    const m2=new THREE.Vector3(); n=0; fabricMeshes.forEach(o=>{ const p=o.geometry.attributes.position; for(let i=0;i<p.count;i+=7){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); m2.add(v); n++; } });
    m2.divideScalar(n||1); model.position.x-=m2.x; model.position.z-=m2.z; model.updateMatrixWorld(true);
  }
  box.setFromObject(model); bodyHalfW=(box.max.x-box.min.x)/2;
  if(K.flat) model.traverse(o=>{ // normales hacia arriba en la cara superior
    if(!o.isMesh) return; const g=o.geometry, p=g.attributes.position, n=g.attributes.normal; if(!n) return;
    const w=new THREE.Vector3(), v=new THREE.Vector3(), nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    let ymax=-1e9; for(let i=0;i<p.count;i++){ w.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); ymax=Math.max(ymax,w.y); }
    let sum=0; for(let i=0;i<p.count;i++){ w.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); if(w.y>ymax-1e-3){ v.fromBufferAttribute(n,i).applyMatrix3(nm); sum+=v.y; } }
    if(sum<0){ // el modelo viene "al revés": se invierten normales y el orden de los triángulos
      for(let i=0;i<n.array.length;i++) n.array[i]=-n.array[i]; n.needsUpdate=true;
      if(g.index){ const ix=g.index.array; for(let i=0;i<ix.length;i+=3){ const t=ix[i+1]; ix[i+1]=ix[i+2]; ix[i+2]=t; } g.index.needsUpdate=true; }
      else { Object.values(g.attributes).forEach(at=>{ const a=at.array, k=at.itemSize; for(let i=0;i<at.count;i+=3) for(let c=0;c<k;c++){ const t=a[(i+1)*k+c]; a[(i+1)*k+c]=a[(i+2)*k+c]; a[(i+2)*k+c]=t; } at.needsUpdate=true; }); }
    }
  });
  modelRef=model; if(K.flat) applyFlatSize();
  applyColors(); ready=true; setMode("girar"); initDesigns();
};
const failModel=()=>{ hint.textContent=`No se pudo cargar el modelo 3D (${K.noun}). Recarga la página.`; };
window.__simModels=window.__simModels||{};
(window.__simModels[MODEL_URL]||(window.__simModels[MODEL_URL]=fetch(MODEL_URL).then(r=>{if(!r.ok)throw 0;return r.text();}).then(b64=>{
  const bin=atob(b64.trim()), buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
  return buf.buffer;
}))).then(ab=>{ if(!dead) new THREE.GLTFLoader().parse(ab.slice(0),"",onModel,failModel); }).catch(e=>{window.__simModels[MODEL_URL]=null;failModel(e);});

/* ---------- Estampado completo (sublimación total) ---------- */
let patType="none", patColor="#1C2A4A", patCm=KIND==="taza"?5:16;
if(KIND==="taza"){ const ps=$("patSize"); ps.min="2"; ps.max="12"; ps.value="5"; $("patSizeOut").textContent="5 cm"; }
if(K.flat){ patCm=10; const ps=$("patSize"); ps.min="3"; ps.max="90"; ps.value="10"; $("patSizeOut").textContent="10 cm"; }
const patCanvas=document.createElement("canvas"); patCanvas.width=patCanvas.height=512;
const patTex=new THREE.CanvasTexture(patCanvas);
patTex.encoding=THREE.sRGBEncoding; patTex.wrapS=patTex.wrapT=THREE.RepeatWrapping;
patTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
let patUpload=null;
function mix(a,b,t){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);
  const r=Math.round((A>>16)*(1-t)+(B>>16)*t),g=Math.round((A>>8&255)*(1-t)+(B>>8&255)*t),bl=Math.round((A&255)*(1-t)+(B&255)*t);
  return "#"+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);}
const PATTERNS={
  none:{n:"Liso"},
  flechas:{n:"Flechas",d:(x,A,B,C)=>{x.fillStyle=A;x.fillRect(0,0,512,512);const s=64;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){x.fillStyle=[B,C,A===B?C:B][(r+c)%3];
      const X=c*s,Y=r*s;x.beginPath();x.moveTo(X,Y);x.lineTo(X+s/2,Y+s*0.45);x.lineTo(X+s,Y);x.lineTo(X+s,Y+s*0.4);x.lineTo(X+s/2,Y+s*0.85);x.lineTo(X,Y+s*0.4);x.closePath();x.fill();}}},
  camu:{n:"Camuflaje",d:(x,A,B,C)=>{x.fillStyle=A;x.fillRect(0,0,512,512);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    [C,B,mix(A,B,0.3)].forEach(col=>{x.fillStyle=col;for(let i=0;i<14;i++){const cx=rnd()*512,cy=rnd()*512,r=30+rnd()*50,pts=[];
      for(let k=0;k<10;k++){const a=k/10*Math.PI*2,rr=r*(0.6+rnd()*0.6);pts.push([Math.cos(a)*rr,Math.sin(a)*rr*0.8]);}
      for(const ox of[-512,0,512])for(const oy of[-512,0,512]){x.beginPath();pts.forEach((p,k)=>{const X=cx+ox+p[0],Y=cy+oy+p[1];k?x.lineTo(X,Y):x.moveTo(X,Y);});x.closePath();x.fill();}}});}},
  rayas:{n:"Rayas",d:(x,A,B)=>{x.fillStyle=A;x.fillRect(0,0,512,512);x.fillStyle=B;
    for(let i=-8;i<16;i++){x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64+28,0);x.lineTo(i*64+28-512,512);x.lineTo(i*64-512,512);x.closePath();x.fill();}}},
  lunares:{n:"Lunares",d:(x,A,B)=>{x.fillStyle=A;x.fillRect(0,0,512,512);x.fillStyle=B;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){x.beginPath();x.arc(c*64+(r%2?32:0)+16,r*64+32,13,0,7);x.fill();if(r%2&&c===7){x.beginPath();x.arc(16-32,r*64+32,13,0,7);x.fill();}}}},
  triangulos:{n:"Geométrico",d:(x,A,B,C)=>{const s=128;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const X=c*s,Y=r*s,k=(r*3+c*5)%4;
      x.fillStyle=[A,B,C,mix(A,B,0.25)][k];x.fillRect(X,Y,s,s);x.fillStyle=[C,A,B,B][k];x.beginPath();
      if((r+c)%2){x.moveTo(X,Y);x.lineTo(X+s,Y);x.lineTo(X,Y+s);}else{x.moveTo(X+s,Y);x.lineTo(X+s,Y+s);x.lineTo(X,Y+s);}x.closePath();x.fill();}}},
  cuadros:{n:"Cuadros",d:(x,A,B)=>{x.fillStyle=A;x.fillRect(0,0,512,512);x.globalAlpha=0.45;x.fillStyle=B;
    for(let i=0;i<4;i++){x.fillRect(i*128+20,0,48,512);x.fillRect(0,i*128+20,512,48);}
    x.globalAlpha=0.8;for(let i=0;i<4;i++){x.fillRect(i*128+90,0,8,512);x.fillRect(0,i*128+90,512,8);}x.globalAlpha=1;}}
};
function drawPattern(){
  const x=patCanvas.getContext("2d");
  if(patType==="upload"&&patUpload){x.clearRect(0,0,512,512);x.drawImage(patUpload,0,0,512,512);}
  else if(PATTERNS[patType]&&PATTERNS[patType].d) PATTERNS[patType].d(x,shirtColor,patColor,mix(shirtColor,patColor,0.55));
  patTex.needsUpdate=true; patTex.repeat.set(K.patScale/patCm,K.patScale/patCm);
}
function patternThumb(type){const c=document.createElement("canvas");c.width=c.height=96;const x=c.getContext("2d");
  if(PATTERNS[type].d){const t=document.createElement("canvas");t.width=t.height=512;PATTERNS[type].d(t.getContext("2d"),shirtColor,patColor,mix(shirtColor,patColor,0.55));x.drawImage(t,0,0,96,96);}
  else{x.fillStyle=shirtColor;x.fillRect(0,0,96,96);}
  return c;}
function renderPatternButtons(){
  const w=$("patterns");w.innerHTML="";
  Object.keys(PATTERNS).forEach(k=>{const b=document.createElement("button");b.title=PATTERNS[k].n;b.setAttribute("aria-label",PATTERNS[k].n);
    b.setAttribute("aria-pressed",k===patType);b.appendChild(patternThumb(k));const s=document.createElement("span");s.textContent=PATTERNS[k].n;b.appendChild(s);
    b.onclick=()=>{patType=k;if(Math.abs(lum(shirtColor)-lum(patColor))<0.25){patColor=lum(shirtColor)>0.5?"#1C2A4A":"#FFFFFF";$("patColor").value=patColor.toLowerCase();}renderPatternButtons();applyColors();};w.appendChild(b);});
  if(patUpload){const b=document.createElement("button");b.setAttribute("aria-pressed",patType==="upload");b.title="Mi patrón";
    const c=document.createElement("canvas");c.width=c.height=96;c.getContext("2d").drawImage(patUpload,0,0,96,96);b.appendChild(c);
    const s=document.createElement("span");s.textContent="Mi patrón";b.appendChild(s);b.onclick=()=>{patType="upload";renderPatternButtons();applyColors();};w.appendChild(b);}
  $("patOpts").hidden=patType==="none";
  $("patColorRow").hidden=patType==="upload";
}
$("patColor").oninput=e=>{patColor=e.target.value.toUpperCase();renderPatternButtons();applyColors();};
$("patSize").oninput=e=>{patCm=+e.target.value;$("patSizeOut").textContent=patCm+" cm";drawPattern();};
$("patFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>{patUpload=im;patType="upload";renderPatternButtons();applyColors();};im.src=rd.result;};rd.readAsDataURL(f);e.target.value="";};

function applyColors(){
  const c=new THREE.Color(shirtColor).convertSRGBToLinear();
  const on=patType!=="none"; if(on) drawPattern();
  fabricMats.forEach(m=>{ if(on){m.color.setRGB(1,1,1);} else m.color.copy(c);
    const want=on?patTex:null; if(m.map!==want){m.map=want;m.needsUpdate=true;}
    if(K.flat){ // superficie plana: un poco de luz propia para que el color se vea fiel
      m.emissive.copy(m.color).multiplyScalar(0.32); if(m.emissiveMap!==want){ m.emissiveMap=want; m.needsUpdate=true; } } });
  const t=new THREE.Color(trimColor||shirtColor).convertSRGBToLinear();
  trimMats.forEach(m=>m.color.copy(t));
  const s=c.clone().multiplyScalar(lum(shirtColor)>0.5?0.72:1.6);
  stitchMats.forEach(m=>m.color.copy(s));
}

/* ---------- Diseños prediseñados ---------- */
function cv(w,h,fn){const c=document.createElement("canvas");c.width=w;c.height=h;fn(c.getContext("2d"),w,h);return c;}
const PRESETS=[
 ["Rayo",()=>cv(512,512,(x)=>{const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,"#FFE14D");g.addColorStop(1,"#FF7A1A");
   x.beginPath();[[300,20],[110,290],[235,290],[180,492],[400,200],[270,200],[340,20]].forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));x.closePath();
   x.fillStyle=g;x.fill();x.lineWidth=16;x.lineJoin="round";x.strokeStyle="#1B1B1B";x.stroke();})],
 ["Sol",()=>cv(512,512,(x)=>{x.translate(256,256);x.fillStyle="#FF5A36";for(let i=0;i<16;i++){x.rotate(Math.PI/8);x.beginPath();x.moveTo(-22,-150);x.lineTo(0,-245);x.lineTo(22,-150);x.fill();}
   const g=x.createRadialGradient(-40,-40,10,0,0,150);g.addColorStop(0,"#FFE680");g.addColorStop(1,"#FFAA00");x.fillStyle=g;x.beginPath();x.arc(0,0,145,0,7);x.fill();})],
 ["Ondas",()=>cv(512,512,(x)=>{x.beginPath();x.arc(256,256,240,0,7);x.clip();const cs=["#0B3C5D","#1B6CA8","#2F9BD6","#7CC8EE","#D4F0FB"];
   for(let k=0;k<12;k++){x.fillStyle=cs[k%5];x.beginPath();x.moveTo(0,512);for(let X=0;X<=512;X+=8)x.lineTo(X,512-k*44-18*Math.sin(X/40+k));x.lineTo(512,512);x.fill();}
   x.lineWidth=14;x.strokeStyle="#0B3C5D";x.beginPath();x.arc(256,256,233,0,7);x.stroke();})],
 ["Montaña",()=>cv(512,512,(x)=>{x.beginPath();x.arc(256,256,240,0,7);x.fillStyle="#FFF1D6";x.fill();x.save();x.clip();
   x.fillStyle="#FF8A3D";x.beginPath();x.arc(330,210,60,0,7);x.fill();
   x.fillStyle="#2E5E4E";x.beginPath();x.moveTo(0,420);x.lineTo(170,190);x.lineTo(260,300);x.lineTo(340,230);x.lineTo(512,420);x.lineTo(512,512);x.lineTo(0,512);x.fill();
   x.fillStyle="#FFFFFF";x.beginPath();x.moveTo(170,190);x.lineTo(130,245);x.lineTo(165,235);x.lineTo(195,255);x.lineTo(210,242);x.closePath();x.fill();
   x.fillStyle="#1D3D33";x.fillRect(0,400,512,112);x.restore();
   x.lineWidth=16;x.strokeStyle="#1D3D33";x.beginPath();x.arc(256,256,232,0,7);x.stroke();
   x.fillStyle="#FFF1D6";x.font="800 54px 'Bricolage Grotesque',sans-serif";x.textAlign="center";x.fillText("ANDES",256,468);})],
 ["Estrella",()=>cv(512,512,(x)=>{x.translate(256,266);x.beginPath();for(let i=0;i<10;i++){const r=i%2?95:235,a=i*Math.PI/5-Math.PI/2;x.lineTo(r*Math.cos(a),r*Math.sin(a));}x.closePath();
   const g=x.createLinearGradient(-200,-200,200,200);g.addColorStop(0,"#C81D6B");g.addColorStop(1,"#5B2BD9");x.fillStyle=g;x.fill();x.lineWidth=14;x.lineJoin="round";x.strokeStyle="#1B1B1B";x.stroke();})],
 ["Número",()=>cv(512,512,(x)=>{x.textAlign="center";x.textBaseline="middle";x.font="800 400px 'Bricolage Grotesque',sans-serif";
   x.lineWidth=26;x.strokeStyle="#1B1B1B";x.strokeText("10",256,270);x.fillStyle="#E8332A";x.fillText("10",256,270);})]
];
function textCanvas(t){
  const f="800 180px 'Bricolage Grotesque',sans-serif";const m=cv(1,1,()=>{});const mx=m.getContext("2d");mx.font=f;
  const w=Math.ceil(mx.measureText(t).width)+60;
  return cv(w,240,(x)=>{x.font=f;x.textAlign="center";x.textBaseline="middle";x.lineWidth=18;x.lineJoin="round";
    x.strokeStyle="#FFFFFF";x.strokeText(t,w/2,125);x.fillStyle="#141414";x.fillText(t,w/2,125);});
}



/* ---------- Capas como calcomanías proyectadas sobre la tela ---------- */
let layers=[], selId=null, nid=1, mode="girar";
const helper=new THREE.Object3D();
function layerCanvas(L){ // imagen + borde de selección
  const pad=Math.round(Math.max(L.img.width,L.img.height)*0.04), c=L.canvas||(L.canvas=document.createElement("canvas"));
  c.width=L.img.width+pad*2; c.height=L.img.height+pad*2; const x=c.getContext("2d");
  x.clearRect(0,0,c.width,c.height); x.drawImage(L.img,pad,pad);
  if(L.id===selId&&mode==="colocar"){x.strokeStyle="#C81D6B";x.lineWidth=Math.max(3,pad*0.35);x.setLineDash([pad*1.2,pad*0.8]);x.strokeRect(pad*0.4,pad*0.4,c.width-pad*0.8,c.height-pad*0.8);}
  if(!L.tex){L.tex=new THREE.CanvasTexture(c);L.tex.encoding=THREE.sRGBEncoding;L.tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}
  L.tex.needsUpdate=true; L.padF=c.width/L.img.width;
}
// quita triángulos casi de perfil a la proyección (evitan manchas estiradas en costados y pliegues)
function cleanDecal(geo,dir){
  const p=geo.attributes.position, n=geo.attributes.normal, uv=geo.attributes.uv, keep=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),fn=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
    fn.subVectors(c,b).cross(a.clone().sub(b)).normalize();
    const dd=fn.dot(dir); if(KIND==="taza" ? dd>0.3 : Math.abs(dd)>0.3) keep.push(i);
  }
  if(!keep.length){geo.dispose();return null;}
  const P=new Float32Array(keep.length*9),N=new Float32Array(keep.length*9),U=new Float32Array(keep.length*6);
  keep.forEach((i,k)=>{for(let j=0;j<3;j++){for(let q=0;q<3;q++){P[k*9+j*3+q]=p.array[(i+j)*3+q];N[k*9+j*3+q]=n.array[(i+j)*3+q];}U[k*6+j*2]=uv.array[(i+j)*2];U[k*6+j*2+1]=uv.array[(i+j)*2+1];}});
  geo.dispose(); const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(P,3));g.setAttribute("normal",new THREE.BufferAttribute(N,3));g.setAttribute("uv",new THREE.BufferAttribute(U,2));
  return g;
}
// dirección de proyección = promedio de la superficie bajo todo el diseño (no solo el punto central)
const avgRay=new THREE.Raycaster();
function avgNormal(p,n,w,h){
  const t=new THREE.Vector3(0,1,0).cross(n); if(t.lengthSq()<1e-4) t.set(1,0,0); t.normalize();
  const b=new THREE.Vector3().crossVectors(n,t).normalize(), acc=n.clone(), dir=n.clone().negate();
  [[-.4,0],[.4,0],[0,-.4],[0,.4],[-.3,-.3],[.3,.3],[-.3,.3],[.3,-.3]].forEach(([x,y])=>{
    const o=p.clone().addScaledVector(t,x*w).addScaledVector(b,y*h).addScaledVector(n,0.25);
    avgRay.set(o,dir); const hh=avgRay.intersectObjects(fabricMeshes,false)[0];
    if(hh&&hh.distance<0.45){const q=hh.face.normal.clone().transformDirection(hh.object.matrixWorld);if(q.dot(n)<0)q.negate();acc.add(q);}
  });
  return acc.normalize();
}
function buildDecal(L){
  if(L.group){shirt.remove(L.group);L.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  if(!L.point) return;
  layerCanvas(L);
  if(!L.mat) L.mat=new THREE.MeshStandardMaterial({map:L.tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:0.9,metalness:0,side:THREE.DoubleSide,envMapIntensity:0.6});
  const h=L.s*L.padF, w=L.s*L.asp*L.padF, d=K.flat?0.05:KIND==="taza"?Math.max(w,h)*0.9:Math.min(0.1,Math.max(w,h)*0.5);
  const N=avgNormal(L.point,L.normal,w,h);
  helper.position.copy(L.point); if(Math.abs(N.y)>0.9) helper.up.set(0,0,-1); else helper.up.set(0,1,0);
  helper.lookAt(L.point.clone().add(N)); helper.rotateZ(-L.rot*Math.PI/180);
  const size=new THREE.Vector3(w,h,d), g=new THREE.Group(), r=Math.max(w,h);
  fabricMeshes.forEach(m=>{
    if(!m.userData.box) m.userData.box=new THREE.Box3().setFromObject(m);
    if(m.userData.box.distanceToPoint(L.point)>r) return;
    const geo=cleanDecal(new THREE.DecalGeometry(m,L.point,helper.rotation,size),N);
    if(geo) g.add(new THREE.Mesh(geo,L.mat));
  });
  L.group=g; shirt.add(g);
}
function sel(){return layers.find(l=>l.id===selId);}
function hitFrom(origin,dir){const r=new THREE.Raycaster(origin,dir.normalize());const h=r.intersectObjects(fabricMeshes,false)[0];return h&&setHit(h,dir);}
function setHit(h,dir){const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);if(n.dot(dir)>0)n.negate();return{point:h.point.clone(),normal:n};}
function addLayer(name,img,opt={}){
  const asp=img.width/img.height;
  const L={id:nid++,name,img,asp,s:opt.s||(K.flat?(asp>2?0.08:0.2):KIND==="taza"?(asp>2?0.16:0.5):(asp>2?0.07:0.22)),rot:0,thumb:img.toDataURL?img.toDataURL():img.src};
  const hit=K.flat ? hitFrom(new THREE.Vector3(opt.x||0,2,opt.z||0),new THREE.Vector3(0,-1,0))
                   : hitFrom(new THREE.Vector3(opt.x||0,opt.y||0.6,opt.back?-2:2),new THREE.Vector3(0,0,opt.back?1:-1));
  if(hit){L.point=hit.point;L.normal=hit.normal;}
  layers.push(L); if(!opt.keepSel){selId=L.id; setMode("colocar");}
  buildDecal(L); refresh();
}
function where(l){ if(!l.point) return "";
  if(K.flat){ const x=l.point.x; return x<-0.17?"Lado izquierdo":x>0.17?"Lado derecho":"Centro"; }
  if(KIND==="taza") return l.normal.z>0.35?"Frente":l.normal.z<-0.35?"Atrás":l.normal.x>0?"Lado del asa":"Lado opuesto al asa";
  const p=l.point; if(Math.abs(p.x)>bodyHalfW*0.72&&p.y>0.62) return p.x>0?"Manga izquierda":"Manga derecha";
  if(l.normal.z>0.35) return p.y>0.65?"Pecho":"Frente"; if(l.normal.z<-0.35) return "Espalda"; return "Costado"; }
const cm=l=>`${Math.round(l.s*l.asp*H_CM)} × ${Math.round(l.s*H_CM)} cm`;
function refresh(){
  const ul=$("layers");ul.innerHTML="";
  if(!layers.length) ul.innerHTML='<li><p class="empty">Aún no hay diseños. Elige uno arriba.</p></li>';
  layers.forEach(l=>{const li=document.createElement("li"),b=document.createElement("button");
    b.setAttribute("aria-pressed",l.id===selId);b.innerHTML=`<img alt="" src="${l.thumb}"><span><strong></strong><small>${where(l)} · ${cm(l)}</small></span>`;
    b.querySelector("strong").textContent=l.name;b.onclick=()=>{selId=l.id;layers.forEach(layerCanvas);refresh();};li.appendChild(b);ul.appendChild(li);});
  const s=sel();$("ctrl").hidden=!s;
  if(s){$("size").value=s.s;$("rot").value=s.rot;$("sizeOut").textContent=cm(s);$("rotOut").textContent=s.rot+"°";}
}
let pending=null;
function schedule(L){pending=L;}
$("size").min="0.03"; $("size").max=KIND==="taza"?"0.95":"0.6";
$("size").oninput=e=>{const s=sel();if(s){s.s=+e.target.value;schedule(s);$("sizeOut").textContent=cm(s);}};
$("size").onchange=()=>refresh();
$("rot").oninput=e=>{const s=sel();if(s){s.rot=+e.target.value;schedule(s);$("rotOut").textContent=s.rot+"°";}};
$("del").onclick=()=>{const s=sel();if(s&&s.group)shirt.remove(s.group);layers=layers.filter(l=>l.id!==selId);selId=layers.length?layers[layers.length-1].id:null;layers.forEach(layerCanvas);refresh();};
$("move").onclick=()=>setMode("colocar");

/* ---------- Colores ---------- */
const swWrap=$("swatches");
function setColor(hex,name){shirtColor=hex;$("colorName").textContent=name;$("customColor").value=hex.toLowerCase();
  $("warn").hidden=lum(hex)>0.55;renderPatternButtons();[...swWrap.children].forEach(b=>b.setAttribute("aria-pressed",b.dataset.hex===hex));applyColors();}
COLORS.forEach(([n,h])=>{const b=document.createElement("button");b.className="sw";b.style.background=h;b.dataset.hex=h;b.title=n;b.setAttribute("aria-label",n);b.onclick=()=>setColor(h,n);swWrap.appendChild(b);});
$("customColor").oninput=e=>setColor(e.target.value.toUpperCase(),"Personalizado "+e.target.value.toUpperCase());
const TRIMS=[["Igual al color base",null],["Negro","#141414"],["Blanco","#FFFFFF"],["Azul marino","#1C2A4A"],["Rojo","#C8202F"],["Celeste","#5DADE2"]];
if($("trims")) TRIMS.forEach(([n,h])=>{const b=document.createElement("button");b.title=n;b.setAttribute("aria-label",n);
  if(h)b.style.background=h;else b.className="same";b.setAttribute("aria-pressed",h===trimColor);
  b.onclick=()=>{trimColor=h;[...$("trims").children].forEach(c=>c.setAttribute("aria-pressed",c===b));applyColors();};$("trims").appendChild(b);});

/* ---------- Modos y vistas ---------- */
function setMode(m){mode=m;$("mGirar").setAttribute("aria-pressed",m==="girar");$("mColocar").setAttribute("aria-pressed",m==="colocar");
  controls.enabled=m==="girar";stage.classList.toggle("placing",m==="colocar");
  if(ready) hint.textContent=m==="girar"?K.text.HINT:(sel()?K.hintPlace:"Selecciona una capa para moverla");
  if(m==="colocar"){controls.autoRotate=false;$("auto").setAttribute("aria-pressed","false");}
  layers.forEach(layerCanvas);}
$("mGirar").onclick=()=>setMode("girar");$("mColocar").onclick=()=>setMode("colocar");
let viewAnim=null;
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{
  const a=+b.dataset.view*Math.PI/180, r=Math.hypot(camera.position.x,camera.position.z);
  viewAnim={from:Math.atan2(camera.position.x,camera.position.z),to:a,r,t:0};});
$("auto").onclick=e=>{controls.autoRotate=!controls.autoRotate;e.target.setAttribute("aria-pressed",controls.autoRotate);if(controls.autoRotate)setMode("girar");};

/* ---------- Colocar con el puntero ---------- */
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let dragging=false;
function placeAt(ev){const s=sel();if(!s)return;const r=renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,camera);
  const h=ray.intersectObjects(fabricMeshes,false)[0];if(!h)return;
  const hit=setHit(h,ray.ray.direction.clone());s.point=hit.point;s.normal=hit.normal;schedule(s);}
renderer.domElement.addEventListener("pointerdown",e=>{if(mode!=="colocar"||!ready)return;dragging=true;renderer.domElement.setPointerCapture(e.pointerId);placeAt(e);});
renderer.domElement.addEventListener("pointermove",e=>{if(dragging&&mode==="colocar")placeAt(e);});
addEventListener("pointerup",()=>{if(dragging){dragging=false;refresh();}});

/* ---------- Panel de diseños ---------- */
function initDesigns(){
  const wrap=$("designs");
  PRESETS.forEach(([n,fn])=>{const c=fn();const b=document.createElement("button");b.className="dz";b.title=n;b.setAttribute("aria-label","Agregar "+n);
    const t=document.createElement("canvas");t.width=160;t.height=160;t.getContext("2d").drawImage(c,0,0,160,160);b.appendChild(t);
    b.onclick=()=>addLayer(n,fn());wrap.appendChild(b);});
  $("addTxt").onclick=()=>{const t=$("txt").value.trim();if(t)addLayer("Texto: "+t,textCanvas(t),{y:0.7});};
  $("file").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
    rd.onload=()=>{const im=new Image();im.onload=()=>{const c=cv(im.width,im.height,x=>x.drawImage(im,0,0));addLayer(f.name.replace(/\.[^.]+$/,"").slice(0,22),c);};im.src=rd.result;};
    rd.readAsDataURL(f);e.target.value="";};
  // ejemplo: logo en el pecho izquierdo, nombre y número en la espalda
  if(K.flat){
    addLayer("Montaña",PRESETS[3][1](),{x:0.28,z:0,s:0.2,keepSel:true});
    addLayer("Texto: TU NOMBRE",textCanvas("TU NOMBRE"),{x:-0.18,z:0.08,s:0.06,keepSel:true});
  } else if(KIND==="taza"){
    addLayer("Montaña",PRESETS[3][1](),{y:0.47,s:0.55,keepSel:true});
    addLayer("Texto: TU NOMBRE",textCanvas("TU NOMBRE"),{y:0.47,s:0.14,back:true,keepSel:true});
  } else {
    addLayer("Montaña",PRESETS[3][1](),{x:0.1,y:0.74,s:0.11,keepSel:true});
    addLayer("Texto: TU NOMBRE",textCanvas("TU NOMBRE"),{y:0.76,s:0.06,back:true,keepSel:true});
    addLayer("Número",PRESETS[5][1](),{y:0.5,s:0.26,back:true,keepSel:true});
  }
  selId=layers[0].id; refresh();
}

/* ---------- Loop ---------- */
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
function loop(){if(dead)return;requestAnimationFrame(loop);
  if(pending){buildDecal(pending);pending=null;}
  if(viewAnim){viewAnim.t=Math.min(1,viewAnim.t+0.05);let d=viewAnim.to-viewAnim.from;d=Math.atan2(Math.sin(d),Math.cos(d));
    const e=1-Math.pow(1-viewAnim.t,3),a=viewAnim.from+d*e;camera.position.x=viewAnim.r*Math.sin(a);camera.position.z=viewAnim.r*Math.cos(a);
    if(viewAnim.t>=1)viewAnim=null;}
  controls.update();renderer.render(scene,camera);}
setColor("#FFFFFF","Blanco");
loop();

return {
  setSize(wcm,hcm){ if(!K.flat) return; flatCm=[wcm,hcm]; applyFlatSize(); },
  destroy(){dead=true;try{renderer.dispose();renderer.forceContextLoss();}catch(e){}},
  snapshot(){try{renderer.render(scene,camera);const c=document.createElement("canvas");const s=renderer.domElement;const k=260/Math.max(s.width,s.height);
    c.width=Math.round(s.width*k);c.height=Math.round(s.height*k);const x=c.getContext("2d");x.fillStyle="#F1F4F9";x.fillRect(0,0,c.width,c.height);x.drawImage(s,0,0,c.width,c.height);return c.toDataURL("image/jpeg",0.82);}catch(e){return null;}},
  summary(){return {color:$("colorName").textContent, full:patType!=="none", pattern:patType==="none"?null:(patType==="upload"?"Estampado propio":PATTERNS[patType].n), designs:layers.map(l=>l.name+" ("+where(l)+")")};}
};
}};
