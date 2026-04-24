document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formularioCaptura');
    const mensajeAlerta = document.getElementById('mensajeAlerta');

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        // Extraer todos los datos del formulario
        const formData = new FormData(formulario);
        const dataFormulario = Object.fromEntries(formData.entries());

        // Asegurarnos que los campos numéricos se envíen como números (o null si están vacíos)
        dataFormulario.precio_lista = dataFormulario.precio_lista ? parseFloat(dataFormulario.precio_lista) : null;
        dataFormulario.m2_construidos = dataFormulario.m2_construidos ? parseFloat(dataFormulario.m2_construidos) : null;
        dataFormulario.recamaras = dataFormulario.recamaras ? parseInt(dataFormulario.recamaras) : null;
        dataFormulario.banos = dataFormulario.banos ? parseFloat(dataFormulario.banos) : null;

        try {
            // Enviar datos al servidor
            const response = await fetch('/api/capturas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataFormulario)
            });

            const data = await response.json();

            if (response.ok) {
                mostrarAlerta('¡Registro guardado exitosamente!', 'exito');
                formulario.reset(); // Limpiar formulario
            } else {
                mostrarAlerta('Error: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error de red:', error);
            mostrarAlerta('Error al intentar conectar con el servidor.', 'error');
        }
    });

    function mostrarAlerta(mensaje, tipo) {
        mensajeAlerta.textContent = mensaje;
        mensajeAlerta.className = `alerta ${tipo}`;
        
        // Desaparecer después de 4 segundos
        setTimeout(() => {
            mensajeAlerta.className = 'alerta oculta';
        }, 4000);
    }
});
