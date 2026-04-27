// ─── LÓGICA PARA NAVEGAR ENTRE PESTAÑAS ───
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Quitar la clase "active" de todos los botones y pantallas
            navButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // 2. Agregar la clase "active" al botón que clickeaste
            button.classList.add('active');

            // 3. Buscar la pantalla correspondiente y mostrarla
            const targetId = button.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
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
