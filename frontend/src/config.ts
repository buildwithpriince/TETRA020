/**
 * Central config for environment-gated behavior.
 * When VITE_API_BASE_URL is set, the app talks to the live FastAPI backend.
 * When unset, it runs entirely on mock data.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const IS_MOCK = !API_BASE_URL;

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const FIREBASE_ENABLED = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.appId,
);
