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
                    <td class="day-header">${dayName}${isWeekend ? ' 🎉' : ''}</td>
                    <td class="meal-cell">${desayunoHtml || '—'}</td>
                    <td class="meal-cell">${almuerzoHtml}</td>
                    <td class="meal-cell">${cenaHtml}</td>
                </tr>
            `;
        }
        
        if (weekHtml) {
            html += weekHtml;
        }
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ─── RENDERIZAR LISTA DE COMPRAS ───
function renderShoppingList(shoppingList) {
    const container = document.getElementById('shoppingListContainer');
    
    let html = `
        <div class="shopping-list">
            <h2>🛒 Lista de Compras</h2>
    `;
    
    for (let [category, items] of Object.entries(shoppingList)) {
        if (Object.keys(items).length === 0) continue;
        
        const categoryLabels = {
            carnes: '🥩 Carnes y Proteínas',
            verduras: '🥬 Verduras',
            carbohidratos: '🍚 Carbohidratos',
            lacteos: '🥛 Lácteos',
            frutas: '🍎 Frutas',
            otros: '📦 Otros'
        };
        
        html += `
            <div class="shopping-category">
                <h3>${categoryLabels[category] || category}</h3>
                <div class="shopping-items">
        `;
        
        for (let [item, quantity] of Object.entries(items)) {
            html += `
                <div class="shopping-item">
                    <span class="item-name">${item}</span>
                    <span class="item-quantity">${quantity}</span>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ─── FILTRAR MENÚ ───
function filterMenu() {
    if (currentMenu) {
        renderMenu(currentMenu);
    }
}

// ─── GENERAR LISTA DE COMPRAS ───
function generarListaCompras(menu, members) {
    const shoppingList = {
        carnes: {},
        verduras: {},
        carbohidratos: {},
        lacteos: {},
        frutas: {},
        otros: {}
    };
    
    // Contar cuántas veces aparece cada proteína
    const proteinCount = {};
    const carboCount = {};
    
    for (let weekKey of Object.keys(menu)) {
        for (let day of menu[weekKey]) {
            // Proteínas
            const proteina = day.proteina;
            proteinCount[proteina] = (proteinCount[proteina] || 0) + 1;
            
            // Carbohidratos
            const carbo = day.carbohidrato;
            carboCount[carbo] = (carboCount[carbo] || 0) + 1;
        }
    }
    
    // Convertir a cantidades (aproximadas para 4 personas)
    const quantities = {
        pollo: '4 kg',
        res: '3 kg',
        cerdo: '2.5 kg',
        atun: '8 latas',
        huevos: '60 unidades',
        carve: '2 kg',
        arroz: '4 kg',
        papa: '5 kg',
        yuca: '3 kg',
        pasta: '2 kg',
        arepa: '2 paquetes',
        patacon: '2 kg',
        tomate: '2 kg',
        cebolla: '1.5 kg',
        pimenton: '1 kg',
        lechuga: '4 unidades',
        zanahoria: '2 kg',
        brocoli: '2 kg',
        aguacate: '6 unidades',
        leche: '8 litros',
        queso_costeno: '1.5 kg',
        banano: '2 manos',
        manzana: '4 unidades',
        mora: '2 kg',
        uva: '2 kg'
    };
    
    // Agregar proteínas a la lista
    for (let [key, count] of Object.entries(proteinCount)) {
        let itemName = key;
        let quantity = quantities[key] || `${count * 0.5} kg`;
        if (key === 'atun') quantity = `${count * 2} latas`;
        if (key === 'huevos') quantity = `${count * 6} unidades`;
        if (key === 'carve') quantity = `${count * 0.5} kg`;
        
        shoppingList.carnes[itemName] = quantity;
    }
    
    // Agregar carbohidratos
    for (let [key, count] of Object.entries(carboCount)) {
        let itemName = key;
        let quantity = quantities[key] || `${count * 0.5} kg`;
        if (key === 'arepa') quantity = `${count * 0.5} paquete`;
        
        shoppingList.carbohidratos[itemName] = quantity;
    }
    
    // Verduras fijas
    shoppingList.verduras = {
        'Tomate': quantities.tomate,
        'Cebolla': quantities.cebolla,
        'Pimentón': quantities.pimenton,
        'Lechuga': quantities.lechuga,
        'Zanahoria': quantities.zanahoria,
        'Brócoli': quantities.brocoli
    };
    
    // Lácteos
    shoppingList.lacteos = {
        'Leche': quantities.leche,
        'Queso Costeño': quantities.queso_costeno
    };
    
    // Frutas
    shoppingList.frutas = {
        'Banano': quantities.banano,
        'Manzana': quantities.manzana,
        'Mora': quantities.mora,
        'Uva': quantities.uva
    };
    
    // Aguacate (grasa saludable)
    shoppingList.otros = {
        'Aguacate': quantities.aguacate
    };
    
    return shoppingList;
}

// ─── FUNCIONES DE PORCIONES (SPI) ───
function obtenerPorcionesDesayuno(member) {
    if (member.role === 'hombre') {
        return '4 huevos + 2 arepas + 1 vaso leche';
    } else if (member.role === 'mujer') {
        return '2 huevos + 1 arepa + 1 vaso leche';
    } else if (member.role === 'niña') {
        return '2 huevos + 1 arepa + 1 vaso leche';
    } else if (member.role === 'niño') {
        return '1-2 huevos + ½ arepa + 1 vaso leche';
    }
}

function obtenerPorcionesAlmuerzo(member, proteina, carbohidrato) {
    if (member.role === 'hombre') {
        return `180-220g ${proteina} + 1.5 tazas ${carbohidrato} + 2 tazas verduras + ½ aguacate`;
    } else if (member.role === 'mujer') {
        return `120-150g ${proteina} + ¾ taza ${carbohidrato} + 2 tazas verduras + ¼ aguacate`;
    } else if (member.role === 'niña') {
        return `90-110g ${proteina} + 1 taza ${carbohidrato} + 1 taza verduras + ¼ aguacate`;
    } else if (member.role === 'niño') {
        return `60-80g ${proteina} + ¾ taza ${carbohidrato} + ½-1 taza verduras + ⅛ aguacate`;
    }
}

function obtenerPorcionesCena(member) {
    if (member.role === 'hombre') {
        return '4 huevos/atún + arepa + 2 tazas verduras';
    } else if (member.role === 'mujer') {
        return '2 huevos/atún + arepa + 2 tazas verduras';
    } else if (member.role === 'niña') {
        return '2 huevos + arepa + 1 taza verduras';
    } else if (member.role === 'niño') {
        return '1-2 huevos + arepa + ½-1 taza verduras';
    }
}

// ─── FUNCIONES DE DESAYUNOS ───
function obtenerDesayunoAdulto(member) {
    if (member.role === 'hombre') {
        return 'Huevos revueltos + queso costeño + arepa + leche';
    } else {
        return 'Huevos revueltos + arepa + queso costeño + leche';
    }
}

function obtenerDesayunoNinos(member) {
    return 'Huevos + arepa + leche';
}

function obtenerProteinaCena(dayNumber) {
    if (dayNumber === 6) { // sábado
        return 'Salchicha ranchera + papa + tomate';
    }
    return 'Atún + tomate + arepa + queso costeño + leche';
}

// ─── EXPORTAR PDF ───
async function exportPdf() {
    alert('📄 Función de exportación a PDF en desarrollo...');
    // Aquí se integrará la lógica de pdfExport.js
}

// ─── FUNCIONES AUXILIARES ───
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
    setTimeout(() => container.innerHTML = '', 3000);
}
