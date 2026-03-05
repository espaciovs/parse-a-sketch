const lineStyles = {
  muro: {
    strokeWidth: 2,
    strokeColor: "black",
    lineDash: [],
    lineCap: "round",
    lineJoin: "round",
    fillColor: "#e3c0ff"
  },
  mobiliario: {
    strokeWidth: 0.5,
    strokeColor: "black",
    lineDash: [],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  },
  fina: {
    strokeWidth: 1,
    strokeColor: "black",
    lineDash: [],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  },
  outline: {
    strokeWidth: 1,
    strokeColor: "black",
    lineDash: [5, 5],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  },
  discontinua: {
    strokeWidth: 1,
    strokeColor: "black",
    lineDash: [5, 3],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  },
  puntos: {
    strokeWidth: 1,
    strokeColor: "black",
    lineDash: [2, 4],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  },
  puerta: {
    strokeWidth: 2,
    strokeColor: "black",
    lineDash: [],
    lineCap: "round",
    lineJoin: "round",
    fillColor: ""
  }
};

function getEstilo(nombrePath) {
  if (!nombrePath) return null;
  const key = Object.keys(lineStyles).find(k => nombrePath.includes(k));
  return key ? lineStyles[key] : null;
}
