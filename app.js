// =====================================================
// SUPERCONTROL — app.js
// Lógica principal conectada a Firebase Firestore
// =====================================================

import { db, storage } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// =====================================================
// ESTADO GLOBAL
// =====================================================
let currentScreen = 'screen-home';
let currentSupervisor = null;
let currentReviewType = '';
let currentReviewTarget = '';
let currentReviewTargetId = '';
let answers = [];
let photos = [];
let photoFiles = [];
let preguntasCajera = [];
let preguntasBano = [];
let supervisoresData = [];
let cajerasData = [];
let personalBanosData = [];
let configData = {};
let modalCallback = null;

// =====================================================
// NAVEGACIÓN
// =====================================================
window.goTo = function(id) {
  document.getElementById(currentScreen).classList.remove('active');
  document.getElementById(id).classList.add('active');
  currentScreen = id;
  window.scrollTo(0, 0);

  // Cargar datos al entrar a ciertas pantallas
  if (id === 'screen-admin-supervisores') renderAdminSupervisores();
  if (id === 'screen-admin-cajeras') renderAdminCajeras();
  if (id === 'screen-admin-banos') renderAdminPersonalBanos();
  if (id === 'screen-admin-preguntas-cajas') renderAdminPreguntas('cajera');
  if (id === 'screen-admin-preguntas-banos') renderAdminPreguntas('bano');
  if (id === 'screen-admin-whatsapp') cargarWhatsapp();
  if (id === 'screen-admin-historial') cargarHistorial();
  if (id === 'screen-supervisor-panel') renderSupervisorPanel();
};

window.logout = function() {
  currentSupervisor = null;
  goTo('screen-home');
};

// =====================================================
// INICIALIZACIÓN
// =====================================================
async function init() {
  await cargarConfig();
  await Promise.all([
    cargarSupervisores(),
    cargarCajeras(),
    cargarPersonalBanos(),
    cargarPreguntas()
  ]);
  llenarSelectSupervisores();
}

init();

// =====================================================
// FIRESTORE — CARGAR DATOS
// =====================================================
async function cargarConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'general'));
    configData = snap.exists() ? snap.data() : { whatsapp: '593999999999', nombreContadora: 'Contadora' };
  } catch (e) { configData = { whatsapp: '593999999999', nombreContadora: 'Contadora' }; }
}

async function cargarSupervisores() {
  const snap = await getDocs(collection(db, 'supervisores'));
  supervisoresData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function cargarCajeras() {
  const snap = await getDocs(collection(db, 'cajeras'));
  cajerasData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function cargarPersonalBanos() {
  const snap = await getDocs(collection(db, 'personal_banos'));
  personalBanosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function cargarPreguntas() {
  const snapC = await getDocs(collection(db, 'preguntas_cajera'));
  preguntasCajera = snapC.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.orden||0)-(b.orden||0));

  const snapB = await getDocs(collection(db, 'preguntas_bano'));
  preguntasBano = snapB.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.orden||0)-(b.orden||0));

  // Si no hay preguntas, crear las por defecto
  if (preguntasCajera.length === 0) {
    const defaults = [
      '¿La cajera tiene el uniforme limpio y completo?',
      '¿El área de caja está limpia y ordenada?',
      '¿La cajera saluda correctamente al cliente?',
      '¿La pantalla de la caja funciona correctamente?',
      '¿El fondo de caja es correcto y está completo?',
      '¿Hay suficiente papel para recibos?'
    ];
    for (let i = 0; i < defaults.length; i++) {
      const ref2 = await addDoc(collection(db, 'preguntas_cajera'), { texto: defaults[i], orden: i });
      preguntasCajera.push({ id: ref2.id, texto: defaults[i], orden: i });
    }
  }

  if (preguntasBano.length === 0) {
    const defaults = [
      '¿El piso está limpio y sin agua estancada?',
      '¿Los inodoros están limpios y desinfectados?',
      '¿Hay papel higiénico disponible?',
      '¿Hay jabón en los dispensadores?',
      '¿Los espejos están limpios?',
      '¿El basurero está vacío o con tapa?',
      '¿No hay malos olores?'
    ];
    for (let i = 0; i < defaults.length; i++) {
      const ref2 = await addDoc(collection(db, 'preguntas_bano'), { texto: defaults[i], orden: i });
      preguntasBano.push({ id: ref2.id, texto: defaults[i], orden: i });
    }
  }
}

