// Gestión dinámica del selector de respuestas.
//
// Escucha el evento 'config-seleccion-cambio' (disparado por configuracion.js
// cuando cambia planta o pregunta). Cuando ocurre, carga el JSON de esa
// combinación, cuenta cuántas entradas hay en el array "plantas" y genera
// un botón numerado por cada una.
//
// El botón "Todas" activa o desactiva todas a la vez.
// Cada cambio de selección actualiza configuracion.respuestas y llama a onChange.

document.addEventListener('DOMContentLoaded', () => {
  const grid     = document.querySelector('.grid-respuestas');
  const btnTodas = grid.querySelector('button[data-id="todas"]');

  // Array con los botones numerados actualmente en el DOM
  let botonesRespuesta = [];

  // Escucha cambios de planta o pregunta para recargar el conteo de respuestas
  document.addEventListener('config-seleccion-cambio', () => {
    if (configuracion.planta && configuracion.pregunta) {
      cargarNumeroRespuestas();
    } else {
      limpiarRespuestas();
    }
  });

  // Botón "Todas": activa o desactiva todos los botones de golpe
  btnTodas.addEventListener('click', () => {
    const ids          = botonesRespuesta.map(b => b.dataset.id);
    const todasActivas = ids.every(id => configuracion.respuestas.includes(id));

    if (todasActivas) {
      // Si ya estaban todas activas, las desactivamos
      configuracion.respuestas = [];
      botonesRespuesta.forEach(b => b.classList.remove('activo'));
    } else {
      // Activamos todas
      configuracion.respuestas = [...ids];
      botonesRespuesta.forEach(b => b.classList.add('activo'));
    }

    if (configuracion.onChange) configuracion.onChange();
  });

  // Carga el JSON de la combinación planta+pregunta actual y genera los botones
  async function cargarNumeroRespuestas() {
    const numPlanta   = configuracion.planta.id.replace('planta_', '');
    const numPregunta = configuracion.pregunta.id.replace('pregunta_', '');
    const ruta        = `data/plantas/planta_${numPlanta}_${numPregunta}.json`;

    try {
      const res = await fetch(ruta);
      if (!res.ok) { limpiarRespuestas(); return; }

      const data           = await res.json();
      const numRespuestas  = data.plantas.length;
      generarBotones(numRespuestas);
    } catch (e) {
      console.warn('No hay datos para esta combinación planta/pregunta:', ruta);
      limpiarRespuestas();
    }
  }

  // Elimina los botones anteriores y genera N botones nuevos (numerados del 1 al N)
  function generarBotones(n) {
    // Limpiar botones anteriores del DOM
    botonesRespuesta.forEach(b => b.remove());
    botonesRespuesta = [];

    // Resetear la selección activa al cambiar de planta/pregunta
    configuracion.respuestas = [];

    for (let i = 1; i <= n; i++) {
      const id  = `respuesta_${i}`;
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.dataset.id  = id;
      btn.className   = 'respuesta';

      btn.addEventListener('click', () => {
        const idx = configuracion.respuestas.indexOf(id);
        if (idx === -1) {
          // Añadir a la selección
          configuracion.respuestas.push(id);
          btn.classList.add('activo');
        } else {
          // Quitar de la selección
          configuracion.respuestas.splice(idx, 1);
          btn.classList.remove('activo');
        }
        if (configuracion.onChange) configuracion.onChange();
      });

      grid.appendChild(btn);
      botonesRespuesta.push(btn);
    }

    // Notificar que los botones cambiaron (visualizacion.js redibujará)
    if (configuracion.onChange) configuracion.onChange();
  }

  // Limpia todos los botones y resetea la selección (cuando no hay datos)
  function limpiarRespuestas() {
    botonesRespuesta.forEach(b => b.remove());
    botonesRespuesta       = [];
    configuracion.respuestas = [];
    if (configuracion.onChange) configuracion.onChange();
  }
});
