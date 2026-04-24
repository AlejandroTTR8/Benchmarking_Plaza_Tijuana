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

    // Envío del Formulario
    capturaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(capturaForm);
        const data = Object.fromEntries(formData.entries());

        // Parsear números
        data.precio_lista = data.precio_lista ? parseFloat(data.precio_lista) : null;
        data.m2_construidos = data.m2_construidos ? parseFloat(data.m2_construidos) : null;
        data.recamaras = data.recamaras ? parseInt(data.recamaras) : null;
        data.banos = data.banos ? parseFloat(data.banos) : null;

        try {
            const response = await fetch('/api/capturas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                mostrarAlerta('¡Registro guardado exitosamente en PostgreSQL!', 'success');
                capturaForm.reset();
            } else {
                mostrarAlerta('Error al guardar: ' + result.error, 'error');
            }
        } catch (error) {
            mostrarAlerta('Error de conexión con el servidor Railway.', 'error');
        }
    });

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
