import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey || typeof apiKey !== "string") {
  throw new Error(
    "VITE_API_KEY is not set. Copy frontend/.env.example to frontend/.env and set the same value as backend API_KEY.",
  );
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

export const API_BASE_URL = getApiBaseUrl();
