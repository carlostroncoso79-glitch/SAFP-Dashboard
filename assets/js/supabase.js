// assets/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

// Verificar que las credenciales existan
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    throw new Error(`
        ❌ Credenciales de Supabase no configuradas.
        
        En desarrollo local: crea un archivo .env
        En Vercel: agrega las variables de entorno:
        - VITE_SUPABASE_URL
        - VITE_SUPABASE_ANON_KEY
    `);
}

// Crear cliente Supabase
export const supabase = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
);

// Helper: Verificar conexión
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Conexión a Supabase exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión a Supabase:', error.message);
        return false;
    }
}

// Helper: Obtener usuario actual
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

// Helper: Obtener perfil del usuario
export async function getProfile() {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) throw error;
    return data;
}

// Helper: Obtener familiares
export async function getFamilyMembers(familyId) {
    const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

// Helper: Obtener configuración del sistema
export async function getSystemConfig(familyId) {
    const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('family_id', familyId)
        .single();
    
    if (error) throw error;
    return data;
}

// Helper: Obtener menús generados
export async function getMenus(familyId) {
    const { data, error } = await supabase
        .from('weekly_menus')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}