// =====================================================
// SUPERVISOR — LOGIN
// =====================================================
function llenarSelectSupervisores() {
  const sel = document.getElementById('sup-select');
  sel.innerHTML = '<option value="">— Seleccionar —</option>';
  supervisoresData.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
  });
}

window.loginSupervisor = async function() {
  const selId = document.getElementById('sup-select').value;
  const pass = document.getElementById('sup-pass').value;
  const err = document.getElementById('sup-error');

  if (!selId || !pass) { err.style.display = 'block'; return; }

  const supervisor = supervisoresData.find(s => s.id === selId);
  if (!supervisor || supervisor.clave !== pass) {
    err.style.display = 'block';
    return;
  }

  err.style.display = 'none';
  currentSupervisor = supervisor;
  document.getElementById('sup-welcome').textContent = supervisor.nombre.split(' ')[0];
  goTo('screen-supervisor-panel');
};

// =====================================================
// SUPERVISOR — PANEL
// =====================================================
function renderSupervisorPanel() {
  renderListaCajeras();
  renderListaBanos();
}

function initials(nombre) {
  return nombre.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

function renderListaCajeras() {
  const el = document.getElementById('list-cajas');
  if (!cajerasData.length) {
    el.innerHTML = `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:30px 0;font-size:14px">No hay cajeras registradas</div>`;
    return;
  }
  el.innerHTML = `<div class="section-divider">Cajeras activas</div>`;
  cajerasData.forEach(c => {
    el.innerHTML += `
      <div class="cajera-card" onclick="startReview('cajera','${c.nombre}','${c.caja||'Caja'}','${c.id}')">
        <div class="avatar">${initials(c.nombre)}</div>
        <div class="cajera-info">
          <div class="cajera-name">${c.nombre}</div>
          <div class="cajera-sub">${c.caja || 'Caja'}</div>
        </div>
        <div class="status-dot dot-pending"></div>
      </div>`;
  });
}

function renderListaBanos() {
  const el = document.getElementById('list-banos');
  if (!personalBanosData.length) {
    el.innerHTML = `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:30px 0;font-size:14px">No hay personal registrado</div>`;
    return;
  }
  el.innerHTML = `<div class="section-divider">Personal de limpieza</div>`;
  personalBanosData.forEach(p => {
    el.innerHTML += `
      <div class="cajera-card" onclick="startReview('bano','${p.nombre}','${p.bano||'Baño'}','${p.id}')">
        <div class="avatar" style="background:rgba(80,150,255,0.3)">${initials(p.nombre)}</div>
        <div class="cajera-info">
          <div class="cajera-name">${p.nombre}</div>
          <div class="cajera-sub">${p.bano || 'Baño'}</div>
        </div>
        <div class="status-dot dot-pending"></div>
      </div>`;
  });
}

window.switchTab = function(tab) {
  document.getElementById('list-cajas').style.display = tab === 'cajas' ? 'block' : 'none';
  document.getElementById('list-banos').style.display = tab === 'banos' ? 'block' : 'none';
  document.getElementById('tab-cajas').className = 'tab ' + (tab === 'cajas' ? 'active' : 'inactive');
  document.getElementById('tab-banos').className = 'tab ' + (tab === 'banos' ? 'active' : 'inactive');
};

// =====================================================
// REVISIÓN — FORMULARIO
// =====================================================
window.startReview = function(type, nombre, lugar, targetId) {
  currentReviewType = type;
  currentReviewTarget = `${nombre} — ${lugar}`;
  currentReviewTargetId = targetId;
  answers = [];
  photos = [];
  photoFiles = [];
  document.getElementById('review-title').textContent = lugar;
  renderPreguntas(type);
  goTo('screen-review');
};

function renderPreguntas(type) {
  const qs = type === 'cajera' ? preguntasCajera : preguntasBano;
  const container = document.getElementById('review-questions');
  container.innerHTML = '';
  answers = new Array(qs.length).fill(null);
  photos = new Array(qs.length).fill(null);
  photoFiles = new Array(qs.length).fill(null);

  qs.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = 'qcard-' + i;
    card.innerHTML = `
      <div class="question-text"><b>${i + 1}.</b> ${q.texto}</div>
      <div class="yn-row">
        <button class="yn-btn" id="btn-si-${i}" onclick="setAnswer(${i},'si')">✓ Sí</button>
        <button class="yn-btn" id="btn-no-${i}" onclick="setAnswer(${i},'no')">✗ No</button>
      </div>
      <div id="photo-area-${i}" style="display:none; margin-top:10px">
        <div class="photo-required" id="photo-btn-${i}" onclick="document.getElementById('file-${i}').click()">
          <div class="photo-required-text">📷 Adjuntar evidencia fotográfica</div>
          <div class="photo-required-sub">Obligatorio para continuar</div>
        </div>
        <input type="file" accept="image/*" id="file-${i}" style="display:none" onchange="photoSelected(${i}, this)">
      </div>`;
    container.appendChild(card);
  });
  updateProgress();
}

