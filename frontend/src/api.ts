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

const GEMINI_MODEL_STORAGE_KEY = "gemini-model";
const GEMINI_MODEL_HEADER = "X-Gemini-Model";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

// Interceptor to add Gemini model header from localStorage
api.interceptors.request.use((config) => {
  const model = window.localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
  if (model) {
    config.headers[GEMINI_MODEL_HEADER] = model;
  }
  return config;
});

export const getGeminiModel = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || "";
};

export const setGeminiModel = (model: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  }
};

export interface GeminiModelConfig {
  options: string[];
  defaultModel: string;
}

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export const toPublicUrl = (path: string) => {
  if (!path) return "";
  return new URL(path, API_BASE_URL).toString();
};
