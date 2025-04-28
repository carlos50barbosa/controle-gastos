// src/api.js
export const API = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001/api';
