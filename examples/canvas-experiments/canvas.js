const canvas = document.getElementById("myCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");





// Set stroke style
ctx.strokeStyle = "#00FF00";
ctx.lineWidth = 5;
const redStrokeButton = document.getElementById("redStroke");
const greenStrokeButton = document.getElementById("greenStroke");
redStrokeButton.addEventListener("click", function () {
  ctx.strokeStyle = "red";
});
greenStrokeButton.addEventListener("click", function () {
  ctx.strokeStyle = "#00FF00";
});

const textType = "18px sans-serif";



// Change mode
const modeButton = document.getElementById("modeButton");
modeButton.addEventListener("click", function () {
  if (modeButton.textContent === "Mode: Draw") {
    modeButton.textContent = "Mode: Text";
    textMode = true;
    canvas.style.cursor = "text";
  } else {
    modeButton.textContent = "Mode: Draw";
    textMode = false;
    canvas.style.cursor = "default";
  }
});

// Handle mouse DOWN - iniciar path
canvas.addEventListener("mousedown", function (event) {
  if (textMode) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  ctx.beginPath();
  ctx.moveTo(x, y);
});

// Handle mouse MOVE - dibujar
canvas.addEventListener("mousemove", function (event) {
  if (event.buttons !== 1) return; // Only draw when mouse is pressed
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (!textMode){
    ctx.lineTo(x, y);
    ctx.stroke();
  }
});

// Cerrar el path cuando se suelta el ratón
canvas.addEventListener("mouseup", function () {
  if (!textMode) {
    ctx.closePath();
  }
});

// Cerrar el path cuando el ratón sale del canvas
canvas.addEventListener("mouseleave", function () {
  if (!textMode) {
    ctx.closePath();
  }
});

// Handle CLICK solo para texto
canvas.addEventListener("click", function (event) {
  if (!textMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const text = prompt("Introduce el texto:");
  if (text !== null && text !== "") {
    ctx.save();
    ctx.font = textType;
    ctx.fillStyle = ctx.strokeStyle || "#000";
    ctx.fillText(text, x, y);
    ctx.restore();
  }
});

//handle mobile touch
canvas.addEventListener("touchstart", function (event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
   if (textMode) {
    const text = prompt("Introduce el texto:");
    if (text !== null && text !== "") {
      ctx.save();
      ctx.font = textType;
      ctx.fillStyle = ctx.strokeStyle || "#000";
      ctx.fillText(text, x, y);
      ctx.restore();
    }
    return;
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
});

canvas.addEventListener("touchmove", function (event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (!textMode){
    ctx.lineTo(x, y);
    ctx.stroke();
  }
});

// Cerrar el path cuando se levanta el dedo
canvas.addEventListener("touchend", function (event) {
  event.preventDefault();
  if (!textMode) {
    ctx.closePath();
  }
});

// Clear canvas button
const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click", function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});