window.setAnswer = function(i, val) {
  answers[i] = val;
  document.getElementById('btn-si-' + i).className = 'yn-btn' + (val === 'si' ? ' selected-si' : '');
  document.getElementById('btn-no-' + i).className = 'yn-btn' + (val === 'no' ? ' selected-no' : '');
  const photoArea = document.getElementById('photo-area-' + i);
  if (val === 'no') {
    photoArea.style.display = 'block';
  } else {
    photoArea.style.display = 'none';
    photos[i] = null;
    photoFiles[i] = null;
  }
  updateProgress();
};

window.photoSelected = function(i, input) {
  if (input.files && input.files[0]) {
    photoFiles[i] = input.files[0];
    photos[i] = input.files[0].name;
    const btn = document.getElementById('photo-btn-' + i);
    btn.className = 'photo-required photo-attached';
    btn.innerHTML = `<div class="photo-required-text">✓ Foto adjuntada</div><div class="photo-required-sub">${photos[i]}</div>`;
  }
  updateProgress();
};

function updateProgress() {
  const qs = currentReviewType === 'cajera' ? preguntasCajera : preguntasBano;
  let done = 0;
  qs.forEach((_, i) => {
    if (answers[i] === 'si') done++;
    else if (answers[i] === 'no' && photos[i]) done++;
  });
  const pct = qs.length ? Math.round(done / qs.length * 100) : 0;
  document.getElementById('review-progress').style.width = pct + '%';
}

