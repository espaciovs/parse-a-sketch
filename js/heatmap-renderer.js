// ==================== PARÁMETROS CONFIGURABLES ====================
//
// Todos los parámetros visuales están aquí. Modifica estos valores para
// ajustar el aspecto del heatmap sin tocar el código de renderizado.

const HEATMAP_CONFIG = {

  // ── Campo de influencia ─────────────────────────────────────────
  // Radio de influencia de cada punto, en píxeles del canvas de visualización.
  // Valor mayor = manchas más grandes y suaves.
  radioInfluencia: 65,

  // Función de peso que controla cómo decae la influencia con la distancia:
  //   'gaussian' → decaimiento suave en curva de campana (efecto "metaballs")
  //   'linear'   → decaimiento lineal en forma de cono (bordes más nítidos)
  tipoGradiente: 'gaussian',

  // Factor de submuestreo para acelerar el cálculo.
  // 1 = calidad máxima (un píxel = una muestra), 3 = 9× más rápido.
  // Para visualizaciones interactivas, 2-4 es un buen equilibrio.
  resolucion: 3,


  // ── Degradado de color ──────────────────────────────────────────
  // Paleta de color: array de paradas [t, r, g, b, a]
  //   t ∈ [0,1]:  posición en el gradiente (0 = mínima influencia, 1 = máxima)
  //   r,g,b:      valores RGB (0-255)
  //   a:          canal alfa (0-255)
  paletaColor: [
    [0.00,  255, 130, 160,   0],   // totalmente transparente (sin influencia)
    [0.25,  255,  90, 140, 100],   // rosa claro semitransparente
    [0.55,  210,  30,  90, 190],   // rosa medio
    [1.00,  130,   0,  50, 230],   // rosado oscuro intenso
  ],

  // Umbral mínimo de influencia normalizada (0-1) por debajo del cual
  // el pixel es completamente transparente. Elimina el "ruido de fondo".
  umbralMinimo: 0.04,

  // Opacidad global aplicada sobre el canal alfa de la paleta (0-1).
  opacidadGlobal: 0.90,


  // ── Líneas de contorno topográficas ────────────────────────────

  // Activar o desactivar todas las líneas de contorno.
  mostrarLineas: true,

  // Separación entre isocurvas en influencia normalizada (0-1).
  // Valor menor = más líneas, como cotas más próximas en un mapa topográfico.
  separacionLineas: 0.12,

  // Rango de isocurvas a dibujar. Fuera de este rango no se dibuja ninguna
  // línea, evitando ruido en los bordes transparentes (bajo) y en el centro
  // saturado (alto).
  lineaMin: 0.08,
  lineaMax: 0.88,

  // Grosor de las líneas de contorno en píxeles.
  grosorLineas: 0.9,

  // Color de las líneas de contorno.
  colorLineas: 'rgba(140, 0, 60, 0.65)',

  // Patrón de las líneas de contorno, aplicado de abajo hacia arriba
  // (de menor a mayor influencia):
  //   'solid'       → todas sólidas
  //   'dashed'      → todas discontinuas
  //   'alternate'   → sólida, discontinua, sólida, discontinua…
  //   'double-dash' → discontinua, discontinua, sólida, repite
  patronLineas: 'double-dash',

  // Longitud y espacio del segmento discontinuo: [longitud_px, espacio_px]
  dashLineas: [5, 3],

};


// ==================== FUNCIONES DE PESO ====================

// Decaimiento gaussiano: suave, sin borde nítido
function pesoGaussiano(dist, radio) {
  return Math.exp(-(dist * dist) / (2 * radio * radio));
}

// Decaimiento lineal: forma de cono con borde nítido en `radio`
function pesoLineal(dist, radio) {
  return Math.max(0, 1 - dist / radio);
}


// ==================== RECOPILACIÓN DE PUNTOS ====================

