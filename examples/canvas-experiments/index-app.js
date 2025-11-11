// ==================== CONFIGURACIÓN Y CONSTANTES ====================
const CONFIG = {
  IPhost: `http://192.168.1.129:5000`,

  colors: {
    //===== COLORES DRAW =====//
    red: "#ff548d",
    green: "#55ffad",
    point: "#fa7bb8",
    //===== COLORES REDRAW ====//
    borrador: "#ffffff",
    pared: "#000000",
    asientos: "#0000ff",
    plantas: "#00ff00",
    iluminacion: "#ff0000",
    textil: "#ffff00",
    resto: "#00ffff",
    ventana: "#ff00ff",
  },
  canvas: {
    lineWidth: 6,
    eraseWidth: 20,
    pointRadius: 7,
    textFont: "18px Ubuntu, sans-serif",
  },
  cursors: {
    Draw: "default",
    Text: "text",
    Point: "crosshair",
    MoveObject: "default",
  },
  doubleTap: {
    threshold: 1200,
    distance: 80,
  },
};

// ==================== ESTADO GLOBAL DE LA APLICACIÓN ====================
const appState = {
  // Canvas y contexto
  canvas: null,
  ctx: null,
  container: null,

  // Modo actual
  modoCanvas: null,
  herramientaActual: null, // Para sub-herramientas en MoveObject

  // Color y estilo
  currentColor: "green",

  // Objetos dibujados
  textObjects: [],
  moveableObjects: [], // Para objetos que se pueden mover en MoveObject
  pointObjects: [], // Para objetos de punto

  // Estado de interacción
  isDrawing: false,
  draggingText: null,
  draggingObject: null,
  dragOffset: { x: 0, y: 0 },

  // Double tap detection
  lastTap: { time: 0, x: 0, y: 0 },

  // Preguntas
  preguntas: [],
  preguntaIndex: 0,
  navegacionHabilitada: false,

  // Planta
  plantaActual: null,

  // Data para Flask
  user: null,
  corregido: false,
  data: [],
  currentData: [],
};

// ==================== INICIALIZACIÓN ====================
function initApp() {
  appState.user = getOrCreateUserId();
  console.log("user: " + appState.user);
  initCanvas();
  initEventListeners();
  cargarPreguntas();
  actualizarEstadoNavegacion();

  // Simular socket.io si no está disponible
  if (typeof io === "undefined") {
    console.warn("Socket.io no disponible. Modo demo.");
  }
}

function initCanvas() {
  appState.canvas = document.getElementById("myCanvas");
  appState.container = document.getElementById("planta");
  appState.ctx = appState.canvas.getContext("2d");

  resizeCanvas();
  setupCanvasStyle();
}

function resizeCanvas() {
  const size = Math.min(
    appState.container.clientWidth,
    appState.container.clientHeight
  );

  // Guardar contenido si existe
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = appState.canvas.width;
  tempCanvas.height = appState.canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(appState.canvas, 0, 0);

  // Redimensionar
  appState.canvas.width = size;
  appState.canvas.height = size;

  // Restaurar contenido
  appState.ctx.drawImage(tempCanvas, 0, 0, size, size);
  setupCanvasStyle();
  redrawAll(false);
}

function setupCanvasStyle() {
  const ctx = appState.ctx;
  ctx.strokeStyle = CONFIG.colors[appState.currentColor];
  ctx.fillStyle = CONFIG.colors[appState.currentColor];
  ctx.lineWidth = CONFIG.canvas.lineWidth;
  ctx.lineCap = "round";
  ctx.font = CONFIG.canvas.textFont;
}

// ==================== GESTIÓN DE MODOS ====================
function cambiarModo(nuevoModo, herramienta = null) {
  appState.modoCanvas = nuevoModo;
  appState.herramientaActual = herramienta || getHerramientaDefault(nuevoModo);

  actualizarCursor();
  actualizarToolset();
  mostrarInstrucciones();

  console.log(
    `Modo cambiado a: ${nuevoModo}${herramienta ? ` (${herramienta})` : ""}`
  );
}

