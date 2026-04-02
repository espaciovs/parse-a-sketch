document.addEventListener('DOMContentLoaded', () => {
  const pre       = document.querySelector('pre');
  const hPlanta   = document.getElementById('planta');
  const hPregunta = document.getElementById('pregunta');

  // Canvas 1 — planta SVG (gestionado por canvas-renderer.js + svg-loader.js, sin tocar)
  const canvasP = document.getElementById('canvas-plantas');
  const ctxP    = canvasP.getContext('2d');

  // Canvas 2 — overlay de datos de usuario (datos-renderer.js + heatmap-renderer.js)
  const canvasD = document.getElementById('canvas-datos');
  const ctxD    = canvasD.getContext('2d');

  // Sección y botones del toggle de heatmap (visibles solo en preguntas de tipo Point)
  const seccionHeatmap = document.getElementById('seccion-heatmap');

  // Sección y controles de modo líneas (visibles solo en preguntas Draw/Redraw)
  const seccionLineas  = document.getElementById('seccion-lineas');
  const monoExtra      = document.getElementById('mono-extra');
  const suavizadoExtra = document.getElementById('suavizado-extra');

  // Modo de cuadrícula: "una" = todas las respuestas en una celda superpuestas,
  // "varias" = una celda por respuesta
  let modoVisual  = 'una';

  // Modo de puntos: "puntos" = círculos individuales, "heatmap" = campo de influencia
  let modoHeatmap = 'puntos';

  // Modo de líneas: "normal" = estilo original, "mono" = todas negras con opciones
  let modoLineas  = 'normal';

  // Opciones del modo mono
  let opcionesLineas = {
    grosor:             2,
    opacidad:           0.6,
    suavizado:          false,
    intensidadSuavizado: 5,
    bundling:           false,
  };

  // Cache del JSON para la combinación planta+pregunta activa.
  // Se invalida solo cuando cambia planta o pregunta (no en cambios de respuestas).
  let datosJson    = null;
  let datosJsonKey = null;


  // ==================== TOGGLE CUADRÍCULA ====================

  document.querySelectorAll('.config-visual-grid').forEach(btn => {
    btn.addEventListener('click', () => {
      modoVisual = btn.textContent.trim().toLowerCase() === 'una' ? 'una' : 'varias';
      document.querySelectorAll('.config-visual-grid').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      actualizarCanvas();
    });
  });


  // ==================== TOGGLE HEATMAP ====================

  document.querySelectorAll('.config-heatmap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modoHeatmap = btn.textContent.trim().toLowerCase() === 'puntos' ? 'puntos' : 'heatmap';
      document.querySelectorAll('.config-heatmap-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      actualizarCanvas();
    });
  });

  // Muestra u oculta la sección de heatmap según si la pregunta activa es de tipo Point.
  // También resetea el modo al cambiar de pregunta para no quedar en heatmap
  // cuando pasamos a una pregunta que no tiene puntos.
  function actualizarVisibilidadHeatmap() {
    const esPoint = configuracion.pregunta &&
                    configuracion.pregunta.modoCanvas === 'Point';

    if (esPoint) {
      seccionHeatmap.classList.remove('hidden');
    } else {
      seccionHeatmap.classList.add('hidden');
      // Resetear al modo puntos para la próxima vez que aparezca
      modoHeatmap = 'puntos';
      document.querySelectorAll('.config-heatmap-btn').forEach((b, i) => {
        b.classList.toggle('activo', i === 0); // "Puntos" es el primero
      });
    }
  }


  // ==================== TOGGLE MODO LÍNEAS ====================

  document.querySelectorAll('.config-lineas-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modoLineas = btn.textContent.trim().toLowerCase() === 'normal' ? 'normal' : 'mono';
      document.querySelectorAll('.config-lineas-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      monoExtra.classList.toggle('hidden', modoLineas !== 'mono');
      actualizarCanvas();
    });
  });

  document.querySelectorAll('.config-suavizado-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const esOn = btn.textContent.trim().toLowerCase() === 'on';
      opcionesLineas.suavizado = esOn;
      document.querySelectorAll('.config-suavizado-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      suavizadoExtra.classList.toggle('hidden', !esOn);
      actualizarCanvas();
    });
  });

  document.querySelectorAll('.config-bundling-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      opcionesLineas.bundling = btn.textContent.trim().toLowerCase() === 'on';
      document.querySelectorAll('.config-bundling-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      actualizarCanvas();
    });
  });

  document.getElementById('slider-grosor').addEventListener('input', e => {
    opcionesLineas.grosor = parseFloat(e.target.value);
    actualizarCanvas();
  });

  document.getElementById('slider-opacidad').addEventListener('input', e => {
    opcionesLineas.opacidad = parseFloat(e.target.value);
    actualizarCanvas();
  });

  document.getElementById('slider-suavizado').addEventListener('input', e => {
    opcionesLineas.intensidadSuavizado = parseInt(e.target.value);
    actualizarCanvas();
  });

  // Muestra u oculta la sección de líneas según si la pregunta activa es Draw/Redraw.
  function actualizarVisibilidadLineas() {
    const esDraw = configuracion.pregunta &&
                   (configuracion.pregunta.modoCanvas === 'Draw' ||
                    configuracion.pregunta.modoCanvas === 'Redraw');

    if (esDraw) {
      seccionLineas.classList.remove('hidden');
    } else {
      seccionLineas.classList.add('hidden');
      // Resetear al modo normal
      modoLineas = 'normal';
      document.querySelectorAll('.config-lineas-btn').forEach((b, i) => {
        b.classList.toggle('activo', i === 0);
      });
      monoExtra.classList.add('hidden');
    }
  }


  // ==================== CARGA DEL JSON DE DATOS ====================

  // Carga el JSON de la combinación activa. Si la clave no cambió (mismo
  // planta+pregunta), devuelve sin hacer ninguna petición (usa cache).
  async function cargarDatosJson() {
    if (!configuracion.planta || !configuracion.pregunta) {
      datosJson    = null;
      datosJsonKey = null;
      return;
    }

    const numPlanta   = configuracion.planta.id.replace('planta_', '');
    const numPregunta = configuracion.pregunta.id.replace('pregunta_', '');
    const key         = `planta_${numPlanta}_${numPregunta}`;

    if (key === datosJsonKey) return; // ya en cache

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

    // ── Canvas de plantas (SVG) ─────────────────────────────────────────
    const numPlanta = configuracion.planta.id.replace('planta_', '');
    const base      = await obtenerCapaConBbox(numPlanta); // svg-loader.js
    if (!base) return;

    let plantasCeldas;
    if (modoVisual === 'una' || !configuracion.respuestas.length) {
      plantasCeldas = [base];
    } else {
      plantasCeldas = configuracion.respuestas.map(() => base);
    }
    dibujarTodo(ctxP, canvasP, plantasCeldas); // canvas-renderer.js

    // ── Canvas de datos (overlay) ────────────────────────────────────────
    ctxD.clearRect(0, 0, canvasD.width, canvasD.height);

    if (!datosJson) return;

    // Convertir IDs de respuesta ('respuesta_1'…) a objetos del JSON
    const respuestasActivas = configuracion.respuestas
      .map(id => {
        const idx = parseInt(id.replace('respuesta_', '')) - 1;
        return datosJson.plantas[idx];
      })
      .filter(Boolean);

    if (!respuestasActivas.length) return;

    // Determinar qué herramientas pinta pintarDatos* (excluye Draw si mono, Point si heatmap)
    const incluirDraw  = modoLineas !== 'mono';
    const incluirPoint = modoHeatmap !== 'heatmap';

    const filtroBase = [];
    if (incluirDraw)  filtroBase.push('Draw', 'Redraw');
    if (incluirPoint) filtroBase.push('Point');
    filtroBase.push('Text');
    // null = sin filtro (pintar todo); array vacío = no pintar nada con pintarDatos
    const filtro = (incluirDraw && incluirPoint) ? null : filtroBase;

    if (modoHeatmap === 'heatmap') {
      // ── Capa 1: heatmap ──────────────────────────────────────────────
      if (modoVisual === 'una') {
        pintarHeatmapEnUna(ctxD, canvasD, respuestasActivas);
      } else {
        pintarHeatmapEnGrid(ctxD, canvasD, respuestasActivas);
      }
    }

    // ── Capa 2: datos estándar (Draw/Text/Point según filtro) ─────────
    if (filtro === null || filtroBase.length > 0) {
      if (modoVisual === 'una') {
        pintarDatosEnUna(ctxD, canvasD, respuestasActivas, filtro);
      } else {
        pintarDatosEnGrid(ctxD, canvasD, respuestasActivas, filtro);
      }
    }

    // ── Capa 3: trazos mono (si activado) ─────────────────────────────
    if (modoLineas === 'mono') {
      if (modoVisual === 'una') {
        pintarLineasMonoEnUna(ctxD, canvasD, respuestasActivas, opcionesLineas);
      } else {
        pintarLineasMonoEnGrid(ctxD, canvasD, respuestasActivas, opcionesLineas);
      }
    }
  }


  // ==================== ACTUALIZACIÓN DE VISTA ====================

  async function actualizarVista() {
    hPlanta.textContent   = configuracion.planta   ? configuracion.planta.titulo   : 'Seleccionar planta';
    hPregunta.textContent = configuracion.pregunta ? configuracion.pregunta.texto  : 'Seleccionar pregunta';

    pre.textContent = JSON.stringify(configuracion, (key, value) => {
      if (key === 'onChange') return undefined;
      return value;
    }, 2);

    actualizarVisibilidadHeatmap();
    actualizarVisibilidadLineas();

    // Recargar JSON solo si cambió la combinación planta+pregunta
    await cargarDatosJson();
    await actualizarCanvas();
  }


  // ==================== AJUSTE DE TAMAÑO ====================

  function ajustarCanvas() {
    canvasP.width  = canvasP.offsetWidth;
    canvasP.height = canvasP.offsetHeight;
    canvasD.width  = canvasD.offsetWidth;
    canvasD.height = canvasD.offsetHeight;
    actualizarVista();
  }

  window.addEventListener('resize', ajustarCanvas);
  ajustarCanvas();

  configuracion.onChange = actualizarVista;
  setTimeout(actualizarVista, 100);
});
