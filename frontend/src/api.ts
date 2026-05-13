const getApiBaseUrl = () => {
  // If we are in development and want to point to a specific backend
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default to the same host but port 3001
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

export const API_BASE_URL = getApiBaseUrl();
