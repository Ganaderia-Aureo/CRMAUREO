import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { Plus, Edit, Trash2, Save, X, Filter, Download, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Módulo de Gestión de Animales MEJORADO
 * CRUD con filtros avanzados y exportación PDF
 */
export default function Animals() {
    const [animals, setAnimals] = useState([])
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(null)

    // Filtros mejorados
    const [filters, setFilters] = useState({
        client: 'all',
        status: 'all',
        reproStatus: 'all',
        crotal: '',
        dateFrom: '',
        dateTo: '',
    })

    const [formData, setFormData] = useState({
        crotal: '',
        client_id: '',
        birth_date: '',
        entry_date: '',
        exit_date: '', // Fecha opcional
        status: 'ACTIVE',
        repro_status: 'EMPTY',
        repro_data: {
            insem_1_date: '',
            insem_1_bull: '',
            insem_2_date: '',
            insem_2_bull: '',
        },
        observations: '',
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .order('fiscal_name')

            const { data: animalsData } = await supabase
                .from('animals')
                .select(`
          *,
          client:clients(fiscal_name, initials)
        `)
                .order('crotal')

            setClients(clientsData || [])
            setAnimals(animalsData || [])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleNew() {
        setEditing('new')
        setFormData({
            crotal: '',
            client_id: clients[0]?.id || '',
            birth_date: '',
            entry_date: '',
            exit_date: '',
            status: 'ACTIVE',
            repro_status: 'EMPTY',
            repro_data: {
                insem_1_date: '',
                insem_1_bull: '',
                insem_2_date: '',
                insem_2_bull: '',
            },
            observations: '',
        })
    }

    function handleEdit(animal) {
        setEditing(animal.id)
        setFormData({
            ...animal,
            exit_date: animal.exit_date || '', // Asegurar que sea cadena vacía si es null
            repro_data: animal.repro_data || {
                insem_1_date: '',
                insem_1_bull: '',
                insem_2_date: '',
                insem_2_bull: '',
            },
        })
    }

    function handleCancel() {
        setEditing(null)
    }

    async function handleSave() {
        try {
            if (!formData.crotal || !formData.client_id) {
                alert('El crotal y cliente son obligatorios')
                return
            }

            // Lógica automática: cambio de estado reproductivo
            let updatedReproStatus = formData.repro_status
            if (
                formData.repro_status === 'EMPTY' &&
                formData.repro_data.insem_1_date
            ) {
                updatedReproStatus = 'INSEMINATED'
            }

            // Convertir exit_date vacío a null para la base de datos
            const dataToSave = {
                ...formData,
                exit_date: formData.exit_date || null,
                repro_status: updatedReproStatus,
            }

            if (editing === 'new') {
                const { error } = await supabase.from('animals').insert([dataToSave])
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('animals')
                    .update(dataToSave)
                    .eq('id', editing)
                if (error) throw error
            }

            await loadData()
            handleCancel()
        } catch (error) {
            console.error('Error saving animal:', error)
            alert('Error al guardar animal: ' + error.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Estás seguro de eliminar este animal?')) return

        try {
            const { error } = await supabase.from('animals').delete().eq('id', id)
            if (error) throw error
            await loadData()
        } catch (error) {
            console.error('Error deleting animal:', error)
            alert('Error al eliminar animal')
        }
    }

    // Filtrar animales con múltiples criterios
    const filteredAnimals = animals.filter((animal) => {
        if (filters.client !== 'all' && animal.client_id !== filters.client) return false
        if (filters.status !== 'all' && animal.status !== filters.status) return false
        if (filters.reproStatus !== 'all' && animal.repro_status !== filters.reproStatus) return false

        // Búsqueda por crotal (parcial)
        if (filters.crotal && !animal.crotal.toLowerCase().includes(filters.crotal.toLowerCase())) {
            return false
        }

        // Filtro por rango de fechas (entrada)
        if (filters.dateFrom && animal.entry_date < filters.dateFrom) return false
        if (filters.dateTo && animal.entry_date > filters.dateTo) return false

        return true
    })

    function exportToPDF() {
        const doc = new jsPDF('landscape')

        // Título
        doc.setFontSize(16)
        doc.text('Listado de Animales - Ganadería Áureo', 15, 15)

        doc.setFontSize(10)
        doc.text(`Generado: ${formatDate(new Date())}`, 15, 22)
        doc.text(`Total: ${filteredAnimals.length} animales`, 15, 27)

        // Preparar datos de la tabla
        const tableData = filteredAnimals.map((animal) => [
            animal.crotal,
            animal.client?.initials || '-',
            formatDate(animal.entry_date),
            formatDate(animal.exit_date),
            animal.status,
            animal.repro_status,
            animal.observations || '-',
        ])

        // Tabla con autotable
        doc.autoTable({
            startY: 32,
            head: [['Crotal', 'Cliente', 'Entrada', 'Salida', 'Estado', 'Repro', 'Observaciones']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 163, 74] },
        })

        doc.save(`Listado_Animales_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    function getStatusBadge(status) {
        const badges = {
            ACTIVE: 'bg-green-100 text-green-800',
            SOLD: 'bg-blue-100 text-blue-800',
            DECEASED: 'bg-red-100 text-red-800',
            HISTORIC: 'bg-gray-100 text-gray-800',
        }
        return badges[status] || badges.ACTIVE
    }

    function getReproStatusBadge(status) {
        const badges = {
            EMPTY: 'bg-gray-100 text-gray-800',
            INSEMINATED: 'bg-yellow-100 text-yellow-800',
            PREGNANT: 'bg-blue-100 text-blue-800',
        }
        return badges[status] || badges.EMPTY
    }

    if (loading) {
        return <div className="p-8">Cargando animales...</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Animales</h1>
                <div className="flex gap-2">
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        Exportar PDF
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Animal
                    </button>
                </div>
            </div>

            {/* Filtros Avanzados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Filtros Avanzados</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Búsqueda por Crotal */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Crotal</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={filters.crotal}
                                onChange={(e) => setFilters({ ...filters, crotal: e.target.value })}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                placeholder="ES123..."
                            />
                        </div>
                    </div>

                    {/* Cliente */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                        <select
                            value={filters.client}
                            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todos</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.initials}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todos</option>
                            <option value="ACTIVE">Activos</option>
                            <option value="SOLD">Vendidos</option>
                            <option value="DECEASED">Fallecidos</option>
                            <option value="HISTORIC">Históricos</option>
                        </select>
                    </div>

                    {/* Estado Reproductivo */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Repro</label>
                        <select
                            value={filters.reproStatus}
                            onChange={(e) => setFilters({ ...filters, reproStatus: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todos</option>
                            <option value="EMPTY">Vacía</option>
                            <option value="INSEMINATED">Inseminada</option>
                            <option value="PREGNANT">Preñada</option>
                        </select>
                    </div>

                    {/* Fecha Desde */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        />
                    </div>

                    {/* Fecha Hasta */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Mostrando <strong>{filteredAnimals.length}</strong> de {animals.length} animales
                    </span>
                    <button
                        onClick={() => setFilters({ client: 'all', status: 'all', reproStatus: 'all', crotal: '', dateFrom: '', dateTo: '' })}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {/* Formulario */}
            {editing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editing === 'new' ? 'Nuevo Animal' : 'Editar Animal'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Crotal (ID Oficial) *
                            </label>
                            <input
                                type="text"
                                value={formData.crotal}
                                onChange={(e) => setFormData({ ...formData, crotal: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="ES123456789012"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                            <select
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.fiscal_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Nacimiento
                            </label>
                            <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Entrada
                            </label>
                            <input
                                type="date"
                                value={formData.entry_date}
                                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Salida (Opcional)
                            </label>
                            <input
                                type="date"
                                value={formData.exit_date}
                                onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="ACTIVE">Activo</option>
                                <option value="SOLD">Vendido</option>
                                <option value="DECEASED">Fallecido</option>
                                <option value="HISTORIC">Histórico</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado Reproductivo
                            </label>
                            <select
                                value={formData.repro_status}
                                onChange={(e) => setFormData({ ...formData, repro_status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="EMPTY">Vacía</option>
                                <option value="INSEMINATED">Inseminada</option>
                                <option value="PREGNANT">Preñada</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Inseminación 1 - Fecha
                            </label>
                            <input
                                type="date"
                                value={formData.repro_data.insem_1_date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        repro_data: { ...formData.repro_data, insem_1_date: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Inseminación 1 - Toro
                            </label>
                            <input
                                type="text"
                                value={formData.repro_data.insem_1_bull}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        repro_data: { ...formData.repro_data, insem_1_bull: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Código del toro"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea
                                value={formData.observations}
                                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows="3"
                                placeholder="Notas adicionales..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg"
                        >
                            <Save className="w-4 h-4" />
                            Guardar
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de animales */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Crotal
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Entrada
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Salida
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Reproductivo
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAnimals.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                    No hay animales que mostrar
                                </td>
                            </tr>
                        ) : (
                            filteredAnimals.map((animal) => (
                                <tr key={animal.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {animal.crotal}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {animal.client?.initials || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(animal.entry_date)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(animal.exit_date)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                                                animal.status
                                            )}`}
                                        >
                                            {animal.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReproStatusBadge(
                                                animal.repro_status
                                            )}`}
                                        >
                                            {animal.repro_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(animal)}
                                            className="text-brand-600 hover:text-brand-900 mr-3"
                                        >
                                            <Edit className="w-4 h-4 inline" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(animal.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-4 h-4 inline" />
                                        </button>
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
