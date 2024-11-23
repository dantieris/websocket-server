import { EventStream } from '../event-stream.mjs';

// Armazenar a última posição conhecida
let lastKnownPosition = { x: 0, y: 0 };

export const requestHandler = (clients) => (req, res) => {
    console.log('\n=== Nova requisição ===');
    console.log('Método:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
  
    const url = new URL(req.url, `http://${req.headers.host}`);
  
    // Tratamento de CORS para preflight
    if (req.method === 'OPTIONS') {
      console.log('Requisição OPTIONS recebida - respondendo com headers CORS');
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
  
    // Rota para estabelecer conexão para ouvir os eventos
    if (url.pathname === '/listening') {
      console.log('Nova conexão de eventos solicitada');
      console.log('Última posição conhecida:', lastKnownPosition);
  
      const eventStream = new EventStream(res);
      clients.add(eventStream);
      console.log('Total de clientes conectados:', clients.size);
  
      // Enviar última posição conhecida
      eventStream.send({
        type: 'position',
        position: lastKnownPosition
      });
  
      // Remover cliente quando a conexão for fechada
      req.on('close', () => {
        console.log(`[${eventStream.id}] Conexão fechada pelo cliente`);
        clients.delete(eventStream);
        console.log('Total de clientes restantes:', clients.size);
      });
  
      req.on('error', (error) => {
        console.error(`[${eventStream.id}] Erro na conexão:`, error);
      });
    }
    
    // Rota para atualizar posição
    else if (url.pathname === '/update' && req.method === 'POST') {
      console.log('Recebida requisição de atualização');
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
        console.log('Chunk de dados recebido:', chunk.toString());
      });
  
      req.on('end', () => {
        try {
          console.log('Corpo completo da requisição:', body);
          const data = JSON.parse(body);
          console.log('Dados parseados:', data);
          
          // Atualizar última posição conhecida
          lastKnownPosition = data.position;
          console.log('Última posição atualizada para:', lastKnownPosition);
          
          // Broadcast para todos os clientes conectados
          console.log('Iniciando broadcast para', clients.size, 'clientes');
          clients.forEach(client => {
            client.send({
              type: 'position',
              position: data.position,
              timestamp: Date.now()
            });
          });
  
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            clientCount: clients.size 
          }));
          console.log('Resposta de sucesso enviada');
        } catch (error) {
          console.error('Erro ao processar requisição:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
    }
    
    else {
      console.log('Rota não encontrada:', url.pathname);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }