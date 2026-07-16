// ─── EXPORTACIÓN A PDF ───
// Usaremos html2canvas + jsPDF para generar PDFs directamente desde el navegador

export async function exportMenuToPDF(menu, shoppingList, familyName) {
    // Cargar librerías dinámicamente
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    
    // Crear contenido HTML para el PDF
    const content = createPDFContent(menu, shoppingList, familyName);
    
    // Crear elemento temporal
    const container = document.createElement('div');
    container.innerHTML = content;
    container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: white;
        padding: 40px;
        font-family: Arial, sans-serif;
    `;
    document.body.appendChild(container);
    
    // Generar PDF
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`SAFP-Menu-${new Date().toLocaleDateString()}.pdf`);
    
    document.body.removeChild(container);
}

// ─── CREAR CONTENIDO DEL PDF ───
function createPDFContent(menu, shoppingList, familyName) {
    let html = `
        <h1 style="text-align: center; color: #2A7A62;">🍽️ SAFP - Sistema Alimentario Familiar</h1>
        <h2 style="text-align: center; color: #2C3E50;">Menú Mensual</h2>
        <p style="text-align: center; color: #7F8C8D;">Familia: ${familyName} | Fecha: ${new Date().toLocaleDateString()}</p>
        <hr style="border: 2px solid #2A7A62; margin: 20px 0;">
    `;
    
    // Tabla de menú
    html += `<h3 style="color: #2A7A62;">📋 Menú Semanal</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
            <tr style="background: #2A7A62; color: white;">
                <th style="padding: 8px; border: 1px solid #ddd;">Día</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Desayuno</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Almuerzo</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Cena</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    // Obtener semana 1 para el PDF
    const week1 = menu.week1 || [];
    for (let day of week1) {
        const dayName = day.day.charAt(0).toUpperCase() + day.day.slice(1);
        
        // Desayuno
        let desayuno = '';
        for (let [name, meal] of Object.entries(day.meals.desayuno)) {
            desayuno += `${name}: ${meal.descripcion}<br>`;
        }
        
        // Almuerzo
        let almuerzo = '';
        for (let [name, meal] of Object.entries(day.meals.almuerzo)) {
            const vegan = meal.esVegano ? ' 🌱' : '';
            almuerzo += `${name}: ${meal.descripcion}${vegan}<br>`;
        }
        
        // Cena
        let cena = '';
        for (let [name, meal] of Object.entries(day.meals.cena)) {
            cena += `${name}: ${meal.descripcion}<br>`;
        }
        
        html += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${dayName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${desayuno || '—'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${almuerzo}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${cena}</td>
            </tr>
        `;
    }
    
    html += `</tbody></table>`;
    
    // Lista de compras
    if (shoppingList) {
        html += `<hr style="border: 1px solid #ddd; margin: 20px 0;">`;
        html += `<h3 style="color: #2A7A62;">🛒 Lista de Compras</h3>`;
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;
        
        const categoryLabels = {
            carnes: '🥩 Carnes y Proteínas',
            verduras: '🥬 Verduras',
            carbohidratos: '🍚 Carbohidratos',
            lacteos: '🥛 Lácteos',
            frutas: '🍎 Frutas',
            otros: '📦 Otros'
        };
        
        for (let [category, items] of Object.entries(shoppingList)) {
            if (Object.keys(items).length === 0) continue;
            
            html += `
                <tr style="background: #F8F9FA;">
                    <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${categoryLabels[category] || category}</td>
                </tr>
            `;
            
            for (let [item, quantity] of Object.entries(items)) {
                html += `
                    <tr>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; padding-left: 20px;">${item}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${quantity}</td>
                    </tr>
                `;
            }
        }
        
        html += `</table>`;
    }
    
    // Pie de página
    html += `
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; color: #7F8C8D; font-size: 10px;">
            SAFP - Sistema Alimentario Familiar Permanente v1.0<br>
            Generado el ${new Date().toLocaleString()}
        </p>
    `;
    
    return html;
}

// ─── CARGAR SCRIPT DINÁMICO ───
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
