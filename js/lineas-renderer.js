// ==================== CONFIGURACIÓN EDGE BUNDLING (FDEB) ====================
//
// Parámetros del Force-Directed Edge Bundling. Se usan únicamente cuando
// el toggle "Edge bundling" está activado desde la interfaz.
// Ajusta estos valores para controlar la intensidad y fidelidad del bundling.

const BUNDLING_CONFIG = {

  // Puntos de control en que se divide cada trazo al inicio del algoritmo.
  // Más puntos = más detalle local del bundling, pero coste O(N² × puntos).
  puntosPorTrazo: 12,

  // Número de ciclos de subdivisión. En cada ciclo los puntos de control
  // se duplican antes de volver a iterar, añadiendo detalle progresivamente.
  ciclos: 3,

  // Iteraciones de cálculo de fuerzas dentro de cada ciclo.
  iteracionesPorCiclo: 40,

  // Umbral de compatibilidad [0–1]. Solo los pares de trazos con un valor
  // de compatibilidad por encima de este umbral se atraen mutuamente.
  // Valores altos = solo bundlea trazos muy similares en dirección y posición.
  compatibilidadMinima: 0.45,

  // Constante de resorte K. Controla cuánto resiste cada punto de control
  // a alejarse de su posición en el trazo original.
  // Mayor valor = curvas menos deformadas (más fieles al original).
  constanteResorte: 0.10,

  // Factor de escala del paso de actualización. Decrece en cada ciclo
  // para afinar el resultado sin sobrepasar el equilibrio.
  tasaActualizacion: 0.05,

};


// ==================== MUESTREO UNIFORME POR LONGITUD DE ARCO ====================

// Devuelve n puntos distribuidos uniformemente por longitud de arco
// a lo largo del trazo [[x,y], ...]. Necesario para que los índices
// de los puntos de control de distintos trazos correspondan a posiciones
// comparables a lo largo de cada trazo.
function muestrearUniforme(coords, n) {
  if (coords.length === 0) return [];
  if (n === 1)             return [[...coords[0]]];

  // Longitudes acumuladas segmento a segmento
  const lon = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    lon.push(lon[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = lon[lon.length - 1];
  if (total < 1e-6) return Array.from({ length: n }, () => [...coords[0]]);

  const resultado = [];
  for (let s = 0; s < n; s++) {
    const target = (s / (n - 1)) * total;

    // Búsqueda binaria del segmento donde cae `target`
    let lo = 0, hi = lon.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lon[mid] <= target) lo = mid; else hi = mid - 1;
    }

    const segLen = lon[lo + 1] - lon[lo];
    const t      = segLen > 1e-9 ? (target - lon[lo]) / segLen : 0;
    const p0     = coords[lo];
    const p1     = coords[Math.min(lo + 1, coords.length - 1)];
    resultado.push([
      p0[0] + t * (p1[0] - p0[0]),
      p0[1] + t * (p1[1] - p0[1]),
    ]);
  }
  return resultado;
}


// ==================== COMPATIBILIDAD ENTRE TRAZOS ====================

// Calcula la compatibilidad entre dos trazos muestreados, devolviendo
// un valor en [0, 1]. Combina tres métricas del algoritmo FDEB original:
//   - Ángulo: |cos θ| entre las direcciones globales
//   - Escala: similitud de longitudes
//   - Posición: proximidad de los puntos medios
function calcularCompatibilidad(ptsA, ptsB) {
  const nA = ptsA.length, nB = ptsB.length;
  if (nA < 2 || nB < 2) return 0;

  // Vectores de dirección global (primer → último punto)
  const dA   = [ptsA[nA - 1][0] - ptsA[0][0], ptsA[nA - 1][1] - ptsA[0][1]];
  const dB   = [ptsB[nB - 1][0] - ptsB[0][0], ptsB[nB - 1][1] - ptsB[0][1]];
  const lenA = Math.sqrt(dA[0] ** 2 + dA[1] ** 2);
  const lenB = Math.sqrt(dB[0] ** 2 + dB[1] ** 2);
  if (lenA < 1 || lenB < 1) return 0;

  // Compatibilidad de ángulo
  const cosA = Math.abs((dA[0] * dB[0] + dA[1] * dB[1]) / (lenA * lenB));

  // Compatibilidad de escala
  const lavg = (lenA + lenB) / 2;
  const cEsc = 2 / (lavg / Math.min(lenA, lenB) + Math.max(lenA, lenB) / lavg);

  // Compatibilidad de posición (distancia entre puntos medios)
  const mA   = ptsA[Math.floor(nA / 2)];
  const mB   = ptsB[Math.floor(nB / 2)];
  const dMid = Math.sqrt((mA[0] - mB[0]) ** 2 + (mA[1] - mB[1]) ** 2);
  const cPos = lavg / (lavg + dMid);

  return cosA * cEsc * cPos;
}

