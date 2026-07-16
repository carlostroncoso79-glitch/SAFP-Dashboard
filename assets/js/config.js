// assets/js/config.js
// Configuración cargada desde variables de entorno de Vercel

// Leer variables de entorno de Vercel (disponibles en tiempo de build)
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY || '';

// Verificar que las credenciales existan
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Credenciales de Supabase no configuradas en Vercel');
    console.error('   Asegúrate de agregar las variables de entorno en Vercel:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - VITE_SUPABASE_ANON_KEY');
}

export const CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    IS_PROD: import.meta.env?.PROD || false,
    IS_DEV: import.meta.env?.DEV || false
};

console.log(`🔐 Configuración cargada - Modo: ${CONFIG.IS_PROD ? 'Producción' : 'Desarrollo'}`);
