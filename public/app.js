/**
 * app.js — DataVivienda Dashboard Comparativo
 * Versión corregida y completa
 */

'use strict';

// ═══════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════
let todosLosRegistros = [];
let chartFracc = null;

const PALETA_DEVS = ['#3d7fff','#a855f7','#ec4899','#22c55e','#f59e0b','#14b8a6'];

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════
function formatPeso(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n);
}

function calcularModa(arr) {
  if (!arr || !arr.length) return null;
  const conteo = {};
  let maxVal = arr[0], maxN = 0;
  arr.forEach(v => {
    conteo[v] = (conteo[v] || 0) + 1;
    if (conteo[v] > maxN) { maxN = conteo[v]; maxVal = v; }
  });
  return maxVal;
}

// ═══════════════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════════════
function mostrarNotificacion(msg, tipo = 'success') {
  let notif = document.getElementById('globalNotif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'globalNotif';
    notif.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:9999;
      padding:14px 20px;border-radius:6px;font-size:13px;
      font-family:'IBM Plex Sans',sans-serif;font-weight:500;
      box-shadow:0 8px 24px rgba(0,0,0,.4);
      transition:opacity .3s ease;max-width:360px;
    `;
    document.body.appendChild(notif);
  }
  notif.textContent = msg;
  notif.style.opacity = '1';
  notif.style.background = tipo === 'success' ? '#0f291a' : '#2a0a12';
  notif.style.border      = tipo === 'success' ? '1px solid #22c55e' : '1px solid #f43f5e';
  notif.style.color       = tipo === 'success' ? '#22c55e' : '#f43f5e';
  clearTimeout(notif._t);
  notif._t = setTimeout(() => { notif.style.opacity = '0'; }, 4000);
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════
function initNavegacion() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.add('active');
      if (btn.dataset.target === 'dashboard' || btn.dataset.target === 'base-datos') {
        cargarRegistros();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
// CONTADOR SIDEBAR
// ═══════════════════════════════════════════════════════
async function actualizarContador() {
  try {
    const resp = await fetch('/api/stats/count');
    const data = await resp.json();
    const el = document.getElementById('contadorTotal');
    if (el) el.textContent = (data.total || 0).toLocaleString('es-MX');
  } catch (e) { /* silencioso */ }
}

// ═══════════════════════════════════════════════════════
// CAPTURA MANUAL
// ═══════════════════════════════════════════════════════
function initFormulario() {
  const form = document.getElementById('capturaForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    const btn = form.querySelector('[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const r = await fetch('/api/capturas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const res = await r.json();
      if (r.ok) { mostrarNotificacion('✅ Registro guardado con éxito', 'success'); form.reset(); actualizarContador(); }
      else mostrarNotificacion('❌ Error: ' + (res.error || 'Desconocido'), 'error');
    } catch { mostrarNotificacion('❌ Error de conexión', 'error'); }
    finally { btn.disabled = false; btn.textContent = orig; }
  });
}

// ═══════════════════════════════════════════════════════
// CARGAR REGISTROS
// ═══════════════════════════════════════════════════════
async function cargarRegistros() {
  try {
    const resp = await fetch('/api/registros');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    todosLosRegistros = await resp.json();
    renderTablaRegistros(todosLosRegistros);
    renderDashboard(todosLosRegistros, false);
    actualizarContador();
  } catch (e) {
    console.error('Error al cargar:', e);
    mostrarNotificacion('❌ No se pudieron cargar los registros', 'error');
  }
}

// ═══════════════════════════════════════════════════════
// TABLA BASE DE DATOS
// ═══════════════════════════════════════════════════════
function renderTablaRegistros(registros) {
  const tbody = document.getElementById('tablaRegistros');
  if (!tbody) return;
  if (!registros.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Sin registros en la base de datos.</td></tr>`;
    return;
  }
  const col = { 'ACTIVO':'#22c55e','INACTIVO':'#f43f5e','PAUSA':'#f59e0b' };
  tbody.innerHTML = registros.map(r => {
    const c = col[r.estatus] || '#6b7a99';
    return `<tr>
      <td style="font-family:'IBM Plex Mono',monospace;color:#4a5568;font-size:11px">${r.id}</td>
      <td>${r.tipologia||'—'}</td><td>${r.municipio||'—'}</td>
      <td>${r.desarrollador||'—'}</td><td>${r.fraccionamiento||'—'}</td>
      <td style="font-family:'IBM Plex Mono',monospace;color:#3d7fff">${r.precio_lista?formatPeso(r.precio_lista):'—'}</td>
      <td><span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;text-transform:uppercase;background:${c}22;color:${c}">${r.estatus||'ACTIVO'}</span></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// DASHBOARD COMPARATIVO
// ═══════════════════════════════════════════════════════
function renderDashboard(registros, isFiltrado) {
  // Agrupar por desarrollador
  const grupos = {};
  if (isFiltrado && registros.length) {
    registros.forEach(r => {
      const dev = (r.desarrollador || 'Sin nombre').trim();
      if (!grupos[dev]) grupos[dev] = [];
      grupos[dev].push(r);
    });
  } else {
    grupos['MERCADO GLOBAL'] = registros;
  }

  const devNames = Object.keys(grupos);
  const mapaColores = {};
  devNames.forEach((d, i) => { mapaColores[d] = PALETA_DEVS[i % PALETA_DEVS.length]; });

  // ── KPI: Conteo ──────────────────────────────────────
  document.getElementById('kpiTotal').innerHTML = devNames.map(dev => {
    const c = mapaColores[dev];
    return `<div class="kpi-row">
      <span class="kpi-dev" style="color:${c}">${dev}</span>
      <span class="kpi-val" style="color:${c}">${grupos[dev].length.toLocaleString('es-MX')}</span>
    </div>`;
  }).join('');

  // ── KPI: Precio promedio ─────────────────────────────
  document.getElementById('kpiPromedio').innerHTML = devNames.map(dev => {
    const c   = mapaColores[dev];
    const arr = grupos[dev].map(r => parseFloat(r.precio_lista)).filter(v => v > 0);
    const prom = arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
    return `<div class="kpi-row">
      <span class="kpi-dev" style="color:${c}">${dev}</span>
      <span class="kpi-val" style="color:${c}">${prom ? formatPeso(prom) : '—'}</span>
    </div>`;
  }).join('');

  // ── KPI: M2 construidos (moda) ───────────────────────
  document.getElementById('kpiMetros').innerHTML = devNames.map(dev => {
    const c   = mapaColores[dev];
    const arr = grupos[dev].map(r => parseFloat(r.m2_construidos)).filter(v => v > 0);
    const moda = calcularModa(arr);
    return `<div class="kpi-row">
      <span class="kpi-dev" style="color:${c}">${dev}</span>
      <span class="kpi-val" style="color:${c}">${moda ? moda + ' m²' : '—'}</span>
    </div>`;
  }).join('');

  // ── KPI: Estatus ─────────────────────────────────────
  document.getElementById('kpiEstatus').innerHTML = devNames.map(dev => {
    const c   = mapaColores[dev];
    const arr = grupos[dev];
    const act = arr.filter(r => (r.estatus||'').toUpperCase() === 'ACTIVO').length;
    const ina = arr.filter(r => (r.estatus||'').toUpperCase() === 'INACTIVO').length;
    const pau = arr.filter(r => (r.estatus||'').toUpperCase() === 'PAUSA').length;
    return `<div class="kpi-row">
      <span class="kpi-dev" style="color:${c}">${dev}</span>
      <span class="kpi-val" style="font-size:11px;color:${c}">✅ ${act} &nbsp;🔴 ${ina} &nbsp;⏸ ${pau}</span>
    </div>`;
  }).join('');

  // ── Zonas ────────────────────────────────────────────
  const zonasSet = new Set(registros.map(r => r.zona).filter(Boolean));
  const zonasEl = document.getElementById('lblZonas');
  if (zonasEl) {
    zonasEl.innerHTML = zonasSet.size
      ? [...zonasSet].map(z => `<span class="zona-tag">${z}</span>`).join('')
      : '—';
  }

  // ── Tablas ───────────────────────────────────────────
  renderTablaFraccs(grupos, mapaColores);
  renderTablaProtos(grupos, mapaColores);

  // ── Gráfica ──────────────────────────────────────────
  renderGraficaTop10(registros, mapaColores, isFiltrado);
}

// ── Tabla: Desarrollador → Fraccionamientos ──────────────────────────────────
function renderTablaFraccs(grupos, mapaColores) {
  const wrap = document.getElementById('tablaFraccsWrap');
  if (!wrap) return;
  if (grupos['MERCADO GLOBAL']) {
    wrap.innerHTML = '<p class="dash-empty">Aplica un filtro de desarrollador para ver los datos.</p>';
    return;
  }
  let html = '';
  Object.entries(grupos).forEach(([dev, regs]) => {
    const c = mapaColores[dev];
    const fraccConteo = {};
    regs.forEach(r => {
      const f = r.fraccionamiento || 'Sin nombre';
      fraccConteo[f] = (fraccConteo[f] || 0) + 1;
    });
    html += `
      <table class="mini-table" style="margin-bottom:18px">
        <thead>
          <tr><th colspan="2" style="background:${c}22;color:${c};padding:8px 12px;border-bottom:2px solid ${c};font-size:12px">${dev}</th></tr>
          <tr><th>Fraccionamiento</th><th style="text-align:right">Recuento</th></tr>
        </thead>
        <tbody>
          ${Object.entries(fraccConteo).sort((a,b)=>b[1]-a[1]).map(([f,n]) =>
            `<tr><td>${f}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:${c}">${n}</td></tr>`
          ).join('')}
        </tbody>
      </table>`;
  });
  wrap.innerHTML = html;
}

// ── Tabla: Prototipos por fraccionamiento ─────────────────────────────────────
function renderTablaProtos(grupos, mapaColores) {
  const wrap = document.getElementById('tablaProtosWrap');
  if (!wrap) return;
  if (grupos['MERCADO GLOBAL']) {
    wrap.innerHTML = '<p class="dash-empty">Aplica un filtro de desarrollador para ver los datos.</p>';
    return;
  }
  let html = '';
  Object.entries(grupos).forEach(([dev, regs]) => {
    const c = mapaColores[dev];
    // Agrupar por fraccionamiento → prototipo → precio
    const fraccProtos = {};
    regs.forEach(r => {
      const f = r.fraccionamiento || 'Sin nombre';
      const p = r.prototipo || '—';
      if (!fraccProtos[f]) fraccProtos[f] = {};
      fraccProtos[f][p] = parseFloat(r.precio_lista) || 0;
    });
    html += `<div style="margin-bottom:6px"><span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${c}22;color:${c}">${dev}</span></div>`;
    Object.entries(fraccProtos).forEach(([fracc, protos]) => {
      html += `
        <table class="mini-table" style="margin-bottom:14px">
          <thead>
            <tr><th colspan="2" style="background:var(--bg-panel);color:var(--text-muted);font-size:10px;padding:6px 10px">📍 ${fracc}</th></tr>
            <tr><th>Prototipo</th><th style="text-align:right">Precio</th></tr>
          </thead>
          <tbody>
            ${Object.entries(protos).sort((a,b)=>b[1]-a[1]).map(([proto, precio]) =>
              `<tr><td>${proto}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:${c}">${precio?formatPeso(precio):'—'}</td></tr>`
            ).join('')}
          </tbody>
        </table>`;
    });
  });
  wrap.innerHTML = html;
}

// ── Gráfica Top 10 ────────────────────────────────────────────────────────────
function renderGraficaTop10(registros, mapaColores, isFiltrado) {
  const fraccMap = {};
  registros.forEach(r => {
    const f = r.fraccionamiento || 'N/D';
    const dev = (r.desarrollador || 'Sin nombre').trim();
    if (!fraccMap[f]) fraccMap[f] = { suma:0, count:0, dev };
    fraccMap[f].suma  += parseFloat(r.precio_lista) || 0;
    fraccMap[f].count += 1;
  });
  const top10 = Object.entries(fraccMap)
    .filter(([,v]) => v.suma > 0)
    .map(([k,v]) => ({ nombre:k, promedio: v.suma/v.count, dev: v.dev }))
    .sort((a,b) => b.promedio - a.promedio).slice(0,10);

  if (chartFracc) chartFracc.destroy();
  const ctx = document.getElementById('chartFracc');
  if (!ctx || !top10.length) return;

  chartFracc = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: top10.map(f => f.nombre),
      datasets: [{
        label: 'Precio Promedio',
        data: top10.map(f => f.promedio),
        backgroundColor: top10.map(f => isFiltrado ? (mapaColores[f.dev]||'#3d7fff')+'b3' : 'rgba(61,127,255,.7)'),
        borderColor:     top10.map(f => isFiltrado ? (mapaColores[f.dev]||'#3d7fff') : '#3d7fff'),
        borderWidth: 1.5, borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          title: ctx => `${ctx[0].label}${isFiltrado ? ' · '+top10[ctx[0].dataIndex].dev : ''}`,
          label: ctx => ' ' + formatPeso(ctx.raw),
        }},
      },
      scales: {
        x: { ticks: { color:'#6b7a99', font:{family:'IBM Plex Mono',size:10}, callback: v => '$'+Intl.NumberFormat('es-MX').format(v) }, grid:{color:'#2a3347'} },
        y: { ticks: { color:'#6b7a99', font:{family:'IBM Plex Sans',size:11} }, grid:{display:false} },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════
// FILTRO DASHBOARD
// ═══════════════════════════════════════════════════════
function initFiltroDashboard() {
  const btnAplicar  = document.getElementById('btnFiltrar');
  const btnLimpiar  = document.getElementById('btnLimpiarFiltro');
  const inputFiltro = document.getElementById('filtroDesarrollador');

  function aplicar() {
    const q = (inputFiltro?.value || '').trim().toLowerCase();
    if (!q) { renderDashboard(todosLosRegistros, false); return; }
    const devs = q.split(',').map(s => s.trim()).filter(Boolean);
    const filtrados = todosLosRegistros.filter(r =>
      devs.some(d => (r.desarrollador || '').toLowerCase().includes(d))
    );
    renderDashboard(filtrados, true);
  }

  btnAplicar?.addEventListener('click', aplicar);
  btnLimpiar?.addEventListener('click', () => {
    if (inputFiltro) inputFiltro.value = '';
    renderDashboard(todosLosRegistros, false);
  });
  inputFiltro?.addEventListener('keydown', e => { if (e.key === 'Enter') aplicar(); });
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

  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (f) seleccionarArchivo(f);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) seleccionarArchivo(fileInput.files[0]); });

  btnImportar.addEventListener('click', async () => {
    if (!archivoSeleccionado) { mostrarNotificacion('⚠️ Selecciona un archivo primero', 'error'); return; }

    const orig = btnImportar.textContent;
    btnImportar.disabled = true; btnImportar.textContent = 'Importando…';

    const pw = document.getElementById('progressWrap');
    const pb = document.getElementById('progressBar');
    const pl = document.getElementById('progressLabel');
    if (pw) pw.classList.remove('hidden');
    if (pb) pb.style.width = '30%';
    if (pl) pl.textContent = 'Enviando archivo…';

    const fd = new FormData();
    fd.append('archivoExcel', archivoSeleccionado);

    try {
      if (pb) pb.style.width = '70%';
      if (pl) pl.textContent = 'Procesando…';
      const resp = await fetch('/api/importar', { method:'POST', body:fd });
      const data = await resp.json();
      if (pb) pb.style.width = '100%';
      setTimeout(() => { if (pw) pw.classList.add('hidden'); }, 800);

      const resultEl = document.getElementById('importResult');
      if (data.ok || data.insertados > 0) {
        mostrarNotificacion(`✅ ${data.mensaje}`, 'success');
        if (resultEl) { resultEl.className='import-result success'; resultEl.innerHTML=`✓ ${data.mensaje}<br><small>${data.insertados} insertados${data.errores>0?` · ${data.errores} con error`:''}</small>`; resultEl.classList.remove('hidden'); }
        actualizarContador();
      } else {
        const msg = data.error || data.mensaje || 'Error';
        mostrarNotificacion('❌ ' + msg, 'error');
        if (resultEl) { resultEl.className='import-result error'; resultEl.textContent=msg; resultEl.classList.remove('hidden'); }
      }
    } catch { if (pw) pw.classList.add('hidden'); mostrarNotificacion('❌ Error de conexión', 'error'); }
    finally { btnImportar.disabled=false; btnImportar.textContent=orig; }
  });

  function seleccionarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { mostrarNotificacion('⚠️ Solo .xlsx o .xls', 'error'); return; }
    archivoSeleccionado = file;
    if (importName) importName.textContent = file.name;
    if (importFile) importFile.classList.remove('hidden');
    btnImportar.disabled = false;
    const r = document.getElementById('importResult'); if (r) r.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('topbarFecha');
  if (f) f.textContent = new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  initNavegacion();
  initFormulario();
  initFiltroDashboard();
  initImportacion();
  actualizarContador();
});
