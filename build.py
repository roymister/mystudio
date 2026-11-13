# Genera docs/ (la carpeta que publica GitHub Pages): index.html, store-data.json y polo-model.txt.
# Uso:  python build.py
import base64, json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
def leer(*p):
    with open(os.path.join(BASE, *p), encoding="utf-8") as f:
        return f.read()

CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
    "https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js",
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/geometries/DecalGeometry.js",
    # Firebase (inicio de sesión con Google y base de datos)
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
]

app = re.sub(r"/\*@include ([\w.-]+)\*/", lambda m: leer("src", m.group(1)), leer("src", "app.js"))
sim = "const SIM_MARKUP=" + json.dumps(leer("src", "sim-markup.html"), ensure_ascii=False) + ";\n" + leer("src", "sim.js")
css = leer("styles", "store.css") + "\n" + leer("styles", "simulador.css") + "\n" + leer("styles", "chatbot.css")
# Datos: usa la versión más reciente entre data/ (lo que editas en VS Code) y docs/ (lo que guardó el Panel del dueño)
OUT = os.path.join(BASE, "docs")
datos = json.loads(leer("data", "store-data.json"))
panel = os.path.join(OUT, "store-data.json")
if os.path.exists(panel):
    with open(panel, encoding="utf-8") as f:
        guardado = json.load(f)
    if guardado.get("updatedAt", 0) > datos.get("updatedAt", 0):
        datos = guardado
        with open(os.path.join(BASE, "data", "store-data.json"), "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        print("Se trajeron a data/ los cambios hechos desde el Panel del dueño.")
data = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

for nombre, codigo in (("app", app), ("simulador", sim)):
    if re.search(r"</script", codigo.replace("</`+`script>", ""), re.I):
        raise SystemExit(f'{nombre} contiene "</script" literal: escríbelo como "</"+"script>"')

page = ('<title>M&amp;Y Studio · Sublimación y personalizados</title><meta name="claude:viewport-fit-sides" content="cover">'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">'
        f'<style id="css">{css}</style><div id="root"></div>'
        + "".join(f'<script data-cdn src="{u}"></script>' for u in CDN)
        + f'<script id="store-data" type="application/json">{data}</script>'
        + f'<script id="sim-src">{sim}</script><script id="fb-src">{leer("src", "firebase-store.js")}</script><script id="app-src">{app}</script>')

os.makedirs(OUT, exist_ok=True)
with open(panel, "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, indent=1)
open(os.path.join(OUT, ".nojekyll"), "w").close()
# Página completa para GitHub Pages (en Claude, la plataforma agrega este mismo encabezado).
RESET = (":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}")
with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
    f.write('<!doctype html><html lang="es"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            f'<meta name="description" content="Polos, tazas, accesorios y regalos sublimados personalizados.">'
            f'<style>{RESET}</style></head><body>{page}</body></html>')
# Modelos 3D: assets/<nombre>.glb → docs/<nombre>-model.txt
for glb in sorted(os.listdir(os.path.join(BASE, "assets"))):
    if glb.endswith(".glb"):
        with open(os.path.join(BASE, "assets", glb), "rb") as f:
            modelo = base64.b64encode(f.read()).decode("ascii")
        with open(os.path.join(OUT, glb[:-4] + "-model.txt"), "w", encoding="ascii") as f:
            f.write(modelo)
print(f"OK  docs/index.html ({len(page)//1024} KB), docs/store-data.json y modelos 3D")