// Construye la matriz de compatibilidad N×N para un array de trazos muestreados.
function calcularMatrizCompatibilidad(arrayDePts) {
  const N = arrayDePts.length;
  const m = Array.from({ length: N }, () => new Float32Array(N));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const c = calcularCompatibilidad(arrayDePts[i], arrayDePts[j]);
      m[i][j] = c;
      m[j][i] = c;
    }
  }
  return m;
}


function aplicarBundling(trazosCoords, config = {}) {
  const N = trazosCoords.length;
  if (N < 2) return trazosCoords;

  // ==================== CONFIGURACIÓN ====================
  const cfg = {
    // Número inicial de puntos de control por trazo
    puntosPorTrazo: config.puntosPorTrazo ?? 30,

    // Número de ciclos (cada ciclo subdivide → más detalle)
    ciclos: config.ciclos ?? 6,

    // Iteraciones internas por ciclo
    iteracionesPorCiclo: config.iteracionesPorCiclo ?? 60,

    // Tamaño del paso (movimiento por iteración)
    tasaActualizacion: config.tasaActualizacion ?? 0.02,

    // Fuerza que mantiene la forma del trazo (suavizado)
    constanteResorte: config.constanteResorte ?? 0.03,

    // Fuerza de atracción entre trazos compatibles
    constanteAtraccion: config.constanteAtraccion ?? 0.25,

    // Umbral de compatibilidad (0–1)
    compatibilidadMinima: config.compatibilidadMinima ?? 0.4,

    // Normalizar fuerzas por número de vecinos
    normalizarAtraccion: config.normalizarAtraccion ?? true,
  };

  // ==================== INICIALIZACIÓN ====================
  let ctrlPts = trazosCoords.map(c => muestrearUniforme(c, cfg.puntosPorTrazo));
  const compat = calcularMatrizCompatibilidad(ctrlPts);

  // ==================== CICLOS ====================
  for (let ciclo = 0; ciclo < cfg.ciclos; ciclo++) {

    const paso = cfg.tasaActualizacion / (ciclo + 1);
    const K    = cfg.constanteResorte;

    for (let iter = 0; iter < cfg.iteracionesPorCiclo; iter++) {

      for (let i = 0; i < N; i++) {
        const pts = ctrlPts[i];
        const P   = pts.length;

        for (let k = 1; k < P - 1; k++) {
          let fx = 0, fy = 0;

          // ==================== RESORTE ====================
          const kS = K * (P - 1);
          fx += kS * (pts[k - 1][0] + pts[k + 1][0] - 2 * pts[k][0]);
          fy += kS * (pts[k - 1][1] + pts[k + 1][1] - 2 * pts[k][1]);

          // ==================== ATRACCIÓN ====================
          let count = 0;

          for (let j = 0; j < N; j++) {
            if (i === j) continue;

            const c = compat[i][j];
            if (c < cfg.compatibilidadMinima) continue;

            const pJ  = ctrlPts[j];
            const idx = Math.min(k, pJ.length - 1);

            fx += cfg.constanteAtraccion * c * (pJ[idx][0] - pts[k][0]);
            fy += cfg.constanteAtraccion * c * (pJ[idx][1] - pts[k][1]);

            count++;
          }

          // Normalización opcional (MUY recomendable)
          if (cfg.normalizarAtraccion && count > 0) {
            fx /= count;
            fy /= count;
          }

          // ==================== ACTUALIZACIÓN ====================
          pts[k] = [
            pts[k][0] + paso * fx,
            pts[k][1] + paso * fy,
          ];
        }
      }
    }

    // ==================== SUBDIVISIÓN ====================
    if (ciclo < cfg.ciclos - 1) {
      ctrlPts = ctrlPts.map(pts => {
        const nuevos = [pts[0]];
        for (let k = 0; k < pts.length - 1; k++) {
          nuevos.push([
            (pts[k][0] + pts[k + 1][0]) / 2,
            (pts[k][1] + pts[k + 1][1]) / 2
          ]);
          nuevos.push(pts[k + 1]);
        }
        return nuevos;
      });
    }
  }

  return ctrlPts;
}


// ==================== SUAVIZADO LAPLACIANO ====================

// Aplica `pasos` iteraciones de suavizado laplaciano al trazo.
// Cada iteración reemplaza cada punto interior por el promedio de sus vecinos.
// Los extremos permanecen fijos para no alterar el inicio y el final.
// El slider de "Intensidad" en la interfaz controla directamente `pasos`.
function suavizarLaplacian(coords, pasos) {
  if (coords.length < 3) return coords;
  let pts = coords;
  for (let iter = 0; iter < pasos; iter++) {
    const s = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      s.push([
        (pts[i - 1][0] + pts[i][0] + pts[i + 1][0]) / 3,
        (pts[i - 1][1] + pts[i][1] + pts[i + 1][1]) / 3,
      ]);
    }
    s.push(pts[pts.length - 1]);
    pts = s;
  }
  return pts;
}