function mostrarInstrucciones() {
  let textObj = document.getElementById("instrucciones");
  let text = "";
  const modoActual = appState.modoCanvas;

  switch (modoActual) {
    case "Draw":
    case "Redraw":
      text =
        "Elige un color para dibujar sobre la planta, clic en 'clear canvas' para borrar todo el contenido";
      break;

    case "Text":
      text =
        "Elige un color, haz clic en el canvas para introducir el texto, arrastra para moverlo, doble clic para editarlo";
      break;

    case "Point":
      text =
        "Haz clic en el canvas para situar un marcador, clic en 'clear canvas' para borrar todo el contenido";
      break;
  }

  textObj.textContent = text;
  textObj.style.opacity = "1";

  setTimeout(() => {
    textObj.style.opacity = "0";
  }, 300);

  setTimeout(() => {
    textObj.textContent = "";
  }, 5000);
}

function getHerramientaDefault(modo) {
  const defaults = {
    MoveObject: "move",
    Draw: "draw",
    Text: "text",
    Point: "point",
    Redraw: "draw",
  };
  return defaults[modo] || null;
}

function actualizarCursor() {
  const { modoCanvas, herramientaActual } = appState;

  if (modoCanvas === "MoveObject") {
    switch (herramientaActual) {
      case "move":
        appState.canvas.style.cursor = "grab";
        break;
      case "draw":
        appState.canvas.style.cursor = "crosshair";
        break;
      case "erase":
        appState.canvas.style.cursor = "not-allowed";
        break;
    }
  } else {
    appState.canvas.style.cursor = CONFIG.cursors[modoCanvas] || "default";
  }
}

function actualizarToolset() {
  if (!appState.preguntas[appState.preguntaIndex]) return;

  const pregunta = appState.preguntas[appState.preguntaIndex];
  const colorSelectors = document.getElementById("colorSelectors");
  const moveObjectTools = document.getElementById("moveObjectTools");

  // Limpiar selectores de color existentes
  colorSelectors.innerHTML = "";

  // Mostrar/ocultar y configurar selectores de color según el modo
  if (pregunta.modoCanvas === "Redraw") {
    // Para modo Redraw: 8 colores específicos
    const redrawColors = [
      "borrador",
      "pared",
      "asientos",
      "plantas",
      "iluminacion",
      "textil",
      "resto",
      "ventana",
    ];

    redrawColors.forEach((color) => {
      const colorBtn = document.createElement("button");
      colorBtn.className = `color-button ${color}`;
      colorBtn.dataset.color = color;
      colorBtn.style.backgroundColor = CONFIG.colors[color];

      // Seleccionar negro por defecto
      if (color === "black") {
        colorBtn.classList.add("selected");
        appState.currentColor = "black";
        appState.ctx.strokeStyle = CONFIG.colors.black;
        appState.ctx.fillStyle = CONFIG.colors.black;
      }

      colorBtn.addEventListener("click", handleColorSelection);
      colorSelectors.appendChild(colorBtn);
    });

    colorSelectors.classList.remove("hidden");
  } else if (pregunta.colorSelector === "true") {
    // Para otros modos: los 2 colores originales
    const originalColors = ["red", "green"];

    originalColors.forEach((color) => {
      const colorBtn = document.createElement("button");
      colorBtn.className = `color-button ${color}`;
      colorBtn.dataset.color = color;
      colorBtn.style.backgroundColor = CONFIG.colors[color];

      if (color === "green") {
        colorBtn.classList.add("selected");
      }

      colorBtn.addEventListener("click", handleColorSelection);
      colorSelectors.appendChild(colorBtn);
    });

    colorSelectors.classList.remove("hidden");
  } else {
    colorSelectors.classList.add("hidden");
  }

  // Mostrar/ocultar herramientas de MoveObject
  if (pregunta.moveObject === "true") {
    moveObjectTools.classList.remove("hidden");
    updateToolSelection("move");
  } else {
    moveObjectTools.classList.add("hidden");
  }
}

