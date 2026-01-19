/**
 * Formatea un número como moneda en EUR
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada (Ej: "1.234,56 €")
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount)
}

/**
 * Formatea una fecha como texto legible
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada (Ej: "14 ene 2026")
 */
export function formatDate(date) {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(d)
}

/**
 * Calcula el número de días entre dos fechas
 * @param {Date|string} start - Fecha inicio
 * @param {Date|string} end - Fecha fin
 * @returns {number} - Número de días
 */
export function calculateDays(start, end) {
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end
    const diffTime = Math.abs(endDate - startDate)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calcula días de estancia considerando reglas de entrada/salida
 * @param {Date|string} entry - Fecha de entrada
 * @param {Date|string} exit - Fecha de salida
 * @param {Object} rules - Reglas del cliente
 * @returns {number} - Días facturables
 */
export function calculateBillableDays(entry, exit, rules = {}) {
    let days = calculateDays(entry, exit)

    // Si entrada y salida son el mismo día
    if (days === 0) {
        return (rules.charge_entry_day || rules.charge_exit_day) ? 1 : 0
    }

    // Ajustar según reglas
    if (!rules.charge_entry_day && days > 0) days -= 1
    if (rules.charge_exit_day && days > 0) days += 1

    return Math.max(0, days)
}

/**
 * Genera iniciales a partir de un nombre fiscal
 * @param {string} name - Nombre fiscal del cliente
 * @returns {string} - Iniciales sugeridas (máx 3 caracteres)
 */
export function generateInitials(name) {
    if (!name) return ''
    const words = name.trim().toUpperCase().split(' ')
    if (words.length === 1) return words[0].substring(0, 3)
    return words.slice(0, 2).map(w => w[0]).join('')
}
