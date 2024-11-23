import http from 'http';
import { errorHandler } from './event-handlers/error-handler.mjs';
import { requestHandler } from './event-handlers/request-handler.mjs';
import { serverShutdownHandler } from './event-handlers/server-shutdown.mjs';

const server = http.createServer();
const PORT = 6060;

// Armazenar as conexões ativas
const clients = new Set();

server.on('request', requestHandler(clients));

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Servidor iniciado ===`);
  console.log(`Escutando em http://0.0.0.0:${PORT}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`- GET /listening : Escuta todos eventos de mudança que ocorrerem durante a conexão multipart`);
  console.log(`- POST /update : Atualiza posição`);
});

// Tratamento de erros do servidor
server.on('error', errorHandler);

// Graceful shutdown
process.on('SIGTERM', serverShutdownHandler(clients, server));
