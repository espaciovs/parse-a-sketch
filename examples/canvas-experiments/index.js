import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

let plantaActual;
let corregidoStatusActual = false;
let navegacionHabilitada = false;

// Estado del proyector
let proyectorState = {
  mostrarRespuestas: false,
  opacidad: 0.5,
  filtroCorregido: 'todos', // 'todos', 'sinCorregir', 'corregido'
  preguntaSeleccionada: null // null = todas, número = pregunta específica
};

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin','index.html'));
});

app.get('/projector', (req, res) => {
  res.sendFile(join(__dirname, 'projector','index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('Une usuarie se ha conectado');

   socket.on('solicitar-estado-navegacion', () => {
    console.log('Cliente solicita estado navegación:', navegacionHabilitada);
    socket.emit('estado-navegacion-actual', navegacionHabilitada);
  });

  socket.on('cambiar-estado-navegacion', (estado) => {
    console.log('Cambiando estado navegación a:', estado);
    navegacionHabilitada = estado;
    io.emit('navegacion-cambiada', estado);
  });
  
  // Solicitar planta actual
  socket.on('solicitar-planta-actual', () => {
    console.log('Cliente solicita planta actual:', plantaActual);
    if (plantaActual) {
      socket.emit('planta-actual', plantaActual);
    }
  });

  socket.on('cambiar-imagen', (nombreImagen) => {
    console.log('Cambiando imagen a:', nombreImagen);
    plantaActual = nombreImagen;
    io.emit('imagen-cambiada', nombreImagen);
  });

  // Solicitar estado de corregido actual
  socket.on('solicitar-estado-corregido', () => {
    console.log('Cliente solicita estado corregido:', corregidoStatusActual);
    if (corregidoStatusActual != undefined) {
      socket.emit('estado-corregido-actual', corregidoStatusActual);
    }
  });

  socket.on('cambiar-corregido', (corregidoStatus) => {
    console.log('Cambiando corregido a:', corregidoStatus);
    corregidoStatusActual = corregidoStatus;
    socket.broadcast.emit('corregido-cambiado', corregidoStatus);
  });

  // === EVENTOS ESPECÍFICOS PARA PROYECTOR ===
  
  // Solicitar estado del proyector
  socket.on('solicitar-estado-proyector', () => {
    console.log('Proyector solicita estado:', proyectorState);
    socket.emit('estado-proyector-actual', proyectorState);
  });

  // Cambiar visualización de respuestas
  socket.on('cambiar-mostrar-respuestas', (mostrar) => {
    console.log('Cambiando mostrar respuestas a:', mostrar);
    proyectorState.mostrarRespuestas = mostrar;
    io.emit('proyector-mostrar-respuestas-cambiado', mostrar);
  });

  // Cambiar opacidad
  socket.on('cambiar-opacidad-proyector', (opacidad) => {
    console.log('Cambiando opacidad a:', opacidad);
    proyectorState.opacidad = opacidad;
    io.emit('proyector-opacidad-cambiada', opacidad);
  });

  // Cambiar filtro de corregido
  socket.on('cambiar-filtro-corregido', (filtro) => {
    console.log('Cambiando filtro corregido a:', filtro);
    proyectorState.filtroCorregido = filtro;
    io.emit('proyector-filtro-corregido-cambiado', filtro);
  });

  // Cambiar pregunta seleccionada
  socket.on('cambiar-pregunta-proyector', (pregunta) => {
  console.log('Cambiando pregunta proyector a:', pregunta);
  proyectorState.preguntaSeleccionada = pregunta;
  io.emit('proyector-pregunta-cambiado', pregunta);
});

  socket.on('disconnect', () => {
    console.log('Une usuarie se ha desconectado');
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});