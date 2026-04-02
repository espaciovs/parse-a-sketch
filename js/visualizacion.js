document.addEventListener('DOMContentLoaded', () => {
  const pre       = document.querySelector('pre');
  const hPlanta   = document.getElementById('planta');
  const hPregunta = document.getElementById('pregunta');

  // Canvas 1 — planta SVG (dibujado por canvas-renderer.js + svg-loader.js, sin tocar)
  const canvasP = document.getElementById('canvas-plantas');
  const ctxP    = canvasP.getContext('2d');

  // Canvas 2 — overlay de datos de usuario (dibujado por datos-renderer.js)
  // Está encima del canvas de plantas gracias al z-index y position absolute
  const canvasD = document.getElementById('canvas-datos');
  const ctxD    = canvasD.getContext('2d');

  // Modo de cuadrícula: "una" planta centrada con todas las respuestas superpuestas,
  // o "varias" donde cada respuesta tiene su propia celda con la planta y sus datos
  let modoVisual = 'una';

  // Cache del JSON cargado para la combinación planta+pregunta actual.
  // Se invalida solo cuando cambia planta o pregunta (no en cambios de respuestas).
  let datosJson    = null;
  let datosJsonKey = null; // clave 'planta_X_Y' para saber cuándo recargar

  // ==================== CONFIGURACIÓN DE MODO VISUAL ====================

  document.querySelectorAll('.config-visual-grid').forEach(btn => {
    btn.addEventListener('click', () => {
      modoVisual = btn.textContent.trim().toLowerCase() === 'una' ? 'una' : 'varias';
      document.querySelectorAll('.config-visual-grid').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      actualizarCanvas();
    });
  });

  // ==================== CARGA DEL JSON DE DATOS ====================

  // Carga el JSON de la combinación planta+pregunta actual.
  // Si ya está en cache (misma clave), no hace ninguna petición.
  async function cargarDatosJson() {
    if (!configuracion.planta || !configuracion.pregunta) {
      datosJson    = null;
      datosJsonKey = null;
      return;
    }

    const numPlanta   = configuracion.planta.id.replace('planta_', '');
    const numPregunta = configuracion.pregunta.id.replace('pregunta_', '');
    const key         = `planta_${numPlanta}_${numPregunta}`;

    // Si ya tenemos este JSON en cache, no hace falta volver a cargarlo
    if (key === datosJsonKey) return;

    datosJsonKey = key;
    try {
      const res = await fetch(`data/plantas/${key}.json`);
      datosJson  = res.ok ? await res.json() : null;
    } catch {
      datosJson = null;
    }
  }

  // ==================== ACTUALIZACIÓN DEL CANVAS ====================

  async function actualizarCanvas() {
    if (!configuracion.planta) {
      ctxP.clearRect(0, 0, canvasP.width, canvasP.height);
      ctxD.clearRect(0, 0, canvasD.width, canvasD.height);
      return;
    }

    // ── Canvas de plantas (SVG) ─────────────────────────────────────
    // Construimos el array de celdas que necesita dibujarTodo():
    // en modo "una" → 1 celda; en modo "varias" → 1 celda por respuesta activa
    const numPlanta = configuracion.planta.id.replace('planta_', '');
    const base      = await obtenerCapaConBbox(numPlanta); // de svg-loader.js
    if (!base) return;

    let plantasCeldas;
    if (modoVisual === 'una' || !configuracion.respuestas.length) {
      plantasCeldas = [base];
    } else {
      // Una copia de la misma planta por cada respuesta activa
      plantasCeldas = configuracion.respuestas.map(() => base);
    }
    dibujarTodo(ctxP, canvasP, plantasCeldas); // de canvas-renderer.js

    // ── Canvas de datos (overlay) ────────────────────────────────────
    if (!datosJson) {
      ctxD.clearRect(0, 0, canvasD.width, canvasD.height);
      return;
    }

    // Convertir los IDs de respuesta activos ('respuesta_1', 'respuesta_2'...)
    // a los objetos del JSON (posición 0-based en el array "plantas")
    const respuestasActivas = configuracion.respuestas
      .map(id => {
        const idx = parseInt(id.replace('respuesta_', '')) - 1;
        return datosJson.plantas[idx];
      })
      .filter(Boolean); // eliminar indices fuera de rango

    if (modoVisual === 'una') {
      // Todos los datos superpuestos en una única celda
      pintarDatosEnUna(ctxD, canvasD, respuestasActivas); // de datos-renderer.js
    } else {
      // Cada respuesta en su propia celda, alineada con la planta correspondiente
      pintarDatosEnGrid(ctxD, canvasD, respuestasActivas); // de datos-renderer.js
    }
  }

  // ==================== ACTUALIZACIÓN DE VISTA ====================

  // Llamado cada vez que cambia algo en configuracion (planta, pregunta o respuestas)
  async function actualizarVista() {
    hPlanta.textContent   = configuracion.planta   ? configuracion.planta.titulo   : 'Seleccionar planta';
    hPregunta.textContent = configuracion.pregunta ? configuracion.pregunta.texto  : 'Seleccionar pregunta';

    // Debug: mostrar el estado de configuracion en el panel lateral
    pre.textContent = JSON.stringify(configuracion, (key, value) => {
      if (key === 'onChange') return undefined;
      return value;
    }, 2);

    // Intentar cargar el JSON (usa cache; solo carga si cambia planta o pregunta)
    await cargarDatosJson();
    await actualizarCanvas();
  }

  // ==================== AJUSTE DE TAMAÑO ====================

  // Sincroniza las dimensiones internas de ambos canvas con su tamaño CSS.
  // Necesario porque width/height del elemento canvas != tamaño CSS.
  function ajustarCanvas() {
    canvasP.width  = canvasP.offsetWidth;
    canvasP.height = canvasP.offsetHeight;
    canvasD.width  = canvasD.offsetWidth;
    canvasD.height = canvasD.offsetHeight;
    actualizarVista();
  }

  window.addEventListener('resize', ajustarCanvas);
  ajustarCanvas();

  // Registrar el callback para que configuracion.js lo llame en cada cambio
  configuracion.onChange = actualizarVista;
  setTimeout(actualizarVista, 100);
});
