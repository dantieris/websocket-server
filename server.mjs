import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });
const PORT = 6060;

// Armazenar a posição atual do círculo
let currentPosition = { x: 0, y: 0 };

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado');
    
    // Enviar posição atual para o novo cliente
    ws.send(JSON.stringify({
        type: 'initial',
        position: currentPosition
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            console.log('Mensagem recebida:', data);

            // Atualizar posição atual
            currentPosition = data;
            
            console.log('Clientes:', wss.clients);
            // Broadcast da nova posição para todos os outros clientes
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === ws.OPEN) {
                    client.send(JSON.stringify({
                        type: 'update',
                        position: currentPosition
                    }));
                }
            });
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor WebSocket rodando em ws://0.0.0.0:${PORT}`);
});