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
 * Genera iniciales a partir de un nombre fiscal
 * @param {string} name - Nombre fiscal del cliente
 * @returns {string} - Iniciales sugeridas (máx 3 caracteres)
 */
export function generateInitials(name) {
    if (!name) return ''
    const words = name.trim().toUpperCase().split(' ').filter(w => w.length > 0)
    if (words.length === 1) return words[0].substring(0, 3)
    return words.slice(0, 3).map(w => w[0]).join('')
}

/**
 * Valida un NIF/CIF español
 * Formatos: 12345678Z (NIF persona), B12345678 (CIF empresa)
 * @param {string} nif
 * @returns {{ valid: boolean, message: string }}
 */
export function validateNIF(nif) {
    if (!nif || nif.trim() === '') return { valid: false, message: 'El NIF es obligatorio' }
    const cleaned = nif.trim().toUpperCase()

    // NIF persona física: 8 dígitos + letra
    const nifRegex = /^\d{8}[A-Z]$/
    // CIF empresa: letra + 7 dígitos + dígito/letra
    const cifRegex = /^[A-Z]\d{7}[A-Z0-9]$/
    // NIE extranjero: X/Y/Z + 7 dígitos + letra
    const nieRegex = /^[XYZ]\d{7}[A-Z]$/

    if (nifRegex.test(cleaned) || cifRegex.test(cleaned) || nieRegex.test(cleaned)) {
        return { valid: true, message: '' }
    }
    return { valid: false, message: 'Formato de NIF/CIF inválido. Ejemplos: 12345678Z, B12345678' }
}

/**
 * Valida un crotal oficial español
 * Formato: ES + 12 dígitos (o variantes con letras)
 * @param {string} crotal
 * @returns {{ valid: boolean, message: string }}
 */
export function validateCrotal(crotal) {
    if (!crotal || crotal.trim() === '') return { valid: false, message: 'El crotal es obligatorio' }
    const cleaned = crotal.trim().toUpperCase()

    // Formato oficial: ES seguido de 12 dígitos
    // Pero en la práctica se usan variantes, así que aceptamos ES + 10-14 alfanuméricos
    const crotalRegex = /^ES[A-Z0-9]{10,14}$/
    if (crotalRegex.test(cleaned)) {
        return { valid: true, message: '' }
    }

    // Si no empieza por ES pero tiene formato numérico largo, sugerir
    if (/^\d{10,16}$/.test(cleaned)) {
        return { valid: false, message: 'El crotal debe empezar por "ES". Ejemplo: ES0123456789012' }
    }

    return { valid: false, message: 'Formato de crotal inválido. Debe ser ES seguido de 10-14 caracteres. Ejemplo: ES0123456789012' }
}

/**
 * Valida que fecha_entrada sea anterior o igual a fecha_salida
 * @param {string} entryDate
 * @param {string} exitDate
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDateRange(entryDate, exitDate) {
    if (!entryDate) return { valid: false, message: 'La fecha de entrada es obligatoria' }
    if (!exitDate) return { valid: true, message: '' } // exit_date es opcional
    if (exitDate < entryDate) {
        return { valid: false, message: 'La fecha de salida no puede ser anterior a la de entrada' }
    }
    return { valid: true, message: '' }
}

/**
 * Valida un email
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(email) {
    if (!email || email.trim() === '') return { valid: true, message: '' } // email es opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(email.trim())) return { valid: true, message: '' }
    return { valid: false, message: 'Formato de email inválido' }
}

/**
 * Valida un teléfono español
 * @param {string} phone
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePhone(phone) {
    if (!phone || phone.trim() === '') return { valid: true, message: '' } // teléfono es opcional
    const phoneRegex = /^[0-9+\s()-]{6,15}$/
    if (phoneRegex.test(phone.trim())) return { valid: true, message: '' }
    return { valid: false, message: 'Formato de teléfono inválido' }
}
