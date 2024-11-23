import crypto from 'crypto';

export class EventStream {
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