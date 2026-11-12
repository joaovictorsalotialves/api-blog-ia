import http from 'node:http';

const { API_PORT, API_HOST, API_PROTOCOL } = process.env;

const posts = []

const server = http.createServer((request, response) => {
	const { method, url } = request;
	const paths = url.split('?').filter(Boolean);
	const path = paths.at(0) || '/';

	if (path === '/posts' && method === 'GET') {
		response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
		return response.end(JSON.stringify({ data: posts }));
	}

	response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify({ message: 'Not Found' }));
});

server.listen(API_PORT, () => {
	console.log(`Server running on ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
	console.log('Press CTRL+C to stop the server');
});
