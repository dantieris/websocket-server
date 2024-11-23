import http from 'http';
import crypto from 'crypto';

const server = http.createServer();
const PORT = 6060;

// Armazenar as conexões ativas
const clients = new Set();

class EventStream {
  constructor(response) {
    this.id = crypto.randomBytes(16).toString('hex');
    this.response = response;
    // Gera um boundary seguro usando crypto
    this.boundary = `--boundary-${crypto.randomBytes(16).toString('hex')}`;
    
    console.log(`[${this.id}] Nova conexão EventStream criada`);
    console.log(`[${this.id}] Usando boundary: ${this.boundary}`);
    
    // Configurar headers para multipart
    response.writeHead(200, {
      'Content-Type': `multipart/x-mixed-replace; boundary=${this.boundary}`,
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    console.log(`[${this.id}] Headers configurados:`, {
      'Content-Type': `multipart/x-mixed-replace; boundary=${this.boundary}`,
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    // Enviar boundary inicial
    this.response.write(`${this.boundary}\n`);
    console.log(`[${this.id}] Boundary inicial enviado`);
  }

  send(data) {
    try {
      console.log(`[${this.id}] Enviando dados:`, data);
      
      this.response.write('Content-Type: application/json\n\n');
      this.response.write(JSON.stringify(data));
      this.response.write(`\n--${this.boundary}\n`);

      console.log(`[${this.id}] Dados enviados com sucesso`);
    } catch (error) {
      console.error(`[${this.id}] Erro ao enviar dados:`, error);
    }
  }

  close() {
    try {
      console.log(`[${this.id}] Fechando conexão`);
      this.response.write(`--${this.boundary}--\n`);
      this.response.end();
      console.log(`[${this.id}] Conexão fechada com sucesso`);
    } catch (error) {
      console.error(`[${this.id}] Erro ao fechar conexão:`, error);
    }
  }
}

server.on('request', (req, res) => {
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

  // Rota para estabelecer conexão de eventos
  if (url.pathname === '/events') {
    console.log('Nova conexão de eventos solicitada');
    
    const eventStream = new EventStream(res);
    clients.add(eventStream);
    console.log('Total de clientes conectados:', clients.size);

    // Enviar posição inicial
    eventStream.send({
      type: 'position',
      position: { x: 0, y: 0 }
    });

    // Remover cliente quando a conexão for fechada
    req.on('close', () => {
      console.log(`[${eventStream.id}] Conexão fechada pelo cliente`);
      clients.delete(eventStream);
      console.log('Total de clientes restantes:', clients.size);
    });

    // Log de erro na conexão
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
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Servidor iniciado ===`);
  console.log(`Escutando em http://0.0.0.0:${PORT}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`- GET /events : Estabelece conexão multipart`);
  console.log(`- POST /update : Atualiza posição`);
});

// Tratamento de erros do servidor
server.on('error', (error) => {
  console.error('Erro no servidor:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n=== Iniciando shutdown do servidor ===');
  console.log('Fechando conexões ativas:', clients.size);
  clients.forEach(client => client.close());
  server.close(() => {
    console.log('Servidor fechado com sucesso');
    process.exit(0);
  });
});