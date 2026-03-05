let svgDoc = null;

async function cargarSVG() {
  if (svgDoc) return svgDoc;
  const res = await fetch('data/plantas.svg');
  const text = await res.text();
  const parser = new DOMParser();
  svgDoc = parser.parseFromString(text, 'image/svg+xml');
  return svgDoc;
}

async function obtenerCapaConBbox(numeroPlanta) {
  const doc = await cargarSVG();

  let capa = null;
  Array.from(doc.getElementsByTagName('g')).forEach(g => {
    if (g.getAttribute('inkscape:label') === `planta_${numeroPlanta}`) capa = g;
  });
  if (!capa) { console.warn(`No se encontró planta_${numeroPlanta}`); return null; }

  let outline = null;
  Array.from(capa.getElementsByTagName('path')).forEach(p => {
    if (p.getAttribute('inkscape:label') === 'outline') outline = p;
  });
  if (!outline) { console.warn('No se encontró outline'); return null; }

  // SVG temporal para medir getBBox()
  const svgTmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgTmp.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0';
  document.body.appendChild(svgTmp);
  const outlineClone = outline.cloneNode(true);
  svgTmp.appendChild(outlineClone);
  const bbox = outlineClone.getBBox();
  document.body.removeChild(svgTmp);

  return { capa, bbox };
}
