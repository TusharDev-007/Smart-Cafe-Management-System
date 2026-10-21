const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const TOKEN_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

let io;

function initSocket(httpServer, clientUrl) {
  io = new Server(httpServer, { cors: { origin: clientUrl } });

  // Customers connect without a token; staff connect with one.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    socket.data.user = null;
    if (token) {
      try {
        socket.data.user = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
      } catch {
        // invalid or expired token: treated as an anonymous customer
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    // Only logged-in staff may receive the kitchen feed
    socket.on("join:kitchen", (ack) => {
      const role = socket.data.user?.role;
      if (role === "KITCHEN" || role === "ADMIN") {
        socket.join("kitchen");
        if (typeof ack === "function") ack({ ok: true });
      } else if (typeof ack === "function") {
        ack({ ok: false, error: "Unauthorized" });
      }
    });

    // A customer's phone joins the private room of its own order, by token
    socket.on("join:order", (token) => {
      if (typeof token === "string" && TOKEN_PATTERN.test(token)) {
        socket.join(`order:${token}`);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO is not initialised");
  return io;
}

module.exports = { initSocket, getIO };