function handleColorSelection(e) {
  const color = e.target.dataset.color;

  appState.currentColor = color;
  appState.ctx.strokeStyle = CONFIG.colors[color];
  appState.ctx.fillStyle = CONFIG.colors[color];

  document.querySelectorAll(".color-button").forEach((b) => {
    b.classList.remove("selected");
  });
  e.target.classList.add("selected");
}

function updateToolSelection(tool) {
  document.querySelectorAll(".tool-button").forEach((btn) => {
    if (btn.dataset.tool === tool) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

// ==================== UTILIDADES DE COORDENADAS ====================
function getCanvasCoordinates(clientX, clientY) {
  const rect = appState.canvas.getBoundingClientRect();
  const scaleX = appState.canvas.width / rect.width;
  const scaleY = appState.canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

// ==================== HANDLERS DE EVENTOS ====================
function handleStart(x, y) {
  const { modoCanvas, herramientaActual, ctx } = appState;

  switch (modoCanvas) {
    case "Draw":
    case "Redraw":
      appState.isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);

      appState.currentData.push(
        modoCanvas === "Redraw" ? "Draw" : appState.modoCanvas,
        appState.currentColor,
        x.toFixed(2),
        y.toFixed(2)
      );

      break;

    case "Text":
      handleTextStart(x, y);
      break;

    case "Point":
      drawPoint(x, y);
      break;

    case "MoveObject":
      handleMoveObjectStart(x, y);
      break;
  }
}

function handleMove(x, y) {
  const { modoCanvas, herramientaActual, isDrawing, ctx } = appState;

  switch (modoCanvas) {
    case "Draw":
    case "Redraw":
      if (isDrawing) {
        ctx.lineTo(x, y);
        ctx.stroke();

        appState.currentData.push(x.toFixed(2), y.toFixed(2));
      }
      break;

    case "Text":
      handleTextMove(x, y);
      break;

    case "MoveObject":
      handleMoveObjectMove(x, y);
      break;
  }
}

function handleEnd() {
  const { ctx } = appState;
  appState.isDrawing = false;
  appState.draggingText = null;
  appState.draggingObject = null;
  ctx.closePath();

  appState.data.push([...appState.currentData]);
  appState.currentData = [];
}

// ==================== MODO TEXT ====================
function handleTextStart(x, y) {
  const clickedText = findTextAt(x, y);

  if (clickedText) {
    appState.draggingText = clickedText;
    appState.dragOffset = {
      x: x - clickedText.x,
      y: y - clickedText.y,
    };
  } else {
    const text = prompt("Introduce el texto:");

    if (text !== null && text !== "") {
      // Sustituir comas automáticamente
      const cleanText = text.replace(/,/g, ";");
      addTextObject(cleanText, x, y);
    }
  }
}

function handleTextMove(x, y) {
  if (appState.draggingText) {
    appState.draggingText.x = x - appState.dragOffset.x;
    appState.draggingText.y = y - appState.dragOffset.y;
    redrawAll(false);
  }
}

function handleTextEdit(x, y) {
  const clickedText = findTextAt(x, y);
  if (clickedText) {
    const newText = prompt("Edita el texto:", clickedText.text);
    if (newText !== null && newText !== "") {
      // Sustituir comas automáticamente
      const cleanText = newText.replace(/,/g, ";");
      clickedText.text = cleanText;
      clickedText.width = appState.ctx.measureText(cleanText).width;
      clickedText.color = appState.currentColor;
      redrawAll(false);
    }
  }
}

function addTextObject(text, x, y) {
  appState.ctx.save();
  appState.ctx.font = CONFIG.canvas.textFont;
  const metrics = appState.ctx.measureText(text);
  const width = metrics.width;
  const height = parseInt(CONFIG.canvas.textFont, 10) || 18;
  appState.ctx.restore();

  const textObj = {
    id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    text,
    x: x, // Guardar la coordenada X exacta
    y: y, // Guardar la coordenada Y exacta
    width,
    height,
    color: appState.currentColor,
    // Añadir información de font para consistencia
    font: CONFIG.canvas.textFont,
  };

  appState.textObjects.push(textObj);
  redrawAll(false);

  // Guardar inmediatamente en datos
  const textData = [
    "Text",
    textObj.color,
    textObj.text,
    textObj.x.toFixed(2),
    textObj.y.toFixed(2),
    textObj.id,
    textObj.font, // ← AÑADIR FONT A LOS DATOS
  ];
  appState.data.push(textData);
}

function saveAllTextObjects() {
  // Eliminar todos los datos de Text previos de esta pregunta
  appState.data = appState.data.filter((data) => data[0] !== "Text");

  // Agregar el estado actual de todos los textos
  appState.textObjects.forEach((textObj) => {
    const textData = [
      "Text",
      textObj.color,
      textObj.text,
      textObj.x.toFixed(2),
      textObj.y.toFixed(2),
      textObj.id,
    ];
    appState.data.push(textData);
  });
}
function findTextAt(x, y) {
  return appState.textObjects.find(
    (obj) =>
      x >= obj.x &&
      x <= obj.x + obj.width + 10 &&
      y >= obj.y - obj.height + 10 &&
      y <= obj.y
  );
}

// ==================== MODO MOVEOBJECT ====================
function handleMoveObjectStart(x, y) {
  const { herramientaActual, ctx } = appState;

  switch (herramientaActual) {
    case "move":
      // Aquí podrías detectar objetos movibles
      const clickedObject = findMoveableObjectAt(x, y);
      if (clickedObject) {
        appState.draggingObject = clickedObject;
        appState.dragOffset = {
          x: x - clickedObject.x,
          y: y - clickedObject.y,
        };
      }
      break;

    case "draw":
      appState.isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
      break;

    case "erase":
      appState.isDrawing = true;
      eraseAt(x, y);
      break;
  }
}

function handleMoveObjectMove(x, y) {
  const { herramientaActual, isDrawing, ctx } = appState;

  switch (herramientaActual) {
    case "move":
      if (appState.draggingObject) {
        appState.draggingObject.x = x - appState.dragOffset.x;
        appState.draggingObject.y = y - appState.dragOffset.y;
        redrawAll(false);
      }
      break;

    case "draw":
      if (isDrawing) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      break;

    case "erase":
      if (isDrawing) {
        eraseAt(x, y);
      }
      break;
  }
}

function findMoveableObjectAt(x, y) {
  // Buscar en objetos de texto también
  const textObj = findTextAt(x, y);
  if (textObj) return textObj;

  // Buscar en otros objetos movibles
  return appState.moveableObjects.find(
    (obj) =>
      x >= obj.x - obj.width / 2 &&
      x <= obj.x + obj.width / 2 &&
      y >= obj.y - obj.height / 2 &&
      y <= obj.y + obj.height / 2
  );
}

function eraseAt(x, y) {
  const ctx = appState.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.canvas.eraseWidth / 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

// ==================== MODO POINT ====================
function drawPoint(x, y) {
  const ctx = appState.ctx;
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.canvas.pointRadius, 0, 2 * Math.PI);
  ctx.fillStyle = CONFIG.colors.point;
  ctx.fill();
  ctx.closePath();

  // Guardar el punto en el estado
  appState.pointObjects.push({
    x,
    y,
    radius: CONFIG.canvas.pointRadius,
    color: "point",
  });

  // Agregar a datos para guardar
  appState.currentData.push(
    "Point",
    "point", // Color específico para puntos
    x.toFixed(2),
    y.toFixed(2)
  );

  // Finalizar inmediatamente para guardar
  handleEnd();
}

function drawPointObject(pointObj) {
  const ctx = appState.ctx;
  ctx.beginPath();
  ctx.arc(pointObj.x, pointObj.y, pointObj.radius, 0, 2 * Math.PI);
  ctx.fillStyle = CONFIG.colors[pointObj.color] || CONFIG.colors.point;
  ctx.fill();
  ctx.closePath();
}

// ==================== DIBUJO ====================
function redrawAll(clearAllData) {
  clearCanvas();
  if (clearAllData) {
    clearData();
  }
  drawTextObjects();
  drawMoveableObjects();
  drawPointObjects();
}

function drawTextObjects() {
  const ctx = appState.ctx;
  ctx.save();
  ctx.font = CONFIG.canvas.textFont;

  appState.textObjects.forEach((obj) => {
    ctx.fillStyle = CONFIG.colors[obj.color] || CONFIG.colors.green;
    ctx.fillText(obj.text, obj.x, obj.y);
  });

  ctx.restore();
}

function drawMoveableObjects() {
  // Aquí se dibujarían otros objetos movibles si los hubiera
  // Por ahora, los textObjects también son movibles
}

function drawPointObjects() {
  appState.pointObjects.forEach((pointObj) => {
    drawPointObject(pointObj);
  });
}

function clearCanvas() {
  appState.ctx.clearRect(0, 0, appState.canvas.width, appState.canvas.height);
}

function clearData() {
  appState.textObjects = [];
  appState.moveableObjects = [];
  appState.pointObjects = [];
  appState.data = [];
  appState.currentData = [];
}

// ==================== PREGUNTAS ====================
async function cargarPreguntas() {
  try {
    const response = await fetch("json/preguntas.json");

    if (!response.ok) {
      throw new Error(`Error al cargar el JSON: ${response.status}`);
    }

    const dataP = await response.json();
    appState.preguntas = dataP.preguntas;

    console.log("Preguntas cargadas desde JSON:", appState.preguntas);
  } catch (error) {
    console.error("Error cargando preguntas:", error);
  }
}

function nextPregunta() {
  if (!appState.navegacionHabilitada) {
    console.log("Navegación bloqueada - no se puede cambiar de pregunta");
    return;
  }

  saveAllTextObjects();
  saveData();
  appState.preguntaIndex =
    (appState.preguntaIndex + 1) % appState.preguntas.length;
  actualizarPregunta();
  loadDataByQuestionByUser(
    appState.plantaActual.id,
    appState.preguntaIndex,
    appState.user
  );
}

function prevPregunta() {
  if (!appState.navegacionHabilitada) {
    console.log("Navegación bloqueada - no se puede cambiar de pregunta");
    return;
  }

  saveAllTextObjects();
  saveData();
  appState.preguntaIndex =
    (appState.preguntaIndex - 1 + appState.preguntas.length) %
    appState.preguntas.length;
  actualizarPregunta();
  loadDataByQuestionByUser(
    appState.plantaActual.id,
    appState.preguntaIndex,
    appState.user
  );
}

function actualizarPregunta() {
  const pregunta = appState.preguntas[appState.preguntaIndex];
  if (!pregunta) return;

  document.getElementById("pregunta").innerText = pregunta.texto;
  cambiarModo(pregunta.modoCanvas);
  redrawAll(true);
}

//Apagarlas si el admin lo indica
function actualizarEstadoNavegacion() {
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");

  if (appState.navegacionHabilitada) {
    prevButton.style.opacity = "1";
    nextButton.style.opacity = "1";
    prevButton.style.cursor = "pointer";
    nextButton.style.cursor = "pointer";
    prevButton.disabled = false;
    nextButton.disabled = false;
  } else {
    prevButton.style.opacity = "0.4";
    nextButton.style.opacity = "0.4";
    prevButton.style.cursor = "not-allowed";
    nextButton.style.cursor = "not-allowed";
    prevButton.disabled = true;
    nextButton.disabled = true;
  }
}

// ==================== EVENT LISTENERS ====================
function initEventListeners() {
  // Eventos de canvas
  appState.canvas.addEventListener("mousedown", handleMouseDown);
  appState.canvas.addEventListener("mousemove", handleMouseMove);
  appState.canvas.addEventListener("mouseup", handleMouseUp);
  appState.canvas.addEventListener("dblclick", handleDoubleClick);

  appState.canvas.addEventListener("touchstart", handleTouchStart);
  appState.canvas.addEventListener("touchmove", handleTouchMove);
  appState.canvas.addEventListener("touchend", handleTouchEnd);

  // Botones de control
  document.getElementById("clearButton").addEventListener("click", () => {
    redrawAll(true);
  });

  document.getElementById("nextButton").addEventListener("click", nextPregunta);
  document.getElementById("prevButton").addEventListener("click", prevPregunta);

  // Herramientas de MoveObject
  document.querySelectorAll(".tool-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      appState.herramientaActual = tool;
      updateToolSelection(tool);
      actualizarCursor();
    });
  });

  // Resize
  window.addEventListener("resize", resizeCanvas);
}

