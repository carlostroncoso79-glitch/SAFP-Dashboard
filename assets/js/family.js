import { supabase, getProfile, getFamilyMembers } from './supabase.js';
import { checkAuth, loadUserProfile } from './auth.js';

// ─── VARIABLES GLOBALES ───
let currentProfile = null;
let members = [];

// ─── INICIALIZAR ───
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (!session) return;
    
    currentProfile = await loadUserProfile();
    if (!currentProfile) return;
    
    await loadMembers();
    setupEventListeners();
});

// ─── CARGAR MIEMBROS ───
async function loadMembers() {
    try {
        members = await getFamilyMembers(currentProfile.family_id);
        renderMembers(members);
    } catch (error) {
        console.error('Error al cargar miembros:', error);
        showError('Error al cargar los miembros');
    }
}

// ─── RENDERIZAR MIEMBROS ───
function renderMembers(members) {
    const container = document.getElementById('membersList');
    if (!container) return;
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p style="text-align: center; color: var(--text-light); padding: 40px;">
                    👨‍👩‍👧‍👦 No hay miembros registrados.<br>
                    Haz clic en "Agregar Miembro" para comenzar.
                </p>
            </div>
        `;
        return;
    }
    
    const avatars = {
        hombre: '👨',
        mujer: '👩',
        niña: '👧',
        niño: '👦'
    };
    
    container.innerHTML = members.map(member => `
        <div class="member-card" data-id="${member.id}">
            <div class="avatar">${avatars[member.role] || '👤'}</div>
            <h3>${member.name}</h3>
            <span class="role-badge ${member.role}">${member.role}</span>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Edad</span>
                    <span class="value">${member.age} años</span>
                </div>
                <div class="info-item">
                    <span class="label">Peso</span>
                    <span class="value">${member.weight} kg</span>
                </div>
                <div class="info-item">
                    <span class="label">Estatura</span>
                    <span class="value">${member.height} cm</span>
                </div>
                <div class="info-item">
                    <span class="label">Objetivo</span>
                    <span class="value">${getObjectiveLabel(member.objective)}</span>
                </div>
            </div>
            
            ${member.role === 'hombre' && member.vegan_days ? `
                <div style="font-size: 12px; color: var(--text-light); margin: 5px 0;">
                    🌱 Días veganos: ${member.vegan_days.map(d => ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d-1]).join(', ')}
                </div>
            ` : ''}
            
            <div class="card-actions">
                <button class="btn-edit" onclick="editMember('${member.id}')">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteMember('${member.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

// ─── CONFIGURAR EVENTOS ───
function setupEventListeners() {
    // Abrir modal
    document.getElementById('addMemberBtn')?.addEventListener('click', () => {
        openModal();
    });
    
    // Cerrar modal
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('memberModal')) {
            closeModal();
        }
    });
    
    // Enviar formulario
    document.getElementById('memberForm')?.addEventListener('submit', saveMember);
    
    // Mostrar/ocultar días veganos
    document.getElementById('memberRole')?.addEventListener('change', (e) => {
        const group = document.getElementById('veganDaysGroup');
        group.style.display = e.target.value === 'hombre' ? 'block' : 'none';
    });
}

// ─── ABRIR MODAL ───
function openModal(member = null) {
    const modal = document.getElementById('memberModal');
    const form = document.getElementById('memberForm');
    const title = document.getElementById('modalTitle');
    
    form.reset();
    document.getElementById('memberId').value = '';
    
    if (member) {
        title.textContent = 'Editar Miembro';
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberRole').value = member.role;
        document.getElementById('memberAge').value = member.age;
        document.getElementById('memberWeight').value = member.weight;
        document.getElementById('memberHeight').value = member.height;
        document.getElementById('memberObjective').value = member.objective;
        
        // Días veganos
        if (member.vegan_days) {
            document.querySelectorAll('.vegan-day').forEach(cb => {
                cb.checked = member.vegan_days.includes(parseInt(cb.value));
            });
        }
        
        const group = document.getElementById('veganDaysGroup');
        group.style.display = member.role === 'hombre' ? 'block' : 'none';
    } else {
        title.textContent = 'Agregar Miembro';
        document.querySelectorAll('.vegan-day').forEach(cb => cb.checked = false);
    }
    
    modal.style.display = 'flex';
}

// ─── CERRAR MODAL ───
function closeModal() {
    document.getElementById('memberModal').style.display = 'none';
}

// ─── GUARDAR MIEMBRO ───
async function saveMember(e) {
    e.preventDefault();
    
    const id = document.getElementById('memberId').value;
    const name = document.getElementById('memberName').value;
    const role = document.getElementById('memberRole').value;
    const age = parseInt(document.getElementById('memberAge').value);
    const weight = parseFloat(document.getElementById('memberWeight').value);
    const height = parseFloat(document.getElementById('memberHeight').value);
    const objective = document.getElementById('memberObjective').value;
    
    // Obtener días veganos
    const veganDays = [];
    document.querySelectorAll('.vegan-day:checked').forEach(cb => {
        veganDays.push(parseInt(cb.value));
    });
    
    try {
        if (id) {
            // Actualizar
            const { error } = await supabase
                .from('family_members')
                .update({
                    name, role, age, weight, height, objective,
                    vegan_days: veganDays,
                    updated_at: new Date()
                })
                .eq('id', id);
            
            if (error) throw error;
        } else {
            // Crear
            const { error } = await supabase
                .from('family_members')
                .insert({
                    family_id: currentProfile.family_id,
                    name, role, age, weight, height, objective,
                    vegan_days: veganDays
                });
            
            if (error) throw error;
        }
        
        closeModal();
        await loadMembers();
        showSuccess('Miembro guardado exitosamente');
    } catch (error) {
        console.error('Error al guardar miembro:', error);
        showError('Error al guardar el miembro');
    }
}

// ─── EDITAR MIEMBRO ───
window.editMember = (id) => {
    const member = members.find(m => m.id === id);
    if (member) {
        openModal(member);
    }
};

// ─── ELIMINAR MIEMBRO ───
window.deleteMember = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este miembro?')) return;
    
    try {
        const { error } = await supabase
            .from('family_members')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await loadMembers();
        showSuccess('Miembro eliminado');
    } catch (error) {
        console.error('Error al eliminar miembro:', error);
        showError('Error al eliminar el miembro');
    }
};

// ─── FUNCIONES AUXILIARES ───
function getObjectiveLabel(objective) {
    const labels = {
        'bajar_grasa': '🔥 Bajar grasa',
        'ganar_musculo': '💪 Ganar músculo',
        'mantener': '⚖️ Mantener',
        'crecimiento': '📈 Crecimiento'
    };
    return labels[objective] || objective;
}

function showError(message) {
    const container = document.getElementById('errorContainer');
    if (!container) return;
    container.innerHTML = `<div class="error-message" style="color: var(--danger); padding: 10px; background: #FDEDEC; border-radius: 8px;">❌ ${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

function showSuccess(message) {
    const container = document.getElementById('errorContainer');
    if (!container) return;
    container.innerHTML = `<div class="success-message" style="color: var(--success); padding: 10px; background: #EAFAF1; border-radius: 8px;">✅ ${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}
