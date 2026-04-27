/**
 * app.js — DataVivienda (versión corregida)
 * Fixes: dashboard, tabla de registros, importación, contador
 */

'use strict';

// ═══════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════
let todosLosRegistros = [];
let chartMunicipio = null;
let chartTipo      = null;
let chartFracc     = null;

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════
function formatPeso(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n);
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN ENTRE PESTAÑAS
// ═══════════════════════════════════════════════════════
function initNavegacion() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanels  = document.querySelectorAll('.tab-panel');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      navButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');

      const targetId = button.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      // Cargar datos al entrar a esas secciones
      if (targetId === 'dashboard' || targetId === 'base-datos') {
        cargarRegistros();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
// CONTADOR TOTAL (sidebar)
// ═══════════════════════════════════════════════════════
async function actualizarContador() {
  try {
    const resp = await fetch('/api/stats/count');
    const data = await resp.json();
    const el = document.getElementById('contadorTotal');
    if (el) el.textContent = (data.total || 0).toLocaleString('es-MX');
  } catch (e) {
    console.warn('No se pudo actualizar el contador:', e);
  }
}

// ═══════════════════════════════════════════════════════
// CAPTURA MANUAL
// ═══════════════════════════════════════════════════════
function initFormulario() {
  const capturaForm = document.getElementById('capturaForm');
  if (!capturaForm) return;

  capturaForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(capturaForm);
    const data = Object.fromEntries(formData.entries());

    // Limpiar campos vacíos → null para PostgreSQL
    for (let key in data) {
      if (data[key] === '') data[key] = null;
    }

    const btnSubmit = capturaForm.querySelector('[type="submit"]');
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando…';

    try {
      const response = await fetch('/api/capturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        mostrarNotificacion('✅ Registro guardado con éxito', 'success');
        capturaForm.reset();
        actualizarContador();
      } else {
        mostrarNotificacion('❌ Error: ' + (result.error || 'Error desconocido'), 'error');
      }
    } catch (err) {
      console.error('Error de red:', err);
      mostrarNotificacion('❌ Error de conexión con el servidor', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginal;
    }
  });
}

