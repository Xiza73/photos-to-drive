/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID (Desktop app, PKCE). Público, no es secreto. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Client secret del client Desktop app. Google lo exige en el token exchange. */
  readonly VITE_GOOGLE_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
