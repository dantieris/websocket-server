import { EventStream } from '../event-stream.mjs';

// Armazenar a última posição conhecida
let lastKnownPosition = { x: 0, y: 0 };

export const requestHandler = (clients) => (req, res) => {
    console.log('\n=== Nova requisição ===');
    console.log('Método:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
  
    const url = new URL(req.url, `http://${req.headers.host}`);
  
    // Headers CORS padrão para todas as respostas
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400' // 24 horas
    };
  
    // Tratamento de CORS para preflight
    if (req.method === 'OPTIONS') {
      console.log('Requisição OPTIONS recebida - respondendo com headers CORS');
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }
  
    // Rota para estabelecer conexão para ouvir os eventos
    if (url.pathname === '/listening') {
      console.log('Nova conexão de eventos solicitada');
      const eventStream = new EventStream(res);
      clients.add(eventStream);
      
      // Enviar última posição conhecida
      eventStream.send({
        type: 'position',
        position: lastKnownPosition
      });
  
      req.on('close', () => {
        clients.delete(eventStream);
      });
    }
    
    // Rota para atualizar posição
    else if (url.pathname === '/update' && req.method === 'POST') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
  
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          lastKnownPosition = data.position;
          
          clients.forEach(client => {
            client.send({
              type: 'position',
              position: data.position,
              timestamp: Date.now()
            });
          });
  
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders  });
          res.end(JSON.stringify({ 
            success: true, 
            clientCount: clients.size 
          }));
          console.log('Resposta de sucesso enviada');
        } catch (error) {
          console.error('Erro ao processar requisição:', error);
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
    }
    
    else {
      console.log('Rota não encontrada:', url.pathname);
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders  });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
}