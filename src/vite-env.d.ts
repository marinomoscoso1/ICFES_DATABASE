/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Groq key baked in at build time, so the deployed site works without pasting one. */
  readonly VITE_GROQ_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