// ═══════════════════════════════════════════════════════
// NOTIFICACIONES (reemplaza los alert())
// ═══════════════════════════════════════════════════════
function mostrarNotificacion(msg, tipo = 'success') {
  // Reusar o crear elemento
  let notif = document.getElementById('globalNotif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'globalNotif';
    notif.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      padding: 14px 20px; border-radius: 6px; font-size: 13px;
      font-family: 'IBM Plex Sans', sans-serif; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      transition: opacity .3s ease; max-width: 360px;
    `;
    document.body.appendChild(notif);
  }

  notif.textContent = msg;
  notif.style.opacity = '1';

  if (tipo === 'success') {
    notif.style.background = '#0f291a';
    notif.style.border = '1px solid #22c55e';
    notif.style.color = '#22c55e';
  } else {
    notif.style.background = '#2a0a12';
    notif.style.border = '1px solid #f43f5e';
    notif.style.color = '#f43f5e';
  }

  clearTimeout(notif._timeout);
  notif._timeout = setTimeout(() => { notif.style.opacity = '0'; }, 4000);
}

// ═══════════════════════════════════════════════════════
// CARGAR REGISTROS DESDE EL SERVIDOR
// ═══════════════════════════════════════════════════════
async function cargarRegistros() {
  try {
    const resp = await fetch('/api/registros');
    if (!resp.ok) throw new Error('Error HTTP ' + resp.status);
    todosLosRegistros = await resp.json();

    renderTablaRegistros(todosLosRegistros);
    renderDashboard(todosLosRegistros);
    actualizarContador();
  } catch (e) {
    console.error('Error al cargar registros:', e);
    mostrarNotificacion('❌ No se pudieron cargar los registros', 'error');
  }
}

// ═══════════════════════════════════════════════════════
// TABLA DE BASE DE DATOS
// ═══════════════════════════════════════════════════════
function renderTablaRegistros(registros) {
  const tbody = document.getElementById('tablaRegistros');
  if (!tbody) return;

  if (!registros.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Sin registros en la base de datos.</td></tr>`;
    return;
  }

  tbody.innerHTML = registros.map((r, i) => {
    const precio = r.precio_lista ? formatPeso(r.precio_lista) : '—';
    const estatusColor = {
      'ACTIVO':   '#22c55e',
      'INACTIVO': '#f43f5e',
      'PAUSA':    '#f59e0b',
    }[r.estatus] || '#6b7a99';

    return `
      <tr>
        <td style="font-family:'IBM Plex Mono',monospace;color:#4a5568;font-size:11px">${r.id}</td>
        <td>${r.tipologia || '—'}</td>
        <td>${r.municipio || '—'}</td>
        <td>${r.desarrollador || '—'}</td>
        <td style="font-family:'IBM Plex Mono',monospace;color:#3d7fff">${precio}</td>
        <td>
          <span style="
            display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;
            font-weight:600;text-transform:uppercase;letter-spacing:.04em;
            background:${estatusColor}22;color:${estatusColor}
          ">${r.estatus || 'ACTIVO'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function renderDashboard(registros) {
  const total    = registros.length;
  const promedio = total
    ? registros.reduce((s, r) => s + (parseFloat(r.precio_lista) || 0), 0) / total
    : 0;
  const vertical   = registros.filter(r => String(r.tipologia || '').toLowerCase() === 'vertical').length;
  const horizontal = registros.filter(r => String(r.tipologia || '').toLowerCase() === 'horizontal').length;

  // KPIs
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('kpiTotal',    total.toLocaleString('es-MX'));
  set('kpiPromedio', total ? formatPeso(promedio) : '—');
  set('kpiNueva',    vertical.toLocaleString('es-MX'));
  set('kpiUsada',    horizontal.toLocaleString('es-MX'));

  if (!total) return; // No graficar si no hay datos

  const paleta = ['#3d7fff','#a855f7','#ec4899','#22c55e','#f59e0b','#14b8a6','#f43f5e'];

  // ─ Gráfica: Municipio ─────────────────────────────
  const municipioConteo = {};
  registros.forEach(r => {
    const m = r.municipio || 'N/D';
    municipioConteo[m] = (municipioConteo[m] || 0) + 1;
  });

  if (chartMunicipio) chartMunicipio.destroy();
  const ctxM = document.getElementById('chartGrupo');
  if (ctxM) {
    chartMunicipio = new Chart(ctxM.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(municipioConteo),
        datasets: [{
          data: Object.values(municipioConteo),
          backgroundColor: paleta,
          borderColor: '#161b24',
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#6b7a99', padding: 12, font: { family: 'IBM Plex Sans', size: 11 } } },
        },
      },
    });
  }

  // ─ Gráfica: Tipología ─────────────────────────────
  if (chartTipo) chartTipo.destroy();
  const ctxT = document.getElementById('chartTipo');
  if (ctxT) {
    chartTipo = new Chart(ctxT.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Vertical', 'Horizontal'],
        datasets: [{
          label: 'Cantidad',
          data: [vertical, horizontal],
          backgroundColor: ['rgba(61,127,255,.7)', 'rgba(168,85,247,.7)'],
          borderColor: ['#3d7fff', '#a855f7'],
          borderWidth: 1.5, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7a99', font: { family: 'IBM Plex Sans', size: 11 } }, grid: { color: '#2a3347' } },
          y: { beginAtZero: true, ticks: { color: '#6b7a99', font: { family: 'IBM Plex Mono', size: 11 }, stepSize: 1 }, grid: { color: '#2a3347' } },
        },
      },
    });
  }

  // ─ Gráfica: Top 10 fraccionamientos por precio promedio ─
  const fraccMap = {};
  registros.forEach(r => {
    const f = r.fraccionamiento || 'N/D';
    if (!fraccMap[f]) fraccMap[f] = { suma: 0, count: 0 };
    fraccMap[f].suma  += parseFloat(r.precio_lista) || 0;
    fraccMap[f].count += 1;
  });

  const top10 = Object.entries(fraccMap)
    .filter(([, v]) => v.suma > 0)
    .map(([k, v]) => ({ nombre: k, promedio: v.suma / v.count }))
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, 10);

  if (chartFracc) chartFracc.destroy();
  const ctxF = document.getElementById('chartFracc');
  if (ctxF && top10.length) {
    chartFracc = new Chart(ctxF.getContext('2d'), {
      type: 'bar',
      data: {
        labels: top10.map(f => f.nombre),
        datasets: [{
          label: 'Precio Promedio',
          data: top10.map(f => f.promedio),
          backgroundColor: 'rgba(61,127,255,.7)',
          borderColor: '#3d7fff',
          borderWidth: 1.5, borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + formatPeso(ctx.raw) } },
        },
        scales: {
          x: { ticks: { color: '#6b7a99', font: { family: 'IBM Plex Mono', size: 10 }, callback: v => '$' + Intl.NumberFormat('es-MX').format(v) }, grid: { color: '#2a3347' } },
          y: { ticks: { color: '#6b7a99', font: { family: 'IBM Plex Sans', size: 11 } }, grid: { display: false } },
        },
      },
    });
  }
}

// ─── Filtro del dashboard ──────────────────────────────────────────────────
function initFiltroDashboard() {
  const btnFiltrar      = document.getElementById('btnFiltrar');
  const btnLimpiarFiltro = document.getElementById('btnLimpiarFiltro');
  const inputFiltro     = document.getElementById('filtroFraccionamiento');

  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', () => {
      const q = inputFiltro?.value.trim().toLowerCase() || '';
      const filtrados = q
        ? todosLosRegistros.filter(r => String(r.fraccionamiento || '').toLowerCase().includes(q))
        : todosLosRegistros;
      renderDashboard(filtrados);
    });
  }

  if (btnLimpiarFiltro) {
    btnLimpiarFiltro.addEventListener('click', () => {
      if (inputFiltro) inputFiltro.value = '';
      renderDashboard(todosLosRegistros);
    });
  }

  if (inputFiltro) {
    inputFiltro.addEventListener('keydown', e => {
      if (e.key === 'Enter') btnFiltrar?.click();
    });
  }
}

// ═══════════════════════════════════════════════════════
// IMPORTAR EXCEL
// ═══════════════════════════════════════════════════════
function initImportacion() {
  const dropZone    = document.getElementById('dropZone');
  const fileInput   = document.getElementById('archivoExcel');
  const importFile  = document.getElementById('importFile');
  const importName  = document.getElementById('importFileName');
  const btnImportar = document.getElementById('btnImportar');

  if (!dropZone || !fileInput || !btnImportar) return;

  let archivoSeleccionado = null;

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) seleccionarArchivo(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) seleccionarArchivo(fileInput.files[0]);
  });

  btnImportar.addEventListener('click', async () => {
    if (!archivoSeleccionado) {
      mostrarNotificacion('⚠️ Selecciona un archivo Excel primero', 'error');
      return;
    }

    const textoOriginal = btnImportar.textContent;
    btnImportar.disabled = true;
    btnImportar.textContent = 'Importando… por favor espera';

    // Mostrar barra de progreso si existe
    const pw = document.getElementById('progressWrap');
    const pb = document.getElementById('progressBar');
    const pl = document.getElementById('progressLabel');
    if (pw) { pw.classList.remove('hidden'); }
    if (pb) { pb.style.width = '60%'; }
    if (pl) { pl.textContent = 'Enviando archivo…'; }

    const formData = new FormData();
    formData.append('archivoExcel', archivoSeleccionado);

    try {
      if (pb) pb.style.width = '80%';
      if (pl) pl.textContent = 'Procesando registros…';

      const resp = await fetch('/api/importar', { method: 'POST', body: formData });
      const data = await resp.json();

      if (pb) pb.style.width = '100%';
      if (pl) pl.textContent = 'Completado';
      setTimeout(() => { if (pw) pw.classList.add('hidden'); }, 800);
      async function importarExcel() {
    const input = document.getElementById("fileInput");

    if (!input.files.length) {
        alert("Selecciona un archivo");
        return;
    }

    const formData = new FormData();
    formData.append("file", input.files[0]);

    const res = await fetch(`${API}/importar`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    alert(`${data.message}\nInsertados: ${data.insertados}\nDuplicados: ${data.duplicados}`);

    // actualizar dashboard y contador
    cargarDashboard();
}

      // Mostrar resultado
      const resultEl = document.getElementById('importResult');
      if (data.ok) {
        mostrarNotificacion(`✅ ${data.mensaje}`, 'success');
        if (resultEl) {
          resultEl.className = 'import-result success';
          resultEl.innerHTML = `✓ ${data.mensaje}<br><small>${data.insertados} insertados${data.errores > 0 ? ` · ${data.errores} con error` : ''}</small>`;
          resultEl.classList.remove('hidden');
        }
        actualizarContador();
      } else {
        const msg = data.error || 'Error al importar';
        mostrarNotificacion('❌ ' + msg, 'error');
        if (resultEl) {
          resultEl.className = 'import-result error';
          resultEl.textContent = msg;
          resultEl.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (pw) pw.classList.add('hidden');
      mostrarNotificacion('❌ Error de conexión al importar', 'error');
    } finally {
      btnImportar.disabled = false;
      btnImportar.textContent = textoOriginal;
    }
  });

  function seleccionarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      mostrarNotificacion('⚠️ Solo se aceptan archivos .xlsx o .xls', 'error');
      return;
    }
    archivoSeleccionado = file;
    if (importName)  importName.textContent = file.name;
    if (importFile)  importFile.classList.remove('hidden');
    btnImportar.disabled = false;

    // Ocultar resultado anterior
    const resultEl = document.getElementById('importResult');
    if (resultEl) resultEl.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initNavegacion();
  initFormulario();
  initFiltroDashboard();
  initImportacion();
  actualizarContador();// Cargar contador al inicio
  cargarDashboard();
});
