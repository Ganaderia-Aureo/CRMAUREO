import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import { FileText, Plus, Download, AlertCircle, Edit2, X, Save, Eye, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Módulo de Facturación COMPLETO
 * Con vista previa, buscador y logo integrado
 */
export default function Invoices() {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [editingDraft, setEditingDraft] = useState(null)
    const [previewInvoice, setPreviewInvoice] = useState(null) // Para vista previa

    // Selector de periodo para generar borradores
    const currentDate = new Date()
    const [selectedPeriod, setSelectedPeriod] = useState({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
    })


    const [draftForm, setDraftForm] = useState({
        discount_amount: 0,
        discount_reason: '',
    })

    useEffect(() => {
        loadInvoices()
    }, [])

    async function loadInvoices() {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
          *,
          client:clients(fiscal_name, initials, contract_rules)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setInvoices(data || [])
        } catch (error) {
            console.error('Error loading invoices:', error)
        } finally {
            setLoading(false)
        }
    }

    async function generateDrafts() {
        const monthName = new Date(selectedPeriod.year, selectedPeriod.month - 1).toLocaleString('es', { month: 'long' })
        if (!confirm(`¿Generar borradores de facturación para ${monthName} ${selectedPeriod.year}?`)) return

        setGenerating(true)

        try {
            const month = selectedPeriod.month
            const year = selectedPeriod.year

            const { data: clients } = await supabase.from('clients').select('*')

            for (const client of clients) {
                // Filtrar solo animales que no sean históricos para optimizar, aunque el filtrado de fechas es el definitivo
                const { data: animals } = await supabase
                    .from('animals')
                    .select('*')
                    .eq('client_id', client.id)
                    .neq('status', 'HISTORIC') // Solo excluimos los que ya son históricos si aplica

                if (!animals || animals.length === 0) continue

                // DEFINIR FECHAS DEL MES DE FACTURACIÓN
                // Inicio del mes (Día 1 00:00:00)
                const startOfMonth = new Date(year, month - 1, 1)
                startOfMonth.setHours(0, 0, 0, 0)

                // Fin del mes (Último día 23:59:59)
                const endOfMonth = new Date(year, month, 0)
                endOfMonth.setHours(23, 59, 59, 999)

                const rate = client.contract_rules?.daily_rate || 2.5

                // Procesar cada animal individualmente con el algoritmo de días exactos
                let validLineItems = []

                for (const animal of animals) {
                    // Normalizar fechas del animal
                    const entryDate = new Date(animal.entry_date)
                    entryDate.setHours(0, 0, 0, 0)

                    const exitDate = animal.exit_date ? new Date(animal.exit_date) : null
                    if (exitDate) exitDate.setHours(23, 59, 59, 999) // Fin del día de salida

                    // 1. FILTRADO PREVIO (CRÍTICO)
                    // Excluir si entró después de que acabó el mes
                    if (entryDate > endOfMonth) continue
                    // Excluir si salió antes de que empezara el mes
                    if (exitDate && exitDate < startOfMonth) continue

                    // 2. CÁLCULO DE FECHAS EFECTIVAS
                    // Fecha inicio: La mayor entre (Inicio Mes vs Entrada)
                    const effectiveStart = entryDate > startOfMonth ? entryDate : startOfMonth

                    // Fecha fin: La menor entre (Fin Mes vs Salida)
                    // Si no tiene fecha de salida, usamos fin de mes
                    const effectiveEnd = (exitDate && exitDate < endOfMonth) ? exitDate : endOfMonth

                    // 3. CÁLCULO DE DÍAS BRUTOS
                    // Diferencia en milisegundos
                    const diffTime = Math.abs(effectiveEnd.getTime() - effectiveStart.getTime())
                    // Convertir a días (redondeando hacia arriba para cubrir cualquier fracción, +1 para incluir el día final)
                    // Usamos setHours en copia para cálculo exacto de días naturales
                    const d1 = new Date(effectiveStart)
                    d1.setHours(0, 0, 0, 0)
                    const d2 = new Date(effectiveEnd)
                    d2.setHours(0, 0, 0, 0)

                    let billingDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1

                    // 4. AJUSTE DE CONFIGURACIÓN CLIENTE
                    // Si entró ESTE mes y no se cobra entrada
                    const entryInThisMonth = entryDate >= startOfMonth && entryDate <= endOfMonth
                    if (entryInThisMonth && client.contract_rules?.charge_entry_day === false) {
                        billingDays -= 1
                    }

                    // Si salió ESTE mes y no se cobra salida
                    const exitInThisMonth = exitDate && exitDate >= startOfMonth && exitDate <= endOfMonth
                    if (exitInThisMonth && client.contract_rules?.charge_exit_day === false) {
                        billingDays -= 1
                    }

                    // 5. SEGURIDAD
                    if (billingDays <= 0) continue

                    // Agregar a la lista válida
                    validLineItems.push({
                        crotal: animal.crotal,
                        days: billingDays,
                        daily_rate: rate,
                        quantity: 1,
                        row_total: billingDays * rate,
                    })
                }

                if (validLineItems.length === 0) continue

                // Si hay más de 10 animales, consolidar en una sola línea
                let lineItems
                if (validLineItems.length > 10) {
                    const totalAnimals = validLineItems.length
                    const totalAmount = validLineItems.reduce((sum, item) => sum + item.row_total, 0)
                    // Calcular promedio de días para mostrar algo coherente, aunque el total es lo que importa
                    // O mejor, mostrar "Varios periodos" si los días difieren
                    // Para simplificar, usamos la suma total directamente

                    lineItems = [{
                        crotal: `${totalAnimals} ANIMALES`,
                        days: 1, // Unidad base
                        daily_rate: totalAmount, // Precio total como tarifa unitaria de este item consolidado
                        quantity: 1,
                        row_total: totalAmount,
                    }]
                } else {
                    lineItems = validLineItems
                }

                const base = lineItems.reduce((sum, line) => sum + line.row_total, 0)
                const ivaRate = client.contract_rules?.iva_rate || 10
                const retentionRate = client.contract_rules?.retention_rate || 2
                const ivaAmount = base * (ivaRate / 100)
                const retentionAmount = base * (retentionRate / 100)
                const total = base + ivaAmount - retentionAmount

                await supabase.from('invoices').insert([
                    {
                        client_id: client.id,
                        period_month: month,
                        period_year: year,
                        status: 'DRAFT',
                        frozen_snapshot: {
                            client_name: client.fiscal_name,
                            client_nif: client.nif,
                            client_address: client.address,
                            line_items: lineItems,
                            discount_amount: 0,
                            discount_reason: '',
                        },
                        totals: {
                            base: base,
                            discount_amount: 0,
                            iva_rate: ivaRate,
                            iva_amount: ivaAmount,
                            retention_rate: retentionRate,
                            retention_amount: retentionAmount,
                            total: total,
                        },
                    },
                ])
            }

            alert('Borradores generados correctamente')
            await loadInvoices()
        } catch (error) {
            console.error('Error generating drafts:', error)
            alert('Error al generar borradores')
        } finally {
            setGenerating(false)
        }
    }

    function handleEditDraft(invoice) {
        setEditingDraft(invoice.id)
        setDraftForm({
            discount_amount: invoice.frozen_snapshot?.discount_amount || 0,
            discount_reason: invoice.frozen_snapshot?.discount_reason || '',
        })
    }

    function handleCancelEdit() {
        setEditingDraft(null)
        setDraftForm({ discount_amount: 0, discount_reason: '' })
    }

    async function handleSaveDraft() {
        try {
            const invoice = invoices.find((inv) => inv.id === editingDraft)
            if (!invoice) return

            const baseOriginal = invoice.totals.base
            const discountAmount = parseFloat(draftForm.discount_amount) || 0
            const baseAfterDiscount = baseOriginal - discountAmount

            const ivaRate = invoice.client.contract_rules?.iva_rate || 10
            const retentionRate = invoice.client.contract_rules?.retention_rate || 2
            const ivaAmount = baseAfterDiscount * (ivaRate / 100)
            const retentionAmount = baseAfterDiscount * (retentionRate / 100)
            const total = baseAfterDiscount + ivaAmount - retentionAmount

            const { error } = await supabase
                .from('invoices')
                .update({
                    frozen_snapshot: {
                        ...invoice.frozen_snapshot,
                        discount_amount: discountAmount,
                        discount_reason: draftForm.discount_reason,
                    },
                    totals: {
                        base: baseOriginal,
                        discount_amount: discountAmount,
                        base_after_discount: baseAfterDiscount,
                        iva_rate: ivaRate,
                        iva_amount: ivaAmount,
                        retention_rate: retentionRate,
                        retention_amount: retentionAmount,
                        total: total,
                    },
                })
                .eq('id', editingDraft)

            if (error) throw error

            await loadInvoices()
            handleCancelEdit()
        } catch (error) {
            console.error('Error saving draft:', error)
            alert('Error al guardar borrador')
        }
    }

    async function issueInvoice(invoice) {
        if (!confirm('¿Emitir esta factura de forma definitiva? No se podrá editar después.'))
            return

        try {
            const client = invoice.client

            // Generar número base
            const baseNumber = `${client.initials}-${String(invoice.period_month).padStart(
                2,
                '0'
            )}-${invoice.period_year}`

            // Buscar facturas existentes con el mismo número base para evitar duplicados
            const { data: existingInvoices } = await supabase
                .from('invoices')
                .select('invoice_number')
                .like('invoice_number', `${baseNumber}%`)

            let invoiceNumber = baseNumber

            // Si ya existe, agregar un sufijo secuencial
            if (existingInvoices && existingInvoices.length > 0) {
                let counter = 1
                let foundUnique = false
                while (!foundUnique) {
                    const testNumber = `${baseNumber}-${counter}`
                    if (!existingInvoices.find(inv => inv.invoice_number === testNumber)) {
                        invoiceNumber = testNumber
                        foundUnique = true
                    } else {
                        counter++
                    }
                }
            }

            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'ISSUED',
                    invoice_number: invoiceNumber,
                })
                .eq('id', invoice.id)

            if (error) throw error

            await generatePDF({ ...invoice, invoice_number: invoiceNumber })

            await loadInvoices()
        } catch (error) {
            console.error('Error issuing invoice:', error)
            alert('Error al emitir factura: ' + (error.message || 'Error desconocido'))
        }
    }

    async function generatePDF(invoice, isPreview = false) {
        const doc = new jsPDF()

        // Cargar logo de manera asíncrona
        let logoData = null
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image()
                image.onload = () => resolve(image)
                image.onerror = reject
                image.src = '/logo.png'
            })

            // Crear canvas para convertir la imagen
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            logoData = canvas.toDataURL('image/png')
        } catch (e) {
            console.log('Logo no disponible, continuando sin logo')
        }

        // Cabecera moderna con colores - REDUCIDA para márgenes de impresión
        doc.setFillColor(59, 67, 113) // Navy color #3B4371
        doc.rect(0, 0, 210, 35, 'F')

        // Logo en la esquina superior izquierda (sobre el fondo navy)
        if (logoData) {
            try {
                doc.addImage(logoData, 'PNG', 10, 5, 22, 22)
            } catch (e) {
                console.log('Error al agregar logo al PDF')
            }
        }

        // FACTURA título en blanco
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(24)
        doc.setFont(undefined, 'bold')
        doc.text('FACTURA', 40, 20)

        // Información de la empresa (derecha, en blanco)
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.text('Ganadería Áureo', 205, 12, { align: 'right' })
        doc.text('NIF: 12345678Z', 205, 17, { align: 'right' })
        doc.text('León, España', 205, 22, { align: 'right' })
        doc.text('contacto@ganaderiaaureo.com', 205, 27, { align: 'right' })

        // Restaurar color de texto a negro
        doc.setTextColor(0, 0, 0)

        // Información del cliente (FACTURAR A)
        doc.setFontSize(8)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('FACTURAR A', 10, 45)

        doc.setFont(undefined, 'bold')
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.text(invoice.frozen_snapshot.client_name || invoice.client.fiscal_name, 10, 51)

        doc.setFont(undefined, 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`NIF: ${invoice.frozen_snapshot.client_nif || '-'}`, 10, 57)
        if (invoice.frozen_snapshot.client_address) {
            doc.text(invoice.frozen_snapshot.client_address, 10, 62)
        }

        // Número y fecha de factura (derecha)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(8)
        doc.text(`Nº Factura: ${invoice.invoice_number || 'BORRADOR'}`, 205, 45, { align: 'right' })
        doc.text(`Fecha: ${formatDate(new Date())}`, 205, 50, { align: 'right' })
        doc.text(`Periodo: ${String(invoice.period_month).padStart(2, '0')}/${invoice.period_year}`, 205, 55, { align: 'right' })

        // Tabla de productos con estilo moderno
        const tableData =
            invoice.frozen_snapshot.line_items?.map((item) => [
                item.crotal,
                formatCurrency(item.daily_rate),
                item.days,
                formatCurrency(item.row_total),
            ]) || []

        doc.autoTable({
            startY: 72,
            head: [['ANIMALES', 'PRECIO', 'CANT.', 'TOTAL']],
            body: tableData,
            theme: 'plain',
            headStyles: {
                fillColor: [59, 67, 113], // Navy
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left',
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [60, 60, 60],
            },
            alternateRowStyles: {
                fillColor: [245, 245, 250],
            },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { halign: 'right', cellWidth: 35 },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 35 },
            },
            margin: { left: 10, right: 10 },
        })

        // Sección de totales
        let finalY = doc.lastAutoTable.finalY + 12
        const leftX = 125

        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)

        doc.text('SUBTOTAL', leftX, finalY)
        doc.text(formatCurrency(invoice.totals.base), 200, finalY, { align: 'right' })
        finalY += 5

        doc.text(`IMPUESTO (${invoice.totals.iva_rate}%)`, leftX, finalY)
        doc.text(formatCurrency(invoice.totals.iva_amount), 200, finalY, { align: 'right' })
        finalY += 5

        if (invoice.totals.discount_amount > 0) {
            doc.text('DESCUENTO', leftX, finalY)
            doc.text(`-${formatCurrency(invoice.totals.discount_amount)}`, 200, finalY, {
                align: 'right',
            })
            finalY += 5
        }

        if (invoice.totals.retention_amount > 0) {
            doc.text(`RETENCIÓN (${invoice.totals.retention_rate}%)`, leftX, finalY)
            doc.text(`-${formatCurrency(invoice.totals.retention_amount)}`, 200, finalY, {
                align: 'right',
            })
            finalY += 7
        }

        // Total con fondo oscuro
        doc.setFillColor(59, 67, 113)
        doc.rect(leftX - 3, finalY - 4, 78, 8, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.text('TOTAL', leftX, finalY)
        doc.text(formatCurrency(invoice.totals.total), 200, finalY, { align: 'right' })

        // Nota de agradecimiento
        finalY += 15
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(9)
        doc.setFont(undefined, 'bold')
        doc.text('GRACIAS', 10, finalY)

        doc.setFont(undefined, 'normal')
        doc.setFontSize(7)
        finalY += 4
        doc.text('Gracias por su confianza. Para cualquier consulta no dude en contactarnos.', 10, finalY)

        if (isPreview) {
            window.open(doc.output('bloburl'), '_blank')
        } else {
            doc.save(`Factura_${invoice.invoice_number}.pdf`)
        }
    }

    async function handlePreview(invoice) {
        await generatePDF(invoice, true)
    }

    // Estado para los inputs del formulario de filtros
    const [filterForm, setFilterForm] = useState({
        client: 'all',
        invoiceNumber: '',
        dateFrom: '',
        dateTo: '',
    })

    // Estado para los filtros activos que realmente afectan a la lista
    const [activeFilters, setActiveFilters] = useState({
        client: 'all',
        invoiceNumber: '',
        dateFrom: '',
        dateTo: '',
    })

    // ... (logic for filtering uses activeFilters instead of searchFilters)

    function handleApplyFilters() {
        setActiveFilters(filterForm)
    }

    function handleClearFilters() {
        const resetState = { client: 'all', invoiceNumber: '', dateFrom: '', dateTo: '' }
        setFilterForm(resetState)
        setActiveFilters(resetState)
    }

    // Filtrar facturas (usando activeFilters)
    const filteredInvoices = invoices.filter((invoice) => {
        if (activeFilters.client !== 'all' && invoice.client_id !== activeFilters.client) return false

        if (activeFilters.invoiceNumber &&
            invoice.invoice_number &&
            !invoice.invoice_number.toLowerCase().includes(activeFilters.invoiceNumber.toLowerCase())) {
            return false
        }

        // Filtro por fecha (Periodo de Facturación vs Rango de Filtro)
        // Lógica de superposición (Overlap): El periodo de la factura cruza con el rango seleccionado
        if (activeFilters.dateFrom || activeFilters.dateTo) {
            let invoiceStart, invoiceEnd

            // Determinar fechas de la factura (Periodo o Creada)
            if (invoice.period_month && invoice.period_year) {
                // Inicio del periodo (día 1)
                invoiceStart = new Date(invoice.period_year, invoice.period_month - 1, 1)
                invoiceStart.setHours(0, 0, 0, 0)

                // Fin del periodo (último día del mes)
                invoiceEnd = new Date(invoice.period_year, invoice.period_month, 0)
                invoiceEnd.setHours(23, 59, 59, 999)
            } else {
                // Fallback a fecha de creación si no tiene periodo estructurado
                const createdDate = new Date(invoice.created_at)
                invoiceStart = new Date(createdDate)
                invoiceStart.setHours(0, 0, 0, 0)

                invoiceEnd = new Date(createdDate)
                invoiceEnd.setHours(23, 59, 59, 999)
            }

            // Normalizar filtros
            if (activeFilters.dateFrom) {
                const filterStart = new Date(activeFilters.dateFrom)
                filterStart.setHours(0, 0, 0, 0)
                // Si la factura termina antes de que empiece el filtro -> FUERA
                if (invoiceEnd < filterStart) return false
            }

            if (activeFilters.dateTo) {
                const filterEnd = new Date(activeFilters.dateTo)
                filterEnd.setHours(23, 59, 59, 999)
                // Si la factura empieza después de que acabe el filtro -> FUERA
                if (invoiceStart > filterEnd) return false
            }
        }

        return true
    })

    if (loading) {
        return <div className="p-8">Cargando facturas...</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>

                <div className="flex items-center gap-4">
                    {/* Selector de Periodo */}
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Periodo:</span>
                        <select
                            value={selectedPeriod.month}
                            onChange={(e) => setSelectedPeriod({ ...selectedPeriod, month: parseInt(e.target.value) })}
                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                            <option value={1}>Enero</option>
                            <option value={2}>Febrero</option>
                            <option value={3}>Marzo</option>
                            <option value={4}>Abril</option>
                            <option value={5}>Mayo</option>
                            <option value={6}>Junio</option>
                            <option value={7}>Julio</option>
                            <option value={8}>Agosto</option>
                            <option value={9}>Septiembre</option>
                            <option value={10}>Octubre</option>
                            <option value={11}>Noviembre</option>
                            <option value={12}>Diciembre</option>
                        </select>
                        <select
                            value={selectedPeriod.year}
                            onChange={(e) => setSelectedPeriod({ ...selectedPeriod, year: parseInt(e.target.value) })}
                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                            {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={generateDrafts}
                        disabled={generating}
                        className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                        {generating ? 'Generando...' : 'Generar Borradores'}
                    </button>
                </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="ml-3">
                        <p className="text-yellow-700">
                            Los borradores pueden editarse y previsualizarse. Una vez emitidos, quedan bloqueados.
                        </p>
                    </div>
                </div>
            </div>

            {/* Buscador de Facturas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Search className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Buscar Facturas</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                        <select
                            value={filterForm.client}
                            onChange={(e) => setFilterForm({ ...filterForm, client: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todos los clientes</option>
                            {Array.from(new Set(invoices.map(inv => inv.client_id))).map((clientId) => {
                                const invoice = invoices.find(inv => inv.client_id === clientId)
                                return (
                                    <option key={clientId} value={clientId}>
                                        {invoice?.client?.fiscal_name}
                                    </option>
                                )
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nº Factura</label>
                        <input
                            type="text"
                            value={filterForm.invoiceNumber}
                            onChange={(e) => setFilterForm({ ...filterForm, invoiceNumber: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                            placeholder="CC-01-2026"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filterForm.dateFrom}
                            onChange={(e) => setFilterForm({ ...filterForm, dateFrom: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filterForm.dateTo}
                            onChange={(e) => setFilterForm({ ...filterForm, dateTo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-between items-center bg-gray-50 -m-4 mt-4 p-3 rounded-b-xl border-t border-gray-100">
                    <span className="text-sm text-gray-500 ml-1">
                        Mostrando <strong>{filteredInvoices.length}</strong> de {invoices.length} facturas
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClearFilters}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="px-4 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Search className="w-3 h-3" />
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor de borrador */}
            {editingDraft && (
                <div className="bg-white rounded-xl shadow-sm border-2 border-brand-500 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Editar Borrador</h2>
                        <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descuento (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={draftForm.discount_amount}
                                onChange={(e) =>
                                    setDraftForm({ ...draftForm, discount_amount: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Motivo del Descuento
                            </label>
                            <input
                                type="text"
                                value={draftForm.discount_reason}
                                onChange={(e) =>
                                    setDraftForm({ ...draftForm, discount_reason: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleSaveDraft}
                            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Cambios
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Número
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Periodo
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No hay facturas que mostrar
                                </td>
                            </tr>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {invoice.invoice_number || 'BORRADOR'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {invoice.client?.fiscal_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {invoice.period_month}/{invoice.period_year}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {formatCurrency(invoice.totals?.total || 0)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'DRAFT'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}
                                        >
                                            {invoice.status === 'DRAFT' ? 'Borrador' : 'Emitida'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {invoice.status === 'DRAFT' ? (
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => handlePreview(invoice)}
                                                    className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                                                    title="Vista previa"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditDraft(invoice)}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => issueInvoice(invoice)}
                                                    className="text-brand-600 hover:text-brand-900 flex items-center gap-1"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => generatePDF(invoice, false)}
                                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
