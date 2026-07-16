// ─── UTILIDADES GENERALES ───

// Formatear fecha
export function formatDate(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formatear moneda (COP)
export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

// Capitalizar primera letra
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Obtener nombre del día de la semana
export function getDayName(dayNumber) {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[dayNumber - 1] || dayNumber;
}

// Validar email
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Generar ID único
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Debounce (para búsquedas)
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ─── CONSTANTES ───
export const CONSTANTS = {
    PROTEINAS: ['pollo', 'res', 'cerdo', 'atun', 'huevos', 'carve'],
    CARBOHIDRATOS: ['arroz', 'papa', 'yuca', 'pasta', 'arepa', 'patacon'],
    VERDURAS: ['tomate', 'cebolla', 'pimenton', 'lechuga', 'zanahoria', 'brocoli', 'coliflor', 'espinaca'],
    FRUTAS: ['banano', 'manzana', 'mango', 'mora', 'uva', 'fresa', 'kiwi'],
    ROLES: ['hombre', 'mujer', 'niña', 'niño'],
    OBJETIVOS: ['bajar_grasa', 'ganar_musculo', 'mantener', 'crecimiento']
};

// ─── PORCIONES SPI ───
export const SPI = {
    desayuno: {
        hombre: '4 huevos + 2 arepas + 1 vaso leche',
        mujer: '2 huevos + 1 arepa + 1 vaso leche',
        niña: '2 huevos + 1 arepa + 1 vaso leche',
        niño: '1-2 huevos + ½ arepa + 1 vaso leche'
    },
    almuerzo: {
        hombre: (proteina, carbo) => `180-220g ${proteina} + 1.5 tazas ${carbo} + 2 tazas verduras + ½ aguacate`,
        mujer: (proteina, carbo) => `120-150g ${proteina} + ¾ taza ${carbo} + 2 tazas verduras + ¼ aguacate`,
        niña: (proteina, carbo) => `90-110g ${proteina} + 1 taza ${carbo} + 1 taza verduras + ¼ aguacate`,
        niño: (proteina, carbo) => `60-80g ${proteina} + ¾ taza ${carbo} + ½-1 taza verduras + ⅛ aguacate`
    },
    cena: {
        hombre: '4 huevos/atún + arepa + 2 tazas verduras',
        mujer: '2 huevos/atún + arepa + 2 tazas verduras',
        niña: '2 huevos + arepa + 1 taza verduras',
        niño: '1-2 huevos + arepa + ½-1 taza verduras'
    }
};