// Handlers de mouse
function handleMouseDown(e) {
  const coords = getCanvasCoordinates(e.clientX, e.clientY);
  handleStart(coords.x, coords.y);
}

function handleMouseMove(e) {
  if (e.buttons !== 1 && appState.modoCanvas !== "Text") return;
  const coords = getCanvasCoordinates(e.clientX, e.clientY);
  handleMove(coords.x, coords.y);
}

function handleMouseUp(e) {
  handleEnd();
}

function handleDoubleClick(e) {
  if (appState.modoCanvas === "Text") {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    handleTextEdit(coords.x, coords.y);
  }
}

// Handlers de touch
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const coords = getCanvasCoordinates(touch.clientX, touch.clientY);

  // Detectar doble tap
  checkDoubleTap(coords.x, coords.y);

  handleStart(coords.x, coords.y);
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
  handleMove(coords.x, coords.y);
}

function handleTouchEnd(e) {
  e.preventDefault();
  handleEnd();
}

function checkDoubleTap(x, y) {
  const now = Date.now();
  const timeDiff = now - appState.lastTap.time;
  const distX = Math.abs(x - appState.lastTap.x);
  const distY = Math.abs(y - appState.lastTap.y);

  if (
    timeDiff < CONFIG.doubleTap.threshold &&
    distX < CONFIG.doubleTap.distance &&
    distY < CONFIG.doubleTap.distance
  ) {
    if (appState.modoCanvas === "Text") {
      handleTextEdit(x, y);
    }
  }

  appState.lastTap = { time: now, x, y };
}

