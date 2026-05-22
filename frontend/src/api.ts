import axios from 'axios';

const GEMINI_MODEL_STORAGE_KEY = 'gemini-model';
const GEMINI_MODEL_HEADER = 'X-Gemini-Model';

type StoredGeminiHeaders = Record<string, string>;

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

const applyGeminiModelHeader = (model: string) => {
  const headers = axios.defaults.headers.common as StoredGeminiHeaders;
  if (model) {
    headers[GEMINI_MODEL_HEADER] = model;
  } else {
    delete headers[GEMINI_MODEL_HEADER];
  }
};

const getStoredGeminiModel = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || '';
};

const storedGeminiModel = getStoredGeminiModel();
if (storedGeminiModel) {
  applyGeminiModelHeader(storedGeminiModel);
}

export interface GeminiModelConfig {
  options: string[];
  defaultModel: string;
}

export const getGeminiModel = () => getStoredGeminiModel();

export const setGeminiModel = (model: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  }
  applyGeminiModelHeader(model);
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export const toPublicUrl = (path: string) => {
  if (!path) return '';
  return new URL(path, API_BASE_URL).toString();
};
