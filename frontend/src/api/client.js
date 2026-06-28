const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  let data = {};

  try {
    data = await res.json();
  } catch {
    console.warn("⚠️ Non-JSON response");
  }

  /* ======================================================
     🔥 AUTO LOGOUT ON 401 (CRITICAL FIX)
  ====================================================== */

  if (res.status === 401) {
    console.warn("⛔ Session expired — logging out");

    localStorage.removeItem("token");

    alert("Session expired. Please log in again.");

    window.location.href = "/"; // or "/login" if you have one
    return;
  }

  /* ======================================================
     ERROR HANDLING
  ====================================================== */

  if (!res.ok) {
    console.error("❌ API ERROR:", data);
    throw new Error(data?.error || "Request failed");
  }

  return data;
}
