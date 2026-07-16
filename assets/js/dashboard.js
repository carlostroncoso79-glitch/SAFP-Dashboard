import { supabase, getProfile, getFamilyMembers } from './supabase.js';
import { checkAuth, loadUserProfile } from './auth.js';

// ─── INICIALIZAR DASHBOARD ───
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    const session = await checkAuth();
    if (!session) return;
    
    // Cargar perfil del usuario
    const profile = await loadUserProfile();
    if (!profile) return;
    
    // Cargar datos del dashboard
    await loadDashboardData(profile);
});

// ─── CARGAR DATOS DEL DASHBOARD ───
async function loadDashboardData(profile) {
    try {
        // 1. Cargar miembros de la familia
        const members = await getFamilyMembers(profile.family_id);
        updateFamilySummary(members);
        
        // 2. Cargar configuración
        const config = await getSystemConfig(profile.family_id);
        updateConfigSummary(config);
        
        // 3. Cargar últimos menús
        const menus = await getMenus(profile.family_id);
        updateMenuHistory(menus);
        
        // 4. Mostrar información del usuario
        updateUserInfo(profile);
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showError('Error al cargar los datos del dashboard');
    }
}

// ─── ACTUALIZAR RESUMEN DE FAMILIA ───
function updateFamilySummary(members) {
    const container = document.getElementById('familySummary');
    if (!container) return;
    
    const totalMembers = members.length;
    const avgWeight = members.reduce((sum, m) => sum + (m.weight || 0), 0) / totalMembers;
    
    container.innerHTML = `
        <div class="stat-card">
            <span class="stat-icon">👨‍👩‍👧‍👦</span>
            <div>
                <h3>${totalMembers}</h3>
                <p>Miembros</p>
            </div>
        </div>
        <div class="stat-card">
            <span class="stat-icon">⚖️</span>
            <div>
                <h3>${avgWeight.toFixed(1)} kg</h3>
                <p>Peso promedio</p>
            </div>
        </div>
        <div class="stat-card">
            <span class="stat-icon">📅</span>
            <div>
                <h3>${getActiveMenus()}</h3>
                <p>Menús activos</p>
            </div>
        </div>
    `;
}

// ─── ACTUALIZAR RESUMEN DE CONFIGURACIÓN ───
function updateConfigSummary(config) {
    const container = document.getElementById('configSummary');
    if (!container || !config) return;
    
    container.innerHTML = `
        <div class="config-card">
            <span>🍽️ Ayuno: ${config.fasting_enabled ? '✅ Activo' : '❌ Inactivo'}</span>
            <span>💰 Presupuesto: $${config.budget_monthly?.toLocaleString() || 'No definido'}</span>
            <span>📆 Días de ayuno: ${config.fasting_days?.map(d => ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d-1]).join(', ')}</span>
        </div>
    `;
}

// ─── ACTUALIZAR HISTORIAL DE MENÚS ───
function updateMenuHistory(menus) {
    const container = document.getElementById('menuHistory');
    if (!container) return;
    
    if (!menus || menus.length === 0) {
        container.innerHTML = '<p>No hay menús generados aún.</p>';
        return;
    }
    
    const recentMenus = menus.slice(0, 5);
    container.innerHTML = recentMenus.map(menu => `
        <div class="menu-item">
            <span>📋 Semana ${menu.week_number}</span>
            <span>${menu.month}/${menu.year}</span>
            <span class="status ${menu.status}">${menu.status}</span>
            <button onclick="viewMenu('${menu.id}')">Ver</button>
        </div>
    `).join('');
}

// ─── FUNCIONES AUXILIARES ───
function getActiveMenus() {
    // Lógica para contar menús activos (último mes)
    return 1; // Placeholder
}

function updateUserInfo(profile) {
    const container = document.getElementById('userInfo');
    if (!container) return;
    
    container.innerHTML = `
        <div class="user-profile">
            <span class="user-name">👤 ${profile.name}</span>
            <span class="user-role">${profile.role === 'admin' ? 'Administrador' : 'Miembro'}</span>
        </div>
    `;
}

function showError(message) {
    const container = document.getElementById('errorContainer');
    if (!container) return;
    container.innerHTML = `<div class="error-message">❌ ${message}</div>`;
}

// ─── EXPORTAR PARA USO EN OTROS SCRIPTS ───
window.viewMenu = (menuId) => {
    window.location.href = `/pages/menu.html?id=${menuId}`;
};
