// Calcula columnas y filas óptimas para N celdas en un canvas de W x H
function calcularGrid(n, canvasW, canvasH) {
  let mejorCols = 1, mejorMin = 0;
  for (let cols = 1; cols <= n; cols++) {
    const filas = Math.ceil(n / cols);
    const celdaW = canvasW / cols;
    const celdaH = canvasH / filas;
    // Maximizamos el lado más corto: la celda más cuadrada posible
    const minLado = Math.min(celdaW, celdaH);
    if (minLado > mejorMin) { mejorMin = minLado; mejorCols = cols; }
  }
  return { cols: mejorCols, filas: Math.ceil(n / mejorCols) };
}

// Dibuja una capa SVG dentro de una celda concreta del canvas
function dibujarEnCelda(ctx, celda, capa, bbox) {
  const margen = Math.min(celda.w, celda.h) * 0.15;
  const areaW = celda.w - margen * 2;
  const areaH = celda.h - margen * 2;
  const escala = Math.min(areaW / bbox.width, areaH / bbox.height);
  const offsetX = celda.x + margen + (areaW - bbox.width * escala) / 2 - bbox.x * escala;
  const offsetY = celda.y + margen + (areaH - bbox.height * escala) / 2 - bbox.y * escala;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(escala, escala);

  Array.from(capa.getElementsByTagName('path')).forEach(path => {
    const nombre = path.getAttribute('inkscape:label') || path.getAttribute('id') || '';
    const estilo = getEstilo(nombre);
    if (!estilo) return;

    const p2d = new Path2D(path.getAttribute('d'));
    ctx.lineCap = estilo.lineCap;
    ctx.lineJoin = estilo.lineJoin;
    ctx.lineWidth = estilo.strokeWidth / escala;
    ctx.setLineDash(estilo.lineDash.length ? estilo.lineDash.map(v => v / escala) : []);

    if (estilo.fillColor) {
      ctx.fillStyle = estilo.fillColor;
      ctx.fill(p2d);
    }
    ctx.strokeStyle = estilo.strokeColor;
    ctx.stroke(p2d);
  });

  ctx.restore();
}

// Dibuja todas las celdas: recibe array de { capa, bbox }
function dibujarTodo(ctx, canvas, plantas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!plantas.length) return;

  debugGrid(plantas.length, canvas.width, canvas.height);
  const { cols, filas } = calcularGrid(plantas.length, canvas.width, canvas.height);
  console.log('Resultado usado → cols:', cols, 'filas:', filas, 'celdaW:', canvas.width/cols, 'celdaH:', canvas.height/filas);
  const celdaW = canvas.width / cols;
  const celdaH = canvas.height / filas;

  plantas.forEach(({ capa, bbox }, i) => {
    const col = i % cols;
    const fila = Math.floor(i / cols);
    const celda = { x: col * celdaW, y: fila * celdaH, w: celdaW, h: celdaH };
    dibujarEnCelda(ctx, celda, capa, bbox);
  });
}


// DEBUG: loguea el resultado de calcularGrid
function debugGrid(n, canvasW, canvasH) {
  const { cols, filas } = calcularGrid(n, canvasW, canvasH);
  console.log(`calcularGrid(n=${n}, W=${canvasW}, H=${canvasH}) → cols=${cols}, filas=${filas}`);
  for (let c = 1; c <= n; c++) {
    const f = Math.ceil(n / c);
    const cW = canvasW / c;
    const cH = canvasH / f;
    console.log(`  cols=${c} filas=${f} celdaW=${cW.toFixed(0)} celdaH=${cH.toFixed(0)} area=${(cW*cH).toFixed(0)}`);
  }
}