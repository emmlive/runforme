import { apiRequest } from "./client";

export async function login(payload) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // 🔥 STORE TOKEN (CRITICAL FIX)
  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  // OPTIONAL (useful later)
  if (data.role) {
    localStorage.setItem("role", data.role);
  }

  return data;
}

export function register(payload) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}