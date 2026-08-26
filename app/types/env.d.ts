/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Supabase project REST URL — mismo valor que SUPABASE_URL en el Worker. */
	readonly VITE_SUPABASE_URL: string;
	/** Browser-safe API key (nueva nomenclatura Supabase, reemplaza "anon"). */
	readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
