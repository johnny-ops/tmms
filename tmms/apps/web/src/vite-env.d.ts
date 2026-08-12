/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AI_SERVICE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Node.js types for browser environment
declare namespace NodeJS {
  interface Timeout extends Timer {}
  interface Timer {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
    refresh(): this;
    [Symbol.dispose](): void;
  }
}