window.finishReview = async function() {
  const qs = currentReviewType === 'cajera' ? preguntasCajera : preguntasBano;

  for (let i = 0; i < qs.length; i++) {
    if (answers[i] === null) {
      alert(`Responde la pregunta ${i + 1} antes de enviar.`);
      return;
    }
    if (answers[i] === 'no' && !photos[i]) {
      alert(`La pregunta ${i + 1} marcada como NO requiere foto de evidencia.`);
      return;
    }
  }

  const btn = document.getElementById('finish-btn');
  btn.disabled = true;
  btn.textContent = 'Subiendo fotos...';

  // Subir fotos a Firebase Storage
  const fotoURLs = [];
  for (let i = 0; i < qs.length; i++) {
    if (photoFiles[i]) {
      try {
        const storageRef = ref(storage, `evidencias/${Date.now()}_${i}_${photoFiles[i].name}`);
        await uploadBytes(storageRef, photoFiles[i]);
        const url = await getDownloadURL(storageRef);
        fotoURLs[i] = url;
      } catch (e) {
        fotoURLs[i] = photos[i]; // fallback al nombre si falla upload
      }
    }
  }

  btn.textContent = 'Guardando reporte...';

  // Guardar en Firestore
  const reporte = {
    supervisor: currentSupervisor?.nombre || 'Desconocido',
    supervisorId: currentSupervisor?.id || '',
    tipo: currentReviewType,
    objetivo: currentReviewTarget,
    objetivoId: currentReviewTargetId,
    fecha: serverTimestamp(),
    respuestas: qs.map((q, i) => ({
      pregunta: q.texto,
      respuesta: answers[i],
      foto: fotoURLs[i] || null
    })),
    totalSi: answers.filter(a => a === 'si').length,
    totalNo: answers.filter(a => a === 'no').length,
    total: qs.length
  };

  try {
    await addDoc(collection(db, 'reportes'), reporte);
  } catch (e) {
    console.error('Error guardando reporte:', e);
  }

  // Armar mensaje WhatsApp
  const fecha = new Date().toLocaleString('es-EC');
  let msg = `*REPORTE DE SUPERVISIÓN — SuperControl*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 Supervisor: ${currentSupervisor?.nombre}\n`;
  msg += `📍 Revisado: ${currentReviewTarget}\n`;
  msg += `🕐 Fecha: ${fecha}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*RESULTADOS:*\n`;

  qs.forEach((q, i) => {
    const r = answers[i] === 'si' ? '✅ SÍ' : '❌ NO';
    msg += `${i + 1}. ${q.texto}\n   → ${r}\n`;
    if (answers[i] === 'no' && fotoURLs[i]) {
      msg += `   📷 Evidencia: ${fotoURLs[i]}\n`;
    }
    msg += '\n';
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 Resultado: ${reporte.totalSi}/${reporte.total} correctos\n`;
  if (reporte.totalNo > 0) {
    msg += `⚠️ ${reporte.totalNo} hallazgo(s) con evidencia fotográfica.\n`;
  }
  msg += `\n_Enviado desde SuperControl_`;

  const waNumber = configData.whatsapp || '593999999999';
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');

  document.getElementById('success-msg').textContent =
    `Reporte de "${currentReviewTarget}" guardado y enviado a WhatsApp correctamente.`;

  btn.disabled = false;
  btn.textContent = 'Enviar revisión ↗';

  goTo('screen-success');
};

// =====================================================
// ADMIN — LOGIN
// =====================================================
window.loginAdmin = async function() {
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;
  const err = document.getElementById('admin-error');

  // Verificar en Firestore
  try {
    const snap = await getDoc(doc(db, 'config', 'admin'));
    const adminData = snap.exists() ? snap.data() : { usuario: 'admin', clave: '1234' };
    if (user === adminData.usuario && pass === adminData.clave) {
      err.style.display = 'none';
      goTo('screen-admin-panel');
    } else {
      err.style.display = 'block';
    }
  } catch (e) {
    // Fallback local si no hay conexión
    if (user === 'admin' && pass === '1234') {
      err.style.display = 'none';
      goTo('screen-admin-panel');
    } else {
      err.style.display = 'block';
    }
  }
};

// =====================================================
// ADMIN — SUPERVISORES
// =====================================================
function renderAdminSupervisores() {
  const el = document.getElementById('list-supervisores-admin');
  el.innerHTML = '<div class="section-divider">Supervisores registrados</div>';
  if (!supervisoresData.length) {
    el.innerHTML += `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px 0;font-size:14px">No hay supervisores. Agrega el primero.</div>`;
    return;
  }
  supervisoresData.forEach(s => {
    el.innerHTML += `
      <div class="cajera-card">
        <div class="avatar">${initials(s.nombre)}</div>
        <div class="cajera-info">
          <div class="cajera-name">${s.nombre}</div>
          <div class="cajera-sub">Clave: ${'•'.repeat(s.clave?.length || 4)}</div>
        </div>
        <button class="icon-btn" onclick="editarSupervisor('${s.id}')" title="Editar">✏️</button>
        <button class="icon-btn" onclick="eliminarSupervisor('${s.id}')" title="Eliminar">🗑️</button>
      </div>`;
  });
}

window.abrirModalSupervisor = function(id = null) {
  const sup = id ? supervisoresData.find(s => s.id === id) : null;
  abrirModal(`
    <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px">
      ${sup ? 'Editar supervisor' : 'Nuevo supervisor'}
    </div>
    <div style="margin-bottom:12px">
      <div class="field-label">Nombre completo</div>
      <input class="field-input" id="m-sup-nombre" value="${sup?.nombre || ''}" placeholder="Nombre completo" />
    </div>
    <div style="margin-bottom:20px">
      <div class="field-label">Clave de acceso</div>
      <input class="field-input" id="m-sup-clave" type="password" value="${sup?.clave || ''}" placeholder="Clave nueva" />
    </div>
    <button class="action-btn btn-primary" onclick="guardarSupervisor('${id || ''}')">Guardar</button>
    <div style="height:10px"></div>
    <button class="action-btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
  `);
};

window.editarSupervisor = function(id) { window.abrirModalSupervisor(id); };

window.guardarSupervisor = async function(id) {
  const nombre = document.getElementById('m-sup-nombre').value.trim();
  const clave = document.getElementById('m-sup-clave').value;
  if (!nombre || !clave) { alert('Completa nombre y clave.'); return; }

  if (id) {
    await updateDoc(doc(db, 'supervisores', id), { nombre, clave });
    const idx = supervisoresData.findIndex(s => s.id === id);
    if (idx >= 0) supervisoresData[idx] = { ...supervisoresData[idx], nombre, clave };
  } else {
    const ref2 = await addDoc(collection(db, 'supervisores'), { nombre, clave });
    supervisoresData.push({ id: ref2.id, nombre, clave });
  }

  cerrarModal();
  llenarSelectSupervisores();
  renderAdminSupervisores();
};

window.eliminarSupervisor = async function(id) {
  if (!confirm('¿Eliminar este supervisor?')) return;
  await deleteDoc(doc(db, 'supervisores', id));
  supervisoresData = supervisoresData.filter(s => s.id !== id);
  llenarSelectSupervisores();
  renderAdminSupervisores();
};

// =====================================================
// ADMIN — CAJERAS
// =====================================================
function renderAdminCajeras() {
  const el = document.getElementById('list-cajeras-admin');
  el.innerHTML = '<div class="section-divider">Cajeras registradas</div>';
  if (!cajerasData.length) {
    el.innerHTML += `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px 0;font-size:14px">No hay cajeras registradas.</div>`;
    return;
  }
  cajerasData.forEach(c => {
    el.innerHTML += `
      <div class="cajera-card">
        <div class="avatar">${initials(c.nombre)}</div>
        <div class="cajera-info">
          <div class="cajera-name">${c.nombre}</div>
          <div class="cajera-sub">${c.caja || 'Sin caja asignada'}</div>
        </div>
        <button class="icon-btn" onclick="editarCajera('${c.id}')">✏️</button>
        <button class="icon-btn" onclick="eliminarCajera('${c.id}')">🗑️</button>
      </div>`;
  });
}

window.abrirModalCajera = function(id = null) {
  const c = id ? cajerasData.find(x => x.id === id) : null;
  abrirModal(`
    <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px">
      ${c ? 'Editar cajera' : 'Nueva cajera'}
    </div>
    <div style="margin-bottom:12px">
      <div class="field-label">Nombre completo</div>
      <input class="field-input" id="m-caj-nombre" value="${c?.nombre || ''}" placeholder="Nombre" />
    </div>
    <div style="margin-bottom:20px">
      <div class="field-label">Número / nombre de caja</div>
      <input class="field-input" id="m-caj-caja" value="${c?.caja || ''}" placeholder="Ej: Caja 1" />
    </div>
    <button class="action-btn btn-primary" onclick="guardarCajera('${id || ''}')">Guardar</button>
    <div style="height:10px"></div>
    <button class="action-btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
  `);
};

window.editarCajera = function(id) { window.abrirModalCajera(id); };

window.guardarCajera = async function(id) {
  const nombre = document.getElementById('m-caj-nombre').value.trim();
  const caja = document.getElementById('m-caj-caja').value.trim();
  if (!nombre) { alert('Ingresa el nombre.'); return; }

  if (id) {
    await updateDoc(doc(db, 'cajeras', id), { nombre, caja });
    const idx = cajerasData.findIndex(c => c.id === id);
    if (idx >= 0) cajerasData[idx] = { ...cajerasData[idx], nombre, caja };
  } else {
    const ref2 = await addDoc(collection(db, 'cajeras'), { nombre, caja });
    cajerasData.push({ id: ref2.id, nombre, caja });
  }
  cerrarModal();
  renderAdminCajeras();
};

window.eliminarCajera = async function(id) {
  if (!confirm('¿Eliminar esta cajera?')) return;
  await deleteDoc(doc(db, 'cajeras', id));
  cajerasData = cajerasData.filter(c => c.id !== id);
  renderAdminCajeras();
};

// =====================================================
// ADMIN — PERSONAL BAÑOS
// =====================================================
function renderAdminPersonalBanos() {
  const el = document.getElementById('list-personal-banos-admin');
  el.innerHTML = '<div class="section-divider">Personal registrado</div>';
  if (!personalBanosData.length) {
    el.innerHTML += `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px 0;font-size:14px">No hay personal registrado.</div>`;
    return;
  }
  personalBanosData.forEach(p => {
    el.innerHTML += `
      <div class="cajera-card">
        <div class="avatar" style="background:rgba(80,150,255,0.3)">${initials(p.nombre)}</div>
        <div class="cajera-info">
          <div class="cajera-name">${p.nombre}</div>
          <div class="cajera-sub">${p.bano || 'Sin baño asignado'}</div>
        </div>
        <button class="icon-btn" onclick="editarPersonalBano('${p.id}')">✏️</button>
        <button class="icon-btn" onclick="eliminarPersonalBano('${p.id}')">🗑️</button>
      </div>`;
  });
}

window.abrirModalPersonalBano = function(id = null) {
  const p = id ? personalBanosData.find(x => x.id === id) : null;
  abrirModal(`
    <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px">
      ${p ? 'Editar personal' : 'Nuevo personal de limpieza'}
    </div>
    <div style="margin-bottom:12px">
      <div class="field-label">Nombre completo</div>
      <input class="field-input" id="m-pb-nombre" value="${p?.nombre || ''}" placeholder="Nombre" />
    </div>
    <div style="margin-bottom:20px">
      <div class="field-label">Baño asignado</div>
      <input class="field-input" id="m-pb-bano" value="${p?.bano || ''}" placeholder="Ej: Baño Damas" />
    </div>
    <button class="action-btn btn-primary" onclick="guardarPersonalBano('${id || ''}')">Guardar</button>
    <div style="height:10px"></div>
    <button class="action-btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
  `);
};

window.editarPersonalBano = function(id) { window.abrirModalPersonalBano(id); };

window.guardarPersonalBano = async function(id) {
  const nombre = document.getElementById('m-pb-nombre').value.trim();
  const bano = document.getElementById('m-pb-bano').value.trim();
  if (!nombre) { alert('Ingresa el nombre.'); return; }

  if (id) {
    await updateDoc(doc(db, 'personal_banos', id), { nombre, bano });
    const idx = personalBanosData.findIndex(p => p.id === id);
    if (idx >= 0) personalBanosData[idx] = { ...personalBanosData[idx], nombre, bano };
  } else {
    const ref2 = await addDoc(collection(db, 'personal_banos'), { nombre, bano });
    personalBanosData.push({ id: ref2.id, nombre, bano });
  }
  cerrarModal();
  renderAdminPersonalBanos();
};

window.eliminarPersonalBano = async function(id) {
  if (!confirm('¿Eliminar este personal?')) return;
  await deleteDoc(doc(db, 'personal_banos', id));
  personalBanosData = personalBanosData.filter(p => p.id !== id);
  renderAdminPersonalBanos();
};

// =====================================================
// ADMIN — PREGUNTAS
// =====================================================
function renderAdminPreguntas(tipo) {
  const listId = tipo === 'cajera' ? 'list-preguntas-cajas' : 'list-preguntas-banos';
  const el = document.getElementById(listId);
  const qs = tipo === 'cajera' ? preguntasCajera : preguntasBano;
  el.innerHTML = '';

  if (!qs.length) {
    el.innerHTML = `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px 0;font-size:14px">No hay preguntas.</div>`;
    return;
  }

  qs.forEach((q, i) => {
    el.innerHTML += `
      <div class="pregunta-admin-card">
        <span style="color:rgba(255,255,255,0.4);font-size:13px;min-width:20px">${i + 1}.</span>
        <div class="pregunta-admin-text">${q.texto}</div>
        <button class="icon-btn" onclick="editarPregunta('${tipo}','${q.id}')">✏️</button>
        <button class="icon-btn" onclick="eliminarPregunta('${tipo}','${q.id}')">🗑️</button>
      </div>`;
  });
}

window.agregarPregunta = function(tipo) {
  abrirModal(`
    <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px">Nueva pregunta</div>
    <div style="margin-bottom:20px">
      <div class="field-label">Texto de la pregunta</div>
      <input class="field-input" id="m-preg-texto" placeholder="¿La cajera tiene uniforme?" />
    </div>
    <button class="action-btn btn-primary" onclick="guardarPregunta('${tipo}','')">Guardar</button>
    <div style="height:10px"></div>
    <button class="action-btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
  `);
};

window.editarPregunta = function(tipo, id) {
  const qs = tipo === 'cajera' ? preguntasCajera : preguntasBano;
  const q = qs.find(x => x.id === id);
  abrirModal(`
    <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px">Editar pregunta</div>
    <div style="margin-bottom:20px">
      <div class="field-label">Texto de la pregunta</div>
      <input class="field-input" id="m-preg-texto" value="${q?.texto || ''}" />
    </div>
    <button class="action-btn btn-primary" onclick="guardarPregunta('${tipo}','${id}')">Guardar</button>
    <div style="height:10px"></div>
    <button class="action-btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
  `);
};

window.guardarPregunta = async function(tipo, id) {
  const texto = document.getElementById('m-preg-texto').value.trim();
  if (!texto) { alert('Escribe la pregunta.'); return; }

  const colName = tipo === 'cajera' ? 'preguntas_cajera' : 'preguntas_bano';
  const arr = tipo === 'cajera' ? preguntasCajera : preguntasBano;

  if (id) {
    await updateDoc(doc(db, colName, id), { texto });
    const idx = arr.findIndex(q => q.id === id);
    if (idx >= 0) arr[idx].texto = texto;
  } else {
    const orden = arr.length;
    const ref2 = await addDoc(collection(db, colName), { texto, orden });
    arr.push({ id: ref2.id, texto, orden });
  }

  cerrarModal();
  renderAdminPreguntas(tipo);
};

window.eliminarPregunta = async function(tipo, id) {
  if (!confirm('¿Eliminar esta pregunta?')) return;
  const colName = tipo === 'cajera' ? 'preguntas_cajera' : 'preguntas_bano';
  await deleteDoc(doc(db, colName, id));
  if (tipo === 'cajera') preguntasCajera = preguntasCajera.filter(q => q.id !== id);
  else preguntasBano = preguntasBano.filter(q => q.id !== id);
  renderAdminPreguntas(tipo);
};

// =====================================================
// ADMIN — WHATSAPP
// =====================================================
function cargarWhatsapp() {
  document.getElementById('wa-numero').value = configData.whatsapp || '';
  document.getElementById('wa-nombre').value = configData.nombreContadora || '';
}

window.guardarWhatsapp = async function() {
  const numero = document.getElementById('wa-numero').value.trim();
  const nombre = document.getElementById('wa-nombre').value.trim();
  if (!numero) { alert('Ingresa el número.'); return; }

  await setDoc(doc(db, 'config', 'general'), { whatsapp: numero, nombreContadora: nombre }, { merge: true });
  configData.whatsapp = numero;
  configData.nombreContadora = nombre;

  const ok = document.getElementById('wa-ok');
  ok.style.display = 'block';
  setTimeout(() => { ok.style.display = 'none'; }, 3000);
};

// =====================================================
// ADMIN — HISTORIAL
// =====================================================
async function cargarHistorial() {
  const el = document.getElementById('historial-list');
  el.innerHTML = '<div class="spinner"></div>';

  try {
    const snap = await getDocs(query(collection(db, 'reportes'), orderBy('fecha', 'desc')));
    if (snap.empty) {
      el.innerHTML = `<div style="color:rgba(255,255,255,0.5);text-align:center;padding:40px 0;font-size:14px">No hay reportes aún.</div>`;
      return;
    }

    el.innerHTML = `<div class="section-divider">Reportes enviados</div>`;
    snap.docs.forEach(d => {
      const r = d.data();
      const fecha = r.fecha?.toDate ? r.fecha.toDate().toLocaleString('es-EC') : 'Fecha desconocida';
      const noCount = r.totalNo || 0;
      el.innerHTML += `
        <div class="historial-card">
          <div class="historial-header">
            <div class="historial-nombre">${r.objetivo || '—'}</div>
            <span style="font-size:11px;padding:3px 8px;border-radius:20px;background:${noCount > 0 ? 'rgba(220,60,60,0.2)' : 'rgba(30,200,100,0.2)'};color:${noCount > 0 ? 'rgba(255,100,100,1)' : 'rgba(80,220,130,1)'}">
              ${noCount > 0 ? `${noCount} hallazgo(s)` : '✓ OK'}
            </span>
          </div>
          <div class="historial-detalle">👤 ${r.supervisor} · ${r.totalSi}/${r.total} correctos</div>
          <div class="historial-detalle" style="margin-top:4px">🕐 ${fecha}</div>
        </div>`;
    });
  } catch (e) {
    el.innerHTML = `<div style="color:rgba(255,120,80,1);text-align:center;padding:40px 0;font-size:14px">Error cargando historial: ${e.message}</div>`;
  }
}

// =====================================================
// MODAL
// =====================================================
function abrirModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

window.cerrarModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
};

document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) cerrarModal();
});
