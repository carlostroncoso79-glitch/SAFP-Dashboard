// Configuración del cliente Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS TUYOS
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-public';

// Crear cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
