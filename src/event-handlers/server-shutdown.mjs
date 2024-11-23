export const serverShutdownHandler = (clients, server) => () => {
    console.log('\n=== Iniciando shutdown do servidor ===');
    console.log('Fechando conexões ativas:', clients.size);
    clients.forEach(client => client.close());
    server.close(() => {
      console.log('Servidor fechado com sucesso');
      process.exit(0);
    });
  }