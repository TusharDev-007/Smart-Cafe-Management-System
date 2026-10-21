const env = require("./config/env"); // must be first: loads and validates .env
const http = require("http");
const app = require("./app");
const { initSocket } = require("./sockets");

const server = http.createServer(app);
initSocket(server, env.CLIENT_URL);

server.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});