import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin','index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  
  socket.on('cambiar-imagen', (nombreImagen) => {
    console.log('Cambiando imagen a:', nombreImagen);
    io.emit('imagen-cambiada', nombreImagen);
  });

  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado');
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});