import http from 'node:http';

const server = http.createServer((request, response) => {
	response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify({ message: 'Hello World' }));
});

server.listen(9090, () => {
	console.log('Servidor rodando em http://localhost:9090');
});
