/* ===== Firebase: inicio de sesión con Google + base de datos de la tienda =====
   - Clientes: leen la tienda (productos, categorías, carrusel, ajustes) desde Firestore.
   - Administradores: inician sesión con Google; solo los usuarios de ADMIN_UIDS pueden guardar.
   La seguridad real está en las reglas de Firestore (archivo firestore.rules): mantén ambas listas iguales. */
window.FireStore = (function(){
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA7ZsgxIiLzTSlPzmbgRpCDgni-7wawCwQ",
    authDomain: "sublipro-ef02e.firebaseapp.com",
    projectId: "sublipro-ef02e",
    storageBucket: "sublipro-ef02e.firebasestorage.app",
    messagingSenderId: "426507707884",
    appId: "1:426507707884:web:635d15d6f0d75196614cc9"
  };
  // Códigos de usuario (UID) con acceso al Panel del dueño. Se ven en Firebase → Authentication → Usuarios.
  const ADMIN_UIDS = ["ZQQddGSrBZZCofKrCfzimC6lAqs1", "ZYBhNAJ4W8fix6zTGyDEXdXdNqs2"];
  // ID de cliente web de Google (Firebase → Authentication → Método de acceso → Google → Configuración del SDK web).
  // Con este ID el inicio de sesión funciona en celulares (Safari/Chrome móvil). Si queda así, se usa la ventana emergente.
  const GOOGLE_CLIENT_ID = "PEGA_AQUI_TU_ID_DE_CLIENTE_WEB.apps.googleusercontent.com";

  if(!window.firebase || !firebase.initializeApp) return null;   // sin Firebase (p. ej. dentro de Claude): la tienda usa su modo anterior
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  const auth = app.auth(), db = app.firestore();
  const CONFIG_DOC = "tienda/config", PRODUCTS = "productos";

  const isAdmin = u => !!u && ADMIN_UIDS.includes(u.uid);
  const clean = o => JSON.parse(JSON.stringify(o));   // Firestore no acepta undefined

  async function load(){
    const cfg = await db.doc(CONFIG_DOC).get();
    if(!cfg.exists) return null;                        // base vacía: la tienda usa el catálogo incluido en la página
    const snap = await db.collection(PRODUCTS).get(), map = {};
    snap.forEach(d => { map[d.id] = d.data(); });
    const c = cfg.data(), order = c.productOrder || Object.keys(map);
    const products = order.map(id => map[id]).filter(Boolean);
    Object.keys(map).forEach(id => { if(!order.includes(id)) products.push(map[id]); });
    return { ...c.store, products };
  }

  // Guarda solo lo que cambió. Cada producto es un documento (máx. 1 MB con su foto).
  async function publish(data){
    if(!isAdmin(auth.currentUser)) throw { code:"fb_login" };
    const d = clean(data), remote = await db.collection(PRODUCTS).get(), old = {};
    remote.forEach(x => { old[x.id] = JSON.stringify(x.data()); });
    const ops = [];
    d.products.forEach(p => {
      if(new Blob([JSON.stringify(p)]).size > 1000000) throw { code:"too_large", name:p.name };
      if(old[p.id] !== JSON.stringify(p)) ops.push(b => b.set(db.collection(PRODUCTS).doc(p.id), p));
    });
    Object.keys(old).forEach(id => { if(!d.products.some(p => p.id === id)) ops.push(b => b.delete(db.collection(PRODUCTS).doc(id))); });
    const { products, ...store } = d;
    ops.push(b => b.set(db.doc(CONFIG_DOC), { store, productOrder: products.map(p => p.id), updatedBy: auth.currentUser.email }));
    for(let i = 0; i < ops.length; i += 20){              // lotes pequeños: cada lote debe pesar menos de 10 MB
      const b = db.batch(); ops.slice(i, i + 20).forEach(f => f(b)); await b.commit();
    }
  }

  async function signIn(){
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt:"select_account" });
    const r = await auth.signInWithPopup(p);
    if(!isAdmin(r.user)){ const email = r.user && r.user.email; await auth.signOut(); throw { code:"not_admin", email }; }
    return r.user;
  }

  /* Botón oficial de Google (Google Identity Services): entrega un token de Google y Firebase inicia sesión
     con él, sin pasar por firebaseapp.com. Evita el error "missing initial state" en iPhone/Android. */
  const hasGis = /^\d+-[\w]+\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID);
  function loadGis(){
    return window.__gis || (window.__gis = new Promise((res, rej) => {
      if(window.google && google.accounts && google.accounts.id) return res();
      const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = () => res(); s.onerror = () => { window.__gis = null; rej({ code:"gis_load" }); };
      document.head.appendChild(s);
    }));
  }
  async function renderButton(el, onOk, onErr){
    await loadGis();
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID, ux_mode: "popup", auto_select: false, cancel_on_tap_outside: true,
      callback: async r => {
        try{
          const res = await auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(r.credential));
          if(!isAdmin(res.user)){ const email = res.user && res.user.email; await auth.signOut(); onErr({ code:"not_admin", email }); }
          else onOk(res.user);
        }catch(e){ onErr(e); }
      }
    });
    el.innerHTML = "";
    google.accounts.id.renderButton(el, { theme:"outline", size:"large", text:"signin_with", shape:"rectangular", locale:"es", width: Math.max(240, Math.min(400, el.clientWidth || 320)) });
  }

  return {
    load, publish, signIn, isAdmin, hasGis, renderButton,
    signOut: () => { try{ window.google && google.accounts && google.accounts.id.disableAutoSelect(); }catch(e){} return auth.signOut(); },
    user: () => auth.currentUser,
    onAuth: cb => auth.onAuthStateChanged(u => cb(u, isAdmin(u))),
    admins: ADMIN_UIDS
  };
})();
