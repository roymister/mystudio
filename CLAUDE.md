# Contexto para Claude Code

- Tienda de sublimados (Perú, soles). Textos de la interfaz siempre en español.
- Se publica en **GitHub Pages** desde la carpeta `docs/` (rama main). `docs/` se genera con `python build.py`; no la edites a mano.
- Sin bundler: React 18 UMD + `htm` (`html\`...\``), Three.js r128 con scripts globales de `examples/js`. No uses `import`/JSX ni paquetes npm en el navegador.
- Edita `src/`, `styles/` y `data/`. `src/app.js` incluye `art.js` y `admin.js` con `/*@include archivo.js*/`.
- Dentro de los scripts nunca escribas `</script` literal: usa `"</"+"script>"` (el build lo verifica).
- Datos: `data/store-data.json` (`settings`, `categories`, `products`, `slides`, `updatedAt`). Descuentos en % (`discount`, `bulk[].off`). Fotos como data URL JPG dentro del JSON.
- Guardado (`publishData` en `src/app.js`): en GitHub Pages hace PUT de `docs/store-data.json` con la API de GitHub y un token fine-grained guardado en localStorage (`sublipro-github`). Dentro de Claude usa `claude.use("artifact")`. `loadPublishedData` usa el JSON más reciente (`updatedAt`) entre el incrustado y `store-data.json`.
- `build.py` toma el `store-data.json` más reciente entre `data/` y `docs/`, para no perder lo guardado desde el panel.
- El simulador (`src/sim.js`) sirve para polo y taza: `window.PoloSimulator.mount(elemento, "polo-model.txt" | "taza-model.txt", {kind:"polo"|"taza"})` devuelve `{destroy, snapshot, summary}`. Textos y colores por tipo en `SIM_KINDS`; páginas por tipo en `SIM_PAGES` (`src/app.js`). Un producto se enlaza al personalizador con `sim: "polo"` o `sim: "taza"`. Estilos bajo `.sim`.
- `build.py` convierte cada `assets/*.glb` en `docs/<nombre>-model.txt`.
- Prueba local: `python build.py`, luego `cd docs` y `python -m http.server 8080`. Panel: `http://localhost:8080/#admin`.
