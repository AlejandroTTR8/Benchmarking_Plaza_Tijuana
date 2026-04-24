document.addEventListener('DOMContentLoaded', () => {
    
    // ─── LÓGICA DE PESTAÑAS (TABS) ─────────────────────────────
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const pageTitle = document.getElementById('pageTitle');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Quitar clase active de todos
            navBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Activar el clickeado
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Cambiar título superior
            pageTitle.textContent = btn.textContent.trim();
        });
    });

    // ─── LÓGICA DE FORMULARIO Y BASE DE DATOS ───────────────────
    const capturaForm = document.getElementById('capturaForm');
    const formAlert = document.getElementById('formAlert');
    const btnLimpiar = document.getElementById('btnLimpiar');

    // Botón Limpiar
    btnLimpiar.addEventListener('click', () => {
        capturaForm.reset();
        ocultarAlerta();
    });

// --- LÓGICA DE CAPTURA MANUAL (ACTUALIZADA PARA 30+ CAMPOS) ---
const capturaForm = document.getElementById('capturaForm');
if (capturaForm) {
  capturaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Recolectar TODOS los datos del formulario automáticamente
    const formData = new FormData(capturaForm);
    const data = Object.fromEntries(formData.entries());

    // Limpiar campos vacíos para que Postgres no marque error y asigne NULL
    for (let key in data) {
      if (data[key] === "") {
        data[key] = null;
      }
    }

    try {
      const response = await fetch('/api/capturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();

      if (response.ok) {
        alert('✅ Registro guardado con éxito!');
        capturaForm.reset();
        if (typeof actualizarContador === 'function') actualizarContador(); // Actualiza tu contador
      } else {
        alert('❌ Error al guardar: ' + result.error);
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('❌ Ocurrió un problema de conexión con el servidor.');
    }
  });
}

    // Funciones de Alerta
    function mostrarAlerta(mensaje, tipo) {
        formAlert.textContent = mensaje;
        formAlert.className = `alert ${tipo}`; // Usa las clases de tu CSS (success, error)
        setTimeout(ocultarAlerta, 5000);
    }

    function ocultarAlerta() {
        formAlert.className = 'alert hidden';
    }
});
