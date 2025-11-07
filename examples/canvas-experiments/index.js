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

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin','index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('Une usuarie se ha conectado');

  // Escuchar solicitud de planta actual
  socket.on('solicitar-planta-actual', () => {
    console.log('Cliente solicita planta actual:', plantaActual);
    if (plantaActual) {
      socket.emit('planta-actual', plantaActual);
    }
  });

  socket.on('cambiar-imagen', (nombreImagen) => {
    console.log('Cambiando imagen a:', nombreImagen);
    
    // Actualizar la planta actual
    plantaActual = nombreImagen;
    
    // Enviar 
    socket.broadcast.emit('imagen-cambiada', nombreImagen);
  });

//Escuchar solicitud de estado de corregido actual
socket.on('solicitar-estado-corregido',() =>{

  console.log('Cliente solicita estado corregido:', corregidoStatusActual);
  if (corregidoStatusActual != undefined) {
    socket.emit('estado-corregido-actual', corregidoStatusActual);
  }
});


  socket.on('cambiar-corregido', (corregidoStatus) => {
    console.log('Cambiando corregido a:', corregidoStatus);

    //Actualizar el estado actual de corregido
    corregidoStatusActual = corregidoStatus;

    // Enviar 
    socket.broadcast.emit('corregido-cambiado', corregidoStatus);
  });

  socket.on('disconnect', () => {
    console.log('Une usuarie se ha desconectado');
  });
});

 

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});