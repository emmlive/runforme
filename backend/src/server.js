require("dotenv").config();

// ============================
// ENVIRONMENT VALIDATION
// ============================
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
];

if (process.env.NODE_ENV === "production") {
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      console.error(`❌ Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }
}

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const PORT = Number(process.env.PORT) || 5050;

// ============================
// CREATE HTTP SERVER
// ============================
const server = http.createServer(app);

// ============================
// SOCKET.IO CONFIG
// ============================
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log(`📡 Socket connected: ${socket.id}`);

  socket.on("join.runner", (runnerId) => {
    if (!runnerId) return;
    socket.join(`runner:${runnerId}`);
    console.log(`🏃 Runner joined room runner:${runnerId}`);
  });

  socket.on("join.requester", (requesterId) => {
    if (!requesterId) return;
    socket.join(`requester:${requesterId}`);
    console.log(`🙋 Requester joined room requester:${requesterId}`);
  });

  socket.on("join.run", (runId) => {
    if (!runId) return;
    socket.join(`run:${runId}`);
    console.log(`🗺️ Socket joined run room run:${runId}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Make io available inside routes
app.set("io", io);

// ============================
// START SERVER
// ============================
server.listen(PORT, () => {
  console.log("===================================");
  console.log(`🚀 SERVER LIVE [${process.env.NODE_ENV || "development"}]`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log("===================================");
});