// Extrae todos los trazos de tipo Point de las respuestas activas y los
// transforma a coordenadas del canvas de visualización dentro de la celda.
// Reutiliza calcularTransformDatos() de datos-renderer.js.
//
// celda:     { x, y, w, h } — celda en el canvas de visualización
// respuestas: array de objetos de respuesta del JSON
function recopilarPuntosDeCelda(celda, respuestas) {
  const puntos = [];
  respuestas.forEach(respuesta => {
    if (!respuesta || !respuesta.trazos) return;
    const { offsetX, offsetY, escala } = calcularTransformDatos(celda, respuesta.tamañoCanvas);
    respuesta.trazos
      .filter(t => t.herramienta === 'Point')
      .forEach(trazo => {
        trazo.coordenadas.forEach(([x, y]) => {
          // Aplicar el mismo transform que usa datos-renderer.js
          puntos.push({ x: x * escala + offsetX, y: y * escala + offsetY });
        });
      });
  });
  return puntos;
}


// ==================== CAMPO DE INFLUENCIA ====================

// Construye una cuadrícula de influencia de tamaño (w × h) celdas,
// submuestreada según HEATMAP_CONFIG.resolucion.
// Cada celda (gx, gy) representa el centro en píxeles (gx+0.5)*res, (gy+0.5)*res.
function construirCampo(puntos, anchoCelda, altoCelda) {
  const res    = HEATMAP_CONFIG.resolucion;
  const w      = Math.ceil(anchoCelda / res);
  const h      = Math.ceil(altoCelda  / res);
  const campo  = new Float32Array(w * h);
  const radio  = HEATMAP_CONFIG.radioInfluencia;
  const fnPeso = HEATMAP_CONFIG.tipoGradiente === 'gaussian' ? pesoGaussiano : pesoLineal;

  for (let gy = 0; gy < h; gy++) {
    const py = (gy + 0.5) * res;
    for (let gx = 0; gx < w; gx++) {
      const px = (gx + 0.5) * res;
      let inf  = 0;
      for (const pt of puntos) {
        const dx = px - pt.x;
        const dy = py - pt.y;
        inf += fnPeso(Math.sqrt(dx * dx + dy * dy), radio);
      }
      campo[gy * w + gx] = inf;
    }
  }
  return { campo, w, h };
}

// Normaliza el campo al rango [0, 1] dividiendo por el máximo.
function normalizarCampo(campo, n) {
  let max = 0;
  for (let i = 0; i < n; i++) if (campo[i] > max) max = campo[i];
  if (max === 0) return campo;
  const norm = new Float32Array(n);
  for (let i = 0; i < n; i++) norm[i] = campo[i] / max;
  return norm;
}


// ==================== DEGRADADO DE COLOR ====================

// Devuelve [r, g, b, a] interpolando en la paleta de color para un valor t ∈ [0,1].
function muestrearPaleta(t) {
  const p = HEATMAP_CONFIG.paletaColor;
  if (t <= p[0][0]) return [...p[0].slice(1)];
  if (t >= p[p.length - 1][0]) return [...p[p.length - 1].slice(1)];
  for (let i = 0; i < p.length - 1; i++) {
    if (t >= p[i][0] && t <= p[i + 1][0]) {
      const s = (t - p[i][0]) / (p[i + 1][0] - p[i][0]);
      return [
        p[i][1] + s * (p[i + 1][1] - p[i][1]),
        p[i][2] + s * (p[i + 1][2] - p[i][2]),
        p[i][3] + s * (p[i + 1][3] - p[i][3]),
        p[i][4] + s * (p[i + 1][4] - p[i][4]),
      ];
    }
  }
  return [0, 0, 0, 0];
}


// ==================== RENDERIZADO DEL DEGRADADO ====================

