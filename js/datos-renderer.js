// ==================== COLORES ====================
// Mapeo de los nombres de color usados en los JSON al valor CSS correspondiente.
// Estos nombres vienen del campo "color" de cada trazo guardado por el usuario.
const COLORES_DATOS = {
  borrador:    '#ffffff', // usado con destination-out para borrar
  pared:       '#000000',
  asientos:    '#0000ff',
  plantas:     '#00ff00',
  iluminacion: '#ff0000',
  textil:      '#ffff00',
  resto:       '#00ffff',
  ventana:     '#ff00ff',
  red:         '#ff548d',
  green:       '#55ffad',
  point:       '#fa7bb8',
};

// Parámetros visuales equivalentes a los del canvas de captura original
const GROSOR_TRAZO  = 6;   // lineWidth en px del canvas original
const RADIO_PUNTO   = 7;   // radio del círculo de Point en px del canvas original
const TAMANO_FUENTE = 18;  // px del canvas original para texto


// ==================== TRANSFORMACIÓN DE COORDENADAS ====================

// Calcula el offset y escala necesarios para proyectar las coordenadas del
// canvas original (donde dibujó el usuario) en una celda de nuestro canvas.
//
// Usa el mismo margen que dibujarEnCelda() en canvas-renderer.js para que
// los datos queden alineados con el SVG de la planta.
//
// tamañoCanvas: ["393","393"] — tamaño del canvas del usuario (siempre cuadrado)
// celda: { x, y, w, h } — celda en el canvas de visualización
function calcularTransformDatos(celda, tamañoCanvas) {
  const margen  = Math.min(celda.w, celda.h) * 0.05;
  const areaW   = celda.w - margen * 2;
  const areaH   = celda.h - margen * 2;
  const srcW    = parseFloat(tamañoCanvas[0]);
  const srcH    = parseFloat(tamañoCanvas[1]);

  // Escala uniforme para que el dibujo no se deforme (el canvas siempre fue cuadrado)
  const escala  = Math.min(areaW / srcW, areaH / srcH);

  // Centramos dentro del área disponible
  const offsetX = celda.x + margen + (areaW - srcW * escala) / 2;
  const offsetY = celda.y + margen + (areaH - srcH * escala) / 2;

  return { offsetX, offsetY, escala };
}


// ==================== PINTADO DE TIPOS DE TRAZO ====================