// ==================== EXTRACCIÓN Y TRANSFORMACIÓN ====================

// Extrae todos los trazos de tipo Draw de las respuestas y los transforma
// a coordenadas del canvas de visualización dentro de la celda dada.
// Reutiliza calcularTransformDatos() de datos-renderer.js (mismo scope).
function extraerYTransformarDraw(celda, respuestas) {
  const resultado = [];
  respuestas.forEach(respuesta => {
    if (!respuesta || !respuesta.trazos) return;
    const { offsetX, offsetY, escala } = calcularTransformDatos(celda, respuesta.tamañoCanvas);
    respuesta.trazos
      .filter(t => t.herramienta === 'Draw')
      .forEach(trazo => {
        resultado.push(
          trazo.coordenadas.map(([x, y]) => [x * escala + offsetX, y * escala + offsetY])
        );
      });
  });
  return resultado;
}


// ==================== PIPELINE DE PROCESADO ====================

// Aplica la cadena de procesos a los trazos en coordenadas de canvas:
//   1. Edge bundling (si activado): reubica puntos de control
//   2. Suavizado laplaciano (si activado): suaviza las curvas resultantes
//
// El orden importa: bundlear primero para agrupar las curvas, luego suavizar
// el resultado para obtener trazados limpios.
function procesarTrazos(trazosCoords, opciones) {
  let coords = trazosCoords;

  if (opciones.bundling && coords.length > 1) {
    coords = aplicarBundling(coords);
  }

  if (opciones.suavizado) {
    const pasos = Math.max(1, Math.round(opciones.intensidadSuavizado || 5));
    coords = coords.map(c => suavizarLaplacian(c, pasos));
  }

  return coords;
}


// ==================== RENDERIZADO ====================

// Dibuja un trazo en negro con el grosor y opacidad especificados.
function pintarTrazoMono(ctx, coordenadas, grosor, opacidad) {
  if (!coordenadas || coordenadas.length < 2) return;

  ctx.save();
  ctx.globalAlpha              = opacidad;
  ctx.strokeStyle              = '#000000';
  ctx.lineWidth                = grosor;
  ctx.lineCap                  = 'round';
  ctx.lineJoin                 = 'round';
  ctx.globalCompositeOperation = 'source-over';

  ctx.beginPath();
  ctx.moveTo(coordenadas[0][0], coordenadas[0][1]);
  for (let i = 1; i < coordenadas.length; i++) {
    ctx.lineTo(coordenadas[i][0], coordenadas[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}


// ==================== FUNCIONES PÚBLICAS ====================

// Modo "una": todos los trazos Draw de todas las respuestas activas se procesan
// juntos en una única celda. Es el modo más interesante para el bundling porque
// agrupa trazos de distintos usuarios que siguen rutas similares.
// NOTA: no llama a clearRect — el llamador gestiona la limpieza del canvas.
function pintarLineasMonoEnUna(ctx, canvas, respuestasActivas, opciones) {
  if (!respuestasActivas.length) return;

  const celda  = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const trazos = extraerYTransformarDraw(celda, respuestasActivas);
  if (!trazos.length) return;

  procesarTrazos(trazos, opciones)
    .forEach(coords => pintarTrazoMono(ctx, coords, opciones.grosor, opciones.opacidad));
}

// Modo "varias": una celda por respuesta. El bundling actúa sobre los trazos
// de cada usuario de forma independiente.
// NOTA: no llama a clearRect — el llamador gestiona la limpieza del canvas.
function pintarLineasMonoEnGrid(ctx, canvas, respuestasActivas, opciones) {
  if (!respuestasActivas.length) return;

  // calcularGrid está en canvas-renderer.js (mismo scope)
  const { cols, filas } = calcularGrid(respuestasActivas.length, canvas.width, canvas.height);
  const celdaW = canvas.width  / cols;
  const celdaH = canvas.height / filas;

  respuestasActivas.forEach((respuesta, i) => {
    const col    = i % cols;
    const fila   = Math.floor(i / cols);
    const celda  = { x: col * celdaW, y: fila * celdaH, w: celdaW, h: celdaH };
    const trazos = extraerYTransformarDraw(celda, [respuesta]);
    procesarTrazos(trazos, opciones)
      .forEach(coords => pintarTrazoMono(ctx, coords, opciones.grosor, opciones.opacidad));
  });
}
