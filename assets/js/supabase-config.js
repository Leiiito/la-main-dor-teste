/**
 * Supabase config
 * Remplir SUPABASE_URL et SUPABASE_ANON_KEY (voir README)
 */
export const SUPABASE_URL = "SUPABASE_URL";
export const SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY";

/**
 * Lien Calendly générique (Hero / CTA navbar) — à personnaliser.
 * L’admin peut mettre un calendly_url par prestation, sinon ce fallback est utilisé.
 */
export const GENERIC_CALENDLY_URL = "https://calendly.com/votre-compte/rdv";


// Edge Function (admin sécurisé)
export const EDGE_FUNCTION_NAME = "admin-api";

// Storage bucket pour les images
export const IMAGES_BUCKET = "public-images";
