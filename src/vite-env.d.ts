/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID (Desktop app, PKCE). Público, no es secreto. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Client secret del client Desktop app. Google lo exige en el token exchange. */
  readonly VITE_GOOGLE_CLIENT_SECRET?: string;
  /** Client ID del OAuth client "Web application" (para la versión web con GIS). */
  readonly VITE_GOOGLE_CLIENT_ID_WEB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