// ==================== SOCKET.IO ====================
if (typeof io !== "undefined") {
  const socket = io();

  //Solicitar estado de navegación
  socket.on("estado-navegacion-actual", (estado) => {
    console.log("Estado navegación recibido:", estado);
    appState.navegacionHabilitada = estado;
    actualizarEstadoNavegacion();
  });

  socket.on("navegacion-cambiada", (estado) => {
    console.log("Cambio de estado navegación:", estado);
    appState.navegacionHabilitada = estado;
    actualizarEstadoNavegacion();
  });

  socket.on("connect", () => {
    socket.emit("solicitar-estado-navegacion");
  });

  // Solicitar la planta actual cuando se conecta
  socket.on("connect", () => {
    console.log(
      "Conectado al servidor, solicitando planta y estado corregido actual..."
    );
    socket.emit("solicitar-planta-actual");
    socket.emit("solicitar-estado-corregido");
  });

  // Recibir la planta actual cuando el servidor responde
  socket.on("planta-actual", (plantaObj) => {
    console.log("Planta actual recibida:", plantaObj);
    actualizarInterfaz(plantaObj);
  });

  // Recibir cambios en tiempo real
  socket.on("imagen-cambiada", (plantaObj) => {
    console.log("Cambio de imagen recibido:", plantaObj);
    actualizarInterfaz(plantaObj);
  });

  // Recibir el estado de corregido actual
  socket.on("estado-corregido-actual", (corregidoStatus) => {
    console.log("Estado corregido actual recibido: ", corregidoStatus);
    appState.corregido = corregidoStatus;
  });

  socket.on("corregido-cambiado", (corregidoStatus) => {
    console.log("Cambio de estado de corregido:", corregidoStatus);
    appState.corregido = corregidoStatus;
  });

  function actualizarInterfaz(plantaObj) {
    appState.plantaActual = plantaObj;
    document.getElementById("nombre_planta").textContent = plantaObj.titulo;
    document.querySelector(
      ".planta_img"
    ).style.backgroundImage = `url(${plantaObj.imagen})`;
    clearCanvas();
  }
}

