import { supabase, getProfile } from './supabase.js';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('logoutBtn');

// ─── LOGIN ───
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Redirigir al dashboard
            window.location.href = '/SAFP-Dashboard/pages/dashboard.html';
        } catch (error) {
            alert('❌ Error al iniciar sesión: ' + error.message);
        }
    });
}

// ─── REGISTRO ───
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('❌ Las contraseñas no coinciden');
            return;
        }
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });
            
            if (error) throw error;
            
            alert('✅ Registro exitoso! Revisa tu correo para confirmar.');
            window.location.href = '/pages/login.html';
        } catch (error) {
            alert('❌ Error al registrarse: ' + error.message);
        }
    });
}

// ─── LOGOUT ───
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = '/pages/login.html';
        } catch (error) {
            alert('❌ Error al cerrar sesión: ' + error.message);
        }
    });
}

// ─── VERIFICAR SESIÓN ───
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/pages/login.html';
        return null;
    }
    return session;
}

// ─── OBTENER PERFIL Y REDIRIGIR ───
export async function loadUserProfile() {
    try {
        const profile = await getProfile();
        if (!profile) {
            alert('❌ Perfil no encontrado');
            window.location.href = '/pages/login.html';
            return null;
        }
        return profile;
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        return null;
    }
}
