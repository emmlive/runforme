import axios from "axios";

export function installAuthSession401Handler({
  axiosInstance = axios,
  storage = window.localStorage,
  onSessionExpired,
} = {}) {
  if (!axiosInstance?.interceptors?.response) {
    throw new Error("Axios response interceptors are required");
  }

  if (!storage || typeof storage.getItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Session storage adapter is required");
  }

  if (typeof onSessionExpired !== "function") {
    throw new Error("onSessionExpired callback is required");
  }

  const interceptorId = axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const hasStoredToken = Boolean(storage.getItem("token"));
      const isUnauthorized = error?.response?.status === 401;

      if (isUnauthorized && hasStoredToken) {
        storage.removeItem("token");
        onSessionExpired();
      }

      return Promise.reject(error);
    }
  );

  return () => {
    axiosInstance.interceptors.response.eject(interceptorId);
  };
}