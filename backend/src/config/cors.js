const DEFAULT_ALLOWED_ORIGINS = [
  "https://runforme-frontend.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.4.38:5173",
];

function getAllowedOrigins() {
  const configuredOrigins = String(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...configuredOrigins,
  ]);
}

function corsOrigin(origin, callback) {
  const allowedOrigins = getAllowedOrigins();

  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin}`));
}

module.exports = {
  corsOrigin,
  getAllowedOrigins,
};