# 🛒 SuperControl — Sistema de Supervisión de Supermercado

App web adaptable (móvil y escritorio) para supervisar cajas y baños de supermercado.

---

## 🚀 GUÍA DE INSTALACIÓN PASO A PASO

### PASO 1 — Subir a GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en **"New repository"**
3. Ponle nombre: `supercontrol`
4. Déjalo en **Public** (para que Firebase Hosting pueda desplegarlo gratis)
5. Clic en **"Create repository"**
6. En tu computadora, abre la terminal y ejecuta:

```bash
cd supercontrol
git init
git add .
git commit -m "Primer commit - SuperControl"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/supercontrol.git
git push -u origin main
```

---

### PASO 2 — Crear proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"**
3. Nombre: `supercontrol` → Siguiente → Crear proyecto
4. En el menú lateral, activa estos servicios:

#### Firestore Database
- Menú → **Firestore Database** → Crear base de datos
- Selecciona **Modo de producción**
- Elige la región más cercana (ej: `us-central1`)

#### Storage
- Menú → **Storage** → Comenzar
- Acepta las reglas predeterminadas

#### Hosting
- Menú → **Hosting** → Comenzar
- Sigue el asistente (instalarás Firebase CLI)

---

### PASO 3 — Conectar Firebase a tu código

1. En Firebase Console → Menú de tu proyecto → **Configuración del proyecto** (ícono ⚙️)
2. Baja hasta **"Tus apps"** → Clic en `</>` (Web)
3. Registra la app con nombre `supercontrol`
4. Copia los valores que te da Firebase y **pégalos** en `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI.firebaseapp.com",
  projectId: "PEGA_AQUI_TU_PROJECT_ID",
  storageBucket: "PEGA_AQUI.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId: "PEGA_AQUI_TU_APP_ID"
};
```

5. Guarda el archivo y haz commit:

```bash
git add src/firebase.js
git commit -m "Agregar configuración Firebase"
git push
```

---

### PASO 4 — Desplegar en Firebase Hosting

1. Instala Firebase CLI (si no lo tienes):

```bash
npm install -g firebase-tools
```

2. Inicia sesión:

```bash
firebase login
```

3. Enlaza tu proyecto:

```bash
firebase use --add
# Selecciona tu proyecto supercontrol
```

4. Despliega:

```bash
firebase deploy
```

✅ ¡Listo! Firebase te dará una URL como:
`https://supercontrol-xxxxx.web.app`

---

### PASO 5 — Configurar datos iniciales

Al abrir la app por primera vez:

1. Ve a **Administrador** → usuario: `admin` / clave: `1234`
2. Cambia la clave de admin desde **Firestore Console** → colección `config` → documento `admin`
3. Agrega supervisores, cajeras y personal de limpieza desde el panel
4. Configura el número de WhatsApp de la contadora

---

## 📁 Estructura de archivos

```
supercontrol/
├── index.html              # App principal
├── firebase.json           # Configuración Firebase
├── firestore.rules         # Reglas de seguridad Firestore
├── firestore.indexes.json  # Índices Firestore
├── storage.rules           # Reglas de Firebase Storage
├── .gitignore
├── public/
│   └── manifest.json       # PWA manifest
└── src/
    ├── firebase.js         # ⚠️ Aquí va tu config de Firebase
    ├── app.js              # Lógica principal
    └── style.css           # Estilos
```

---

## 🗃️ Colecciones en Firestore

| Colección | Contenido |
|---|---|
| `supervisores` | nombre, clave |
| `cajeras` | nombre, caja |
| `personal_banos` | nombre, bano |
| `preguntas_cajera` | texto, orden |
| `preguntas_bano` | texto, orden |
| `reportes` | supervisor, objetivo, respuestas, fotos, fecha |
| `config/general` | whatsapp, nombreContadora |
| `config/admin` | usuario, clave |

---

## 📱 Instalar como app en el celular

Una vez desplegado en Firebase Hosting:

1. Abre la URL en Chrome (Android) o Safari (iPhone)
2. Android: toca el menú → **"Agregar a pantalla de inicio"**
3. iPhone: toca compartir → **"Añadir a pantalla de inicio"**

¡La app se instala como una app nativa!

---

## 🆘 Soporte

Si tienes problemas, revisa:
- La consola del navegador (F12 → Console)
- Firebase Console → Firestore → ver si los datos se están guardando
- Que las reglas de Firestore estén bien desplegadas (`firebase deploy --only firestore:rules`)