// ==================== FLASK ====================

function getOrCreateUserId() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    if (window.crypto && crypto.randomUUID) {
      userId = crypto.randomUUID();
    } else {
      // Fallback simple
      userId = "user_" + Math.random().toString(36).substr(2, 9);
    }
    localStorage.setItem("userId", userId);
  }
  return userId;
}

async function saveData() {
  //Si hay algo dibujado se intenta guardar
  try {
    // OBTENER INFORMACIÓN DE LA IMAGEN DE FONDO
    const plantaImg = document.querySelector(".planta_img");
    const imgStyle = window.getComputedStyle(plantaImg);

    // Calcular cómo se está mostrando la imagen en el cliente
    const backgroundSize = imgStyle.backgroundSize;
    const backgroundPosition = imgStyle.backgroundPosition;

    // Obtener dimensiones del contenedor de la imagen
    const containerRect = plantaImg.getBoundingClientRect();

    // La información que se envía al servidor
    const jsonData = {
      id: appState.user,
      planta: appState.plantaActual.id,
      pregunta: appState.preguntaIndex,
      corregido: appState.corregido,
      ancho: appState.canvas.width,
      alto: appState.canvas.height,
      contenedorAncho: containerRect.width,
      contenedorAlto: containerRect.height,
      backgroundSize: backgroundSize,
      backgroundPosition: backgroundPosition,
      datos: appState.data,
      modoCanvas: "prueba",
    };

    console.log("Guardando datos con información de imagen:", {
      canvas: { ancho: appState.canvas.width, alto: appState.canvas.height },
      contenedor: { ancho: containerRect.width, alto: containerRect.height },
      backgroundSize: backgroundSize,
      backgroundPosition: backgroundPosition,
    });

    const response = await fetch(`${CONFIG.IPhost}/guardar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
  }
}

async function loadDataByQuestionByUser(planta, pregunta, user) {
  try {
    // Primero obtenemos la lista de archivos
    const response = await fetch(`${CONFIG.IPhost}/listar/${planta}`);
    if (!response.ok) {
      console.log("Error al cargar la lista de datos");
      return;
    }

    const result = await response.json();

    // Verificamos si hay archivos
    if (result.datos.length === 0) {
      console.log("No hay datos disponibles");
      return;
    }

    // Definimos el archivo por pregunta por user

    //Si existe un corregido
    let Archivo = result.datos.find((nombre) =>
      nombre.startsWith(`${pregunta}_${user}_corregido`)
    );
    //Si no existe un corregido
    if (Archivo === undefined) {
      Archivo = result.datos.find((nombre) =>
        nombre.startsWith(`${pregunta}_${user}`)
      );
    }

    //Si no hay archivo
    if (Archivo === undefined) {
      console.log("No existe el archivo especificado");
      return;
    }

    // Cargamos el contenido del archivo
    const cargarResponse = await fetch(
      `${CONFIG.IPhost}/cargar/datos/${planta}/${Archivo}`
    );

    if (cargarResponse.ok) {
      const datos = await cargarResponse.json();

      if (datos.datos && datos.datos.length > 0) {
        // NO limpiar el canvas ni los datos - mantener lo existente
        // Solo limpiar el canvas visualmente, pero mantener los datos en memoria
        clearCanvas(); // Solo limpia visualmente
        // Redibujar los objetos de texto y movibles si los hay
        drawTextObjects();
        drawMoveableObjects();
        drawPointObjects();

        // Procesar cada conjunto de datos
        datos.datos.forEach((dataArray) => {
          if (dataArray.length > 0 && typeof dataArray[0] === "string") {
            const dataString = dataArray.join(",");
            const parsedData = parseDataString(dataString);
            drawFromData(parsedData);
          }
        });

        console.log("Datos redibujados correctamente");
      }
    } else {
      console.log("❌ Error al cargar el archivo");
    }
  } catch (error) {
    console.log("❌ Error de conexión");
  }
}

//Parsear datos para su redibujado
function parseDataString(dataString) {
  const drawingSegments = dataString.split("|");

  return {
    segments: drawingSegments.map((segment) => {
      const parts = segment.split(",");
      const type = parts[0];

      if (type === "Text") {
        // Para Text: ["Text", "color", "texto", x, y, id?]
        return {
          type: parts[0],
          color: parts[1],
          points: [
            parts[2],
            parseFloat(parts[3]),
            parseFloat(parts[4]),
            parts[5] || null, // ID opcional (para archivos viejos sin ID)
          ],
        };
      } else {
        // Para Draw y Point
        return {
          type: parts[0],
          color: parts[1],
          points: parts.slice(2).map((coord) => parseFloat(coord)),
        };
      }
    }),
  };
}

function drawFromData(parsedData) {
  const { segments } = parsedData;
  const ctx = appState.ctx;

  // Guardar estado actual del contexto
  ctx.save();

  segments.forEach((segment) => {
    switch (segment.type) {
      case "Draw":
        drawAndStoreSegment(segment);
        break;
      case "Point":
        drawAndStorePoint(segment);
        break;
      case "Text":
        drawAndStoreText(segment);
        break;
      // Aquí agregarás más tipos cuando los implementes
    }
  });

  // Restaurar estado del contexto
  ctx.restore();
}

function drawAndStoreSegment(segment) {
  const ctx = appState.ctx;
  const points = segment.points;

  if (points.length < 2) return;

  // Configurar estilo para dibujar
  const colorToUse = CONFIG.colors[segment.color] || "#000";

  ctx.strokeStyle = colorToUse;
  ctx.fillStyle = colorToUse;
  ctx.lineWidth = CONFIG.canvas.lineWidth;
  ctx.lineCap = "round";

  // Dibujar el segmento en el canvas
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);

  for (let i = 2; i < points.length; i += 2) {
    if (i + 1 < points.length) {
      ctx.lineTo(points[i], points[i + 1]);
    }
  }

  ctx.stroke();
  ctx.closePath();

  // Agregar los datos al estado para que se guarden
  const segmentData = [segment.type, segment.color];

  // Agregar todos los puntos al array de datos
  for (let i = 0; i < points.length; i += 2) {
    if (i + 1 < points.length) {
      segmentData.push(points[i].toFixed(2), points[i + 1].toFixed(2));
    }
  }

  appState.data.push(segmentData);
}

function drawAndStorePoint(segment) {
  const points = segment.points;

  if (points.length < 2) return;

  const x = points[0];
  const y = points[1];

  // Dibujar el punto en el canvas
  drawPointObject({
    x,
    y,
    radius: CONFIG.canvas.pointRadius,
    color: segment.color,
  });

  // Agregar el punto a los objetos
  appState.pointObjects.push({
    x,
    y,
    radius: CONFIG.canvas.pointRadius,
    color: segment.color,
  });

  // Agregar los datos al estado para que se guarden
  const pointData = [segment.type, segment.color, x.toFixed(2), y.toFixed(2)];
  appState.data.push(pointData);
}

function drawAndStoreText(segment) {
  if (segment.points.length < 3) return;

  const text = segment.points[0];
  const x = parseFloat(segment.points[1]);
  const y = parseFloat(segment.points[2]);
  const color = segment.color;
  const id = segment.points[3] || Date.now() + "_loaded"; // ID del archivo o generar uno

  // Verificar si ya existe un texto con este ID (evitar duplicados al recargar)
  const existingText = appState.textObjects.find((t) => t.id === id);
  if (existingText) {
    return; // Ya está cargado
  }

  const textObj = {
    id: id,
    text: text,
    x: x,
    y: y,
    width: appState.ctx.measureText(text).width,
    height: parseInt(CONFIG.canvas.textFont, 10) || 18,
    color: color,
  };

  appState.textObjects.push(textObj);
  drawTextObject(textObj);
}
function drawTextObject(textObj) {
  const ctx = appState.ctx;
  ctx.save();
  ctx.font = CONFIG.canvas.textFont;
  ctx.fillStyle = CONFIG.colors[textObj.color] || CONFIG.colors.green;
  ctx.fillText(textObj.text, textObj.x, textObj.y);
  ctx.restore();
}

// ==================== INICIO ====================
document.addEventListener("DOMContentLoaded", initApp);