// Pinta un trazo de tipo Draw (línea continua de mano alzada).
// Las coordenadas son un array de pares [x, y].
// El color "borrador" usa destination-out para borrar datos (no la planta SVG).
function pintarTrazo(ctx, coordenadas, color, escala) {
  if (!coordenadas || coordenadas.length < 2) return;

  const esBorrador = (color === COLORES_DATOS.borrador);

  ctx.save();
  ctx.lineWidth  = GROSOR_TRAZO / escala; // compensamos la escala para mantener el grosor visual
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';

  if (esBorrador) {
    // destination-out: recorta el canvas de datos pero NO afecta al canvas de la planta
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)'; // el color no importa con destination-out
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
  }

  ctx.beginPath();
  ctx.moveTo(coordenadas[0][0], coordenadas[0][1]);
  for (let i = 1; i < coordenadas.length; i++) {
    ctx.lineTo(coordenadas[i][0], coordenadas[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}

// Pinta un trazo de tipo Point (círculo relleno en una posición concreta).
// Las coordenadas son siempre [[x, y]] (un único punto).
function pintarPunto(ctx, coordenadas, color, escala) {
  if (!coordenadas || coordenadas.length === 0) return;
  const [x, y] = coordenadas[0];

  ctx.save();
  ctx.fillStyle                 = color;
  ctx.globalCompositeOperation  = 'source-over';
  ctx.beginPath();
  ctx.arc(x, y, RADIO_PUNTO / escala, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

// Pinta un trazo de tipo Text.
// Las coordenadas son [[x, y]] y el texto está en trazo.contenido.
function pintarTexto(ctx, trazo, color, escala) {
  if (!trazo.contenido || !trazo.coordenadas || !trazo.coordenadas[0]) return;
  const [x, y] = trazo.coordenadas[0];

  ctx.save();
  ctx.fillStyle                 = color;
  ctx.globalCompositeOperation  = 'source-over';
  ctx.font                      = `${TAMANO_FUENTE / escala}px sans-serif`;
  ctx.fillText(trazo.contenido, x, y);
  ctx.restore();
}


// ==================== PINTADO DE UNA RESPUESTA EN UNA CELDA ====================

// Pinta todos los trazos de una respuesta dentro de una celda del canvas de datos.
//
// respuesta:         un elemento del array "plantas" del JSON
//                    { tamañoCanvas: ["393","393"], trazos: [ { herramienta, color, coordenadas, ... } ] }
// celda:             { x, y, w, h } en coordenadas del canvas de visualización
// filtroHerramienta: array de herramientas a incluir (p.ej. ['Draw','Text']).
//                    Si es null, se pintan todas.
function pintarRespuestaEnCelda(ctx, celda, respuesta, filtroHerramienta = null) {
  if (!respuesta || !respuesta.trazos) return;

  const { offsetX, offsetY, escala } = calcularTransformDatos(celda, respuesta.tamañoCanvas);

  // Aplicamos el mismo transform que canvas-renderer.js aplica al SVG,
  // así las coordenadas del usuario caen exactamente sobre la planta.
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(escala, escala);

  respuesta.trazos.forEach(trazo => {
    // Si hay filtro activo, ignorar las herramientas que no están en la lista
    if (filtroHerramienta && !filtroHerramienta.includes(trazo.herramienta)) return;

    const color = COLORES_DATOS[trazo.color] || '#000000';

    switch (trazo.herramienta) {
      case 'Draw':
        pintarTrazo(ctx, trazo.coordenadas, color, escala);
        break;
      case 'Point':
        pintarPunto(ctx, trazo.coordenadas, color, escala);
        break;
      case 'Text':
        pintarTexto(ctx, trazo, color, escala);
        break;
      default:
        console.warn('Tipo de herramienta desconocido:', trazo.herramienta);
    }
  });

  ctx.restore();
}


// ==================== MODO "UNA" — todas las respuestas superpuestas ====================

// Pinta todas las respuestas activas en una única celda que ocupa todo el canvas.
// Las respuestas se superponen en el orden en que aparecen en el array.
//
// ctx:               contexto 2D del canvas de datos
// canvas:            el canvas de datos (para dimensiones)
// respuestasActivas: array de elementos del JSON que se deben pintar
// filtroHerramienta: ver pintarRespuestaEnCelda — null = todas
//
// NOTA: el clearRect lo hace el llamador (visualizacion.js) para poder
//       componer el heatmap y los datos en el orden correcto.
function pintarDatosEnUna(ctx, canvas, respuestasActivas, filtroHerramienta = null) {
  if (!respuestasActivas.length) return;

  const celda = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  respuestasActivas.forEach(respuesta => {
    pintarRespuestaEnCelda(ctx, celda, respuesta, filtroHerramienta);
  });
}


// ==================== MODO "VARIAS" — una celda por respuesta ====================

// Distribuye las respuestas activas en un grid, una por celda.
// Usa calcularGrid() de canvas-renderer.js para el mismo layout que la planta SVG.
//
// ctx:               contexto 2D del canvas de datos
// canvas:            el canvas de datos
// respuestasActivas: array de elementos del JSON que se deben pintar
// filtroHerramienta: ver pintarRespuestaEnCelda — null = todas
//
// NOTA: igual que pintarDatosEnUna, el clearRect lo gestiona el llamador.
function pintarDatosEnGrid(ctx, canvas, respuestasActivas, filtroHerramienta = null) {
  if (!respuestasActivas.length) return;

  // calcularGrid está definida en canvas-renderer.js (mismo scope de scripts)
  const { cols, filas } = calcularGrid(respuestasActivas.length, canvas.width, canvas.height);
  const celdaW = canvas.width  / cols;
  const celdaH = canvas.height / filas;

  respuestasActivas.forEach((respuesta, i) => {
    const col   = i % cols;
    const fila  = Math.floor(i / cols);
    const celda = { x: col * celdaW, y: fila * celdaH, w: celdaW, h: celdaH };
    pintarRespuestaEnCelda(ctx, celda, respuesta, filtroHerramienta);
  });
}