// Genera un ImageData del tamaño de la celda usando el campo normalizado.
// Utiliza interpolación bilineal del campo de baja resolución para
// obtener un resultado suave sin artefactos de píxelado.
function renderizarCampo(ctx, campoNorm, gridW, gridH, anchoCelda, altoCelda) {
  const res       = HEATMAP_CONFIG.resolucion;
  const imageData = ctx.createImageData(anchoCelda, altoCelda);
  const data      = imageData.data;
  const umbral    = HEATMAP_CONFIG.umbralMinimo;
  const opGlobal  = HEATMAP_CONFIG.opacidadGlobal;

  for (let py = 0; py < altoCelda; py++) {
    for (let px = 0; px < anchoCelda; px++) {
      // Posición fraccionaria en el grid (las muestras están centradas en cada celda)
      const fx  = px / res - 0.5;
      const fy  = py / res - 0.5;

      // Cuatro celdas vecinas para interpolación bilineal
      const gx0 = Math.max(0, Math.min(gridW - 2, Math.floor(fx)));
      const gy0 = Math.max(0, Math.min(gridH - 2, Math.floor(fy)));
      const gx1 = gx0 + 1;
      const gy1 = gy0 + 1;
      const tx  = Math.max(0, Math.min(1, fx - gx0));
      const ty  = Math.max(0, Math.min(1, fy - gy0));

      // Valores en las cuatro esquinas
      const v00 = campoNorm[gy0 * gridW + gx0];
      const v10 = campoNorm[gy0 * gridW + gx1];
      const v01 = campoNorm[gy1 * gridW + gx0];
      const v11 = campoNorm[gy1 * gridW + gx1];

      // Interpolación bilineal
      const v = v00 * (1 - tx) * (1 - ty)
              + v10 * tx       * (1 - ty)
              + v01 * (1 - tx) * ty
              + v11 * tx       * ty;

      if (v < umbral) continue; // deja el pixel transparente

      // Remap de [umbral, 1] → [0, 1] para mapear la paleta
      const t = Math.min(1, (v - umbral) / (1 - umbral));
      const [r, g, b, a] = muestrearPaleta(t);

      const i  = (py * anchoCelda + px) * 4;
      data[i]     = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = Math.round(a * opGlobal);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}


// ==================== LÍNEAS DE CONTORNO — MARCHING SQUARES ====================
//
// Para cada umbral (isocurva), recorre la cuadrícula de campo en celdas de 2×2
// e identifica los segmentos de línea usando la tabla de marching squares.
// La interpolación lineal (no solo punto medio) da contornos suaves.

// Tabla estándar de marching squares: para cada caso de 4 bits
// (TL=bit3, TR=bit2, BR=bit1, BL=bit0), lista de pares de aristas a unir.
// Aristas: 0=top, 1=right, 2=bottom, 3=left.
const MS_TABLE = [
  [],                   // 0:  0000 — todo fuera
  [[2, 3]],             // 1:  0001 — BL
  [[1, 2]],             // 2:  0010 — BR
  [[1, 3]],             // 3:  0011 — BR+BL
  [[0, 1]],             // 4:  0100 — TR
  [[0, 3], [1, 2]],     // 5:  0101 — TR+BL (silla de montar)
  [[0, 2]],             // 6:  0110 — TR+BR
  [[0, 3]],             // 7:  0111 — TR+BR+BL
  [[0, 3]],             // 8:  1000 — TL
  [[0, 2]],             // 9:  1001 — TL+BL
  [[0, 1], [2, 3]],     // 10: 1010 — TL+BR (silla de montar)
  [[0, 1]],             // 11: 1011 — TL+BR+BL
  [[1, 3]],             // 12: 1100 — TL+TR
  [[1, 2]],             // 13: 1101 — TL+TR+BL
  [[2, 3]],             // 14: 1110 — TL+TR+BR
  [],                   // 15: 1111 — todo dentro
];

// Interpolación lineal: posición del cruce del umbral entre pos0 (val0) y pos1 (val1)
function interpolar(pos0, pos1, val0, val1, thresh) {
  const dv = val1 - val0;
  if (Math.abs(dv) < 1e-9) return (pos0 + pos1) * 0.5;
  return pos0 + (thresh - val0) / dv * (pos1 - pos0);
}

// Devuelve la coordenada {x, y} donde la isocurva cruza la arista `arista`
// dentro de la celda de cuadrícula (gx, gy).
function puntoArista(arista, gx, gy, cellW, cellH, tl, tr, br, bl, thresh) {
  const x0 = gx * cellW, y0 = gy * cellH;
  const x1 = x0 + cellW, y1 = y0 + cellH;
  switch (arista) {
    case 0: return { x: interpolar(x0, x1, tl, tr, thresh), y: y0 }; // top
    case 1: return { x: x1,                                  y: interpolar(y0, y1, tr, br, thresh) }; // right
    case 2: return { x: interpolar(x0, x1, bl, br, thresh), y: y1 }; // bottom
    case 3: return { x: x0,                                  y: interpolar(y0, y1, tl, bl, thresh) }; // left
  }
}

// Devuelve el patrón de dash para la línea de índice `idx` (0 = más baja).
// Permite mezclar sólidas y discontinuas según HEATMAP_CONFIG.patronLineas.
function obtenerDash(idx) {
  const dash = HEATMAP_CONFIG.dashLineas;
  switch (HEATMAP_CONFIG.patronLineas) {
    case 'solid':        return [];
    case 'dashed':       return dash;
    case 'alternate':    return idx % 2 === 0 ? [] : dash;      // 0:solid 1:dash 2:solid …
    case 'double-dash':  return idx % 3 === 2 ? [] : dash;      // 0:dash 1:dash 2:solid …
    default:             return [];
  }
}

// Recopila todos los segmentos de una isocurva (un par de puntos {x,y} por segmento)
// para un umbral dado, recorriendo la cuadrícula con marching squares.
function recopilarSegmentos(campoNorm, gridW, gridH, cellW, cellH, thresh) {
  const segs = [];
  for (let gy = 0; gy < gridH - 1; gy++) {
    for (let gx = 0; gx < gridW - 1; gx++) {
      const tl = campoNorm[gy       * gridW + gx    ];
      const tr = campoNorm[gy       * gridW + gx + 1];
      const br = campoNorm[(gy + 1) * gridW + gx + 1];
      const bl = campoNorm[(gy + 1) * gridW + gx    ];

      const idx = ((tl >= thresh) ? 8 : 0)
                | ((tr >= thresh) ? 4 : 0)
                | ((br >= thresh) ? 2 : 0)
                | ((bl >= thresh) ? 1 : 0);

      for (const [e0, e1] of MS_TABLE[idx]) {
        segs.push([
          puntoArista(e0, gx, gy, cellW, cellH, tl, tr, br, bl, thresh),
          puntoArista(e1, gx, gy, cellW, cellH, tl, tr, br, bl, thresh),
        ]);
      }
    }
  }
  return segs;
}

// Encadena los segmentos sueltos del marching squares en polilíneas continuas.
//
// El problema que resuelve: si dibujamos cada segmento como un subpath
// independiente (moveTo/lineTo), el dash pattern se reinicia en cada
// segmento (~3-5 px). Como el primer tramo sólido suele ser mayor,
// todo parece solid. Encadenando, cada isocurva es un único path largo
// al que se aplica el dash de forma coherente.
//
// Los vértices compartidos entre celdas adyacentes son exactamente iguales
// (mismo cálculo, mismas entradas), así que la clave de coincidencia
// funciona sin tolerancias.
function encadenarSegmentos(segs) {
  const clave = p => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

  // Mapa: clave de vértice → lista de {idx, otroExtremo}
  const adj = new Map();
  segs.forEach(([p0, p1], i) => {
    const k0 = clave(p0), k1 = clave(p1);
    if (!adj.has(k0)) adj.set(k0, []);
    if (!adj.has(k1)) adj.set(k1, []);
    adj.get(k0).push({ idx: i, otro: p1 });
    adj.get(k1).push({ idx: i, otro: p0 });
  });

  const usado  = new Uint8Array(segs.length);
  const cadenas = [];

  for (let i = 0; i < segs.length; i++) {
    if (usado[i]) continue;
    usado[i] = 1;

    const cadena = [segs[i][0], segs[i][1]];

    // Extender hacia adelante desde el último punto
    let actual = segs[i][1];
    for (;;) {
      const sig = (adj.get(clave(actual)) || []).find(v => !usado[v.idx]);
      if (!sig) break;
      usado[sig.idx] = 1;
      actual = sig.otro;
      cadena.push(actual);
    }

    // Extender hacia atrás desde el primer punto
    let inicio = segs[i][0];
    for (;;) {
      const sig = (adj.get(clave(inicio)) || []).find(v => !usado[v.idx]);
      if (!sig) break;
      usado[sig.idx] = 1;
      inicio = sig.otro;
      cadena.unshift(inicio);
    }

    cadenas.push(cadena);
  }
  return cadenas;
}

// Dibuja las isocurvas encadenadas. Al ser polilíneas continuas, el dash
// pattern se aplica a lo largo de toda la curva en lugar de reiniciarse
// en cada segmento de celda.
function dibujarContornos(ctx, campoNorm, gridW, gridH, anchoCelda, altoCelda) {
  if (!HEATMAP_CONFIG.mostrarLineas) return;

  const cellW  = anchoCelda / gridW;
  const cellH  = altoCelda  / gridH;
  const sep    = HEATMAP_CONFIG.separacionLineas;
  const linMin = HEATMAP_CONFIG.lineaMin;
  const linMax = HEATMAP_CONFIG.lineaMax;
  const nLineas = Math.round((linMax - linMin) / sep);

  ctx.save();
  ctx.lineWidth   = HEATMAP_CONFIG.grosorLineas;
  ctx.strokeStyle = HEATMAP_CONFIG.colorLineas;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  for (let li = 0; li <= nLineas; li++) {
    const thresh  = linMin + li * sep;
    ctx.setLineDash(obtenerDash(li));

    const segs    = recopilarSegmentos(campoNorm, gridW, gridH, cellW, cellH, thresh);
    const cadenas = encadenarSegmentos(segs);

    // Cada cadena es un path continuo → el dash corre coherentemente a lo largo
    ctx.beginPath();
    for (const cadena of cadenas) {
      ctx.moveTo(cadena[0].x, cadena[0].y);
      for (let j = 1; j < cadena.length; j++) {
        ctx.lineTo(cadena[j].x, cadena[j].y);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}


// ==================== FUNCIONES PÚBLICAS ====================

// Renderiza el heatmap de un array de respuestas dentro de una celda.
// Usa un canvas auxiliar para poder hacer putImageData y luego lo vuelca
// al canvas principal con drawImage en la posición correcta de la celda.
//
// NOTA: no llama a clearRect — el llamador gestiona la limpieza del canvas.
function pintarHeatmapEnCelda(ctx, celda, respuestas) {
  if (!respuestas || !respuestas.length) return;

  const puntos = recopilarPuntosDeCelda(celda, respuestas);
  if (!puntos.length) return;

  // Construir y normalizar el campo de influencia a la resolución reducida
  const { campo, w, h } = construirCampo(puntos, celda.w, celda.h);
  const campoNorm        = normalizarCampo(campo, w * h);

  // Canvas auxiliar del tamaño exacto de la celda para putImageData
  const aux    = document.createElement('canvas');
  aux.width    = celda.w;
  aux.height   = celda.h;
  const auxCtx = aux.getContext('2d');

  // 1. Degradado de color
  renderizarCampo(auxCtx, campoNorm, w, h, celda.w, celda.h);

  // 2. Líneas de contorno topográficas encima del degradado
  dibujarContornos(auxCtx, campoNorm, w, h, celda.w, celda.h);

  // Volcar el canvas auxiliar al canvas principal en la posición de la celda
  ctx.drawImage(aux, celda.x, celda.y);
}

// ── Modo "una": todos los puntos de todas las respuestas en una sola celda
function pintarHeatmapEnUna(ctx, canvas, respuestasActivas) {
  const celda = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  pintarHeatmapEnCelda(ctx, celda, respuestasActivas);
}

// ── Modo "varias": cada celda recibe solo los puntos de su respuesta
function pintarHeatmapEnGrid(ctx, canvas, respuestasActivas) {
  if (!respuestasActivas.length) return;

  // calcularGrid está definida en canvas-renderer.js (mismo scope de scripts)
  const { cols, filas } = calcularGrid(respuestasActivas.length, canvas.width, canvas.height);
  const celdaW = canvas.width  / cols;
  const celdaH = canvas.height / filas;

  respuestasActivas.forEach((respuesta, i) => {
    const col   = i % cols;
    const fila  = Math.floor(i / cols);
    const celda = { x: col * celdaW, y: fila * celdaH, w: celdaW, h: celdaH };
    pintarHeatmapEnCelda(ctx, celda, [respuesta]);
  });
}
