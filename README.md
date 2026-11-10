# SubliPro · Tienda de sublimados

Tienda web de una sola página: carrusel, catálogo por categorías, carrito con pedido por WhatsApp, cotizador por volumen, personalizador de polos 3D y **Panel del dueño** para editar todo sin tocar código.

Tecnología: **React 18 + htm** (JSX sin compilación) y **Three.js r128** para el polo 3D. No necesita `npm install`; las librerías se cargan desde CDN. Para armar la página solo hace falta **Python**.

---

## 1. Estructura

```
sublipro-tienda/
├── build.py                 → arma la carpeta docs/ (lo que publica GitHub Pages)
├── src/
│   ├── app.js               → app: datos, carrito, rutas, páginas y guardado
│   ├── art.js               → ilustraciones SVG de cada tipo de producto
│   ├── admin.js             → Panel del dueño y acceso con GitHub
│   ├── sim.js               → simulador 3D del polo
│   └── sim-markup.html      → HTML de los paneles del simulador
├── styles/
│   ├── store.css            → estilos de la tienda (colores en :root)
│   └── simulador.css        → estilos del simulador (todo bajo .sim)
├── data/store-data.json     → productos, categorías, carrusel y ajustes
├── assets/polo.glb, taza.glb → modelos 3D (polo y taza)
└── docs/                    → página final generada (no editar a mano)
```

## 2. Probar en tu computadora

```bash
python build.py
cd docs
python -m http.server 8080
```

Abre **http://localhost:8080**. Para apagar el servidor usa **Ctrl + C**.

---

## 3. Publicar en GitHub Pages (gratis)

1. Crea una cuenta en **github.com**.
2. Crea un repositorio **público** llamado, por ejemplo, `sublipro`: botón **New**, pones el nombre, eliges *Public* y **Create repository**.
3. Sube los archivos: en el repositorio entra a **Add file → Upload files**, arrastra **todo el contenido** de la carpeta del proyecto (incluida `docs/`) y presiona **Commit changes**.
4. Activa la página: **Settings → Pages → Build and deployment**. En *Source* elige **Deploy from a branch**, luego la rama **main**, la carpeta **/docs** y **Save**.
5. Espera 1 o 2 minutos. Tu tienda queda en:
   **https://TU-USUARIO.github.io/sublipro/**

Ese es el enlace que compartes con tus clientes.

---

## 4. Panel del dueño en GitHub

### Crear tu token (una sola vez)
1. En GitHub: tu foto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Nombre: `Panel tienda`. Expiración: la que prefieras (por ejemplo 1 año).
3. **Repository access:** *Only select repositories* → elige `sublipro`.
4. **Permissions → Repository permissions → Contents:** **Read and write**.
5. **Generate token** y copia el código (empieza con `github_pat_…`). Guárdalo en un lugar seguro: es como una contraseña.

### Usar el panel
1. Abre **https://TU-USUARIO.github.io/sublipro/#admin**
2. Escribe tu usuario, el repositorio y el token, y presiona **Entrar**. El navegador te recuerda, así que la próxima vez basta con abrir `#admin`.
3. Edita productos, fotos, precios, descuentos, categorías, carrusel y ajustes.
4. Presiona **Publicar cambios**. Se guarda `docs/store-data.json` en tu repositorio y los clientes ven los cambios en **1 o 2 minutos**.

Tus clientes **no ven** el panel: sin token no se puede entrar.

---

## 5. Si cambias el código más adelante

1. Edita en VS Code (`src/`, `styles/`).
2. Ejecuta `python build.py`.
3. En GitHub sube **solo los archivos que cambiaste dentro de `docs/`**, normalmente `docs/index.html`.

> **Importante:** no subas `docs/store-data.json` desde tu computadora, porque borrarías los cambios que hiciste en el Panel del dueño. Súbelo solo si editaste `data/store-data.json` a propósito.

## 6. Cambios frecuentes en el código

- **Colores de la marca:** variables en `:root` de `styles/store.css` (`--navy`, `--primary`, `--cyan`, `--pink`).
- **Nuevo tipo de ilustración:** una entrada en `ART` (`src/art.js`) y en `ART_CHOICES` (`src/admin.js`).
- **Nueva página:** componente en `src/app.js`, su nombre en `fixedRoutes` y su caso en `App()`.

## Fotos de productos

Las fotos de referencia vienen de **Unsplash** (licencia gratuita, permite uso comercial) y se cargan desde `images.unsplash.com`. Si una foto no carga, la tienda muestra la ilustración del producto. Para cambiar una foto, entra al Panel del dueño, abre el producto y usa **Subir foto** (tu propia foto) o **Pegar enlace**. Lo ideal es reemplazarlas con fotos reales de tus productos.

## Créditos

- Polo: "men POLO shirt, camouflage pattern" de funlab117 (Sketchfab), licencia CC BY 4.0. Modificado: se retiró el estampado original. El crédito debe seguir visible en la página.
- Taza: "Taza" de little bread 34 (Sketchfab), licencia Sketchfab Standard. Modificado: se retiraron las texturas para cambiar el color.
