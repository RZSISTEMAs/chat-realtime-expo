// Configuração de API via IP Local (Mesmo Wi-fi)
export const API_URL = 'http://172.20.10.6:3000';
export const API_BASE = `${API_URL}/api`;

// Gemini AI — Ayla IA
// ⚠️  A chave real fica em keys.local.ts (gitignored) — veja keys.example.ts
import { GEMINI_API_KEY } from './keys.local';
export { GEMINI_API_KEY };
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
