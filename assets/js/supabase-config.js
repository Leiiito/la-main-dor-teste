/**
 * Supabase config
 * Remplir SUPABASE_URL et SUPABASE_ANON_KEY (voir README)
 */
export const SUPABASE_URL = "https://oyewvpbqtzdcqbypomsu.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXd2cGJxdHpkY3FieXBvbXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDMxMTAsImV4cCI6MjA4NDUxOTExMH0.WPDn3G7OKPXUI8Y15goe_c0FFovE7VID7VvT_6-hNAI";

/**
 * Lien Calendly générique (Hero / CTA navbar) — à personnaliser.
 * L’admin peut mettre un calendly_url par prestation, sinon ce fallback est utilisé.
 */
export const GENERIC_CALENDLY_URL = "https://calendly.com/votre-compte/rdv";


// Edge Function (admin sécurisé)
export const EDGE_FUNCTION_NAME = "admin-api";

// Storage bucket pour les images
export const IMAGES_BUCKET = "public-images";
