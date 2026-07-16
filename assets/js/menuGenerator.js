import { supabase, getProfile, getFamilyMembers, getSystemConfig } from './supabase.js';
import { checkAuth, loadUserProfile } from './auth.js';

// ─── VARIABLES GLOBALES ───
let currentProfile = null;
let members = [];
let config = null;
let currentMenu = null;
let currentShoppingList = null;

// ─── INICIALIZAR ───
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (!session) return;
    
    currentProfile = await loadUserProfile();
    if (!currentProfile) return;
    
    await loadData();
    setupEventListeners();
});

// ─── CARGAR DATOS ───
async function loadData() {
    try {
        members = await getFamilyMembers(currentProfile.family_id);
        config = await getSystemConfig(currentProfile.family_id);
        console.log('✅ Datos cargados:', { members, config });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showError('Error al cargar los datos necesarios');
    }
}

// ─── CONFIGURAR EVENTOS ───
function setupEventListeners() {
    document.getElementById('generateMenuBtn')?.addEventListener('click', generateMenu);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
    document.getElementById('weekFilter')?.addEventListener('change', filterMenu);
    document.getElementById('dayFilter')?.addEventListener('change', filterMenu);
}

// ─── GENERAR MENÚ ───
async function generateMenu() {
    if (members.length === 0) {
        alert('❌ Debes agregar al menos un miembro a la familia primero');
        return;
    }
    
    const container = document.getElementById('menuContainer');
    const loading = document.getElementById('loading');
    const exportBtn = document.getElementById('exportPdfBtn');
    
    loading.style.display = 'block';
    container.innerHTML = '';
    exportBtn.disabled = true;
    
    try {
        // Generar menu por 4 semanas
        const weeks = 4;
        const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
        const menu = {};
        
        // Rotación de proteínas y carbohidratos
        const proteinas = ['pollo', 'res', 'cerdo', 'atun', 'huevos'];
        const carbohidratos = ['arroz', 'papa', 'yuca', 'pasta', 'arepa', 'patacon'];
        
        let proteinIndex = 0;
        let carboIndex = 0;
        
        for (let week = 1; week <= weeks; week++) {
            menu[`week${week}`] = [];
            
            for (let day of days) {
                const dayNumber = days.indexOf(day) + 1;
                const esAyuno = config.fasting_days.includes(dayNumber);
                
                // Seleccionar proteína y carbohidrato (rotación)
                const proteina = proteinas[proteinIndex % proteinas.length];
                proteinIndex++;
                
                const carbohidrato = carbohidratos[carboIndex % carbohidratos.length];
                carboIndex++;
                
                // Construir el día
                const dayMenu = {
                    day: day,
                    dayNumber: dayNumber,
                    esAyuno: esAyuno,
                    proteina: proteina,
                    carbohidrato: carbohidrato,
                    meals: {
                        desayuno: {},
                        almuerzo: {},
                        cena: {}
                    }
                };
                
                // Para cada miembro
                for (let member of members) {
                    const esAdulto = member.role === 'hombre' || member.role === 'mujer';
                    const esHombre = member.role === 'hombre';
                    const diasVeganos = member.vegan_days || [];
                    
                    // Desayuno
                    if (esAdulto) {
                        // Solo desayunan en días específicos
                        if (config.fasting_days.includes(dayNumber)) {
                            dayMenu.meals.desayuno[member.name] = {
                                descripcion: obtenerDesayunoAdulto(member),
                                porciones: obtenerPorcionesDesayuno(member),
                                ayuno: false
                            };
                        } else {
                            dayMenu.meals.desayuno[member.name] = {
                                descripcion: '⏰ Ayuno',
                                ayuno: true
                            };
                        }
                    } else {
                        // Niños siempre desayunan
                        dayMenu.meals.desayuno[member.name] = {
                            descripcion: obtenerDesayunoNinos(member),
                            porciones: obtenerPorcionesDesayuno(member),
                            ayuno: false
                        };
                    }
                    
                    // Almuerzo
                    let proteinaAlmuerzo = proteina;
                    // Si es hombre y día vegano
                    if (esHombre && diasVeganos.includes(dayNumber)) {
                        proteinaAlmuerzo = 'carve';
                    }
                    
                    dayMenu.meals.almuerzo[member.name] = {
                        descripcion: `${proteinaAlmuerzo} + ${carbohidrato}`,
                        porciones: obtenerPorcionesAlmuerzo(member, proteinaAlmuerzo, carbohidrato),
                        esVegano: esHombre && diasVeganos.includes(dayNumber)
                    };
                    
                    // Cena
                    let cenaProteina = obtenerProteinaCena(dayNumber);
                    dayMenu.meals.cena[member.name] = {
                        descripcion: cenaProteina,
                        porciones: obtenerPorcionesCena(member)
                    };
                }
                
                menu[`week${week}`].push(dayMenu);
            }
        }
        
        // Generar lista de compras
        currentShoppingList = generarListaCompras(menu, members);
        
        // Guardar en Supabase
        const { data, error } = await supabase
            .from('weekly_menus')
            .insert({
                family_id: currentProfile.family_id,
                week_number: 1,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                menu_data: menu,
                shopping_list: currentShoppingList,
                status: 'borrador',
                created_by: (await supabase.auth.getUser()).data.user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        
        currentMenu = menu;
        renderMenu(menu);
        renderShoppingList(currentShoppingList);
        exportBtn.disabled = false;
        
        showSuccess('✅ Menú generado exitosamente');
    } catch (error) {
        console.error('Error al generar menú:', error);
        showError('❌ Error al generar el menú');
    } finally {
        loading.style.display = 'none';
    }
}

// ─── RENDERIZAR MENÚ ───
function renderMenu(menu) {
    const container = document.getElementById('menuContainer');
    const weekFilter = document.getElementById('weekFilter').value;
    const dayFilter = document.getElementById('dayFilter').value;
    
    let html = '<div class="menu-table-wrapper" style="overflow-x: auto;"><table class="menu-table">';
    html += `
        <thead>
            <tr>
                <th>Día</th>
                <th>Desayuno</th>
                <th>Almuerzo</th>
                <th>Cena</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    const weeks = Object.keys(menu);
    let filteredWeeks = weeks;
    
    if (weekFilter !== 'all') {
        filteredWeeks = [`week${weekFilter}`];
    }
    
    for (let weekKey of filteredWeeks) {
        if (!menu[weekKey]) continue;
        
        const weekDays = menu[weekKey];
        let weekHtml = '';
        
        for (let day of weekDays) {
            // Filtrar por día
            if (dayFilter !== 'all' && day.day !== dayFilter) continue;
            
            const dayName = day.day.charAt(0).toUpperCase() + day.day.slice(1);
            const isWeekend = day.day === 'sabado' || day.day === 'domingo';
            
            // Desayuno
            let desayunoHtml = '';
            for (let [name, meal] of Object.entries(day.meals.desayuno)) {
                if (meal.ayuno) {
                    desayunoHtml += `<div class="ayuno">${name}: ${meal.descripcion}</div>`;
                } else {
                    desayunoHtml += `<div><strong>${name}</strong>: ${meal.descripcion}</div>`;
                    if (meal.porciones) {
                        desayunoHtml += `<span class="portion">${meal.porciones}</span>`;
                    }
                }
            }
            
            // Almuerzo
            let almuerzoHtml = '';
            for (let [name, meal] of Object.entries(day.meals.almuerzo)) {
                const veganClass = meal.esVegano ? 'vegan' : '';
                almuerzoHtml += `<div><strong>${name}</strong>: <span class="${veganClass}">${meal.descripcion}</span></div>`;
                if (meal.porciones) {
                    almuerzoHtml += `<span class="portion">${meal.porciones}</span>`;
                }
            }
            
            // Cena
            let cenaHtml = '';
            for (let [name, meal] of Object.entries(day.meals.cena)) {
                cenaHtml += `<div><strong>${name}</strong>: ${meal.descripcion}</div>`;
                if (meal.porciones) {
                    cenaHtml += `<span class="portion">${meal.porciones}</span>`;
                }
            }
            
            weekHtml += `
                <tr>
                    <td class="day-header">${dayName}${isWeekend ? ' 🎉' : ''
