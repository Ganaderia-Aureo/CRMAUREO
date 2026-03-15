import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { Clock, Filter, Search } from 'lucide-react'

/**
 * Módulo de Registro de Auditoría
 * Muestra el historial de cambios en el sistema
 */
export default function AuditLog() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        table: 'all',
        action: 'all',
        search: '',
    })
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 50

    useEffect(() => {
        loadLogs()
    }, [page])

    async function loadLogs() {
        setLoading(true)
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

            if (filters.table !== 'all') {
                query = query.eq('table_name', filters.table)
            }
            if (filters.action !== 'all') {
                query = query.eq('action', filters.action)
            }

            const { data, error } = await query
            if (error) throw error
            setLogs(data || [])
        } catch (error) {
            console.error('Error loading audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleApplyFilters() {
        setPage(0)
        loadLogs()
    }

    function getActionBadge(action) {
        const badges = {
            INSERT: 'bg-green-100 text-green-800',
            UPDATE: 'bg-blue-100 text-blue-800',
            DELETE: 'bg-red-100 text-red-800',
        }
        return badges[action] || 'bg-gray-100 text-gray-800'
    }

    function getActionLabel(action) {
        const labels = { INSERT: 'Creación', UPDATE: 'Modificación', DELETE: 'Eliminación' }
        return labels[action] || action
    }

    function getTableLabel(table) {
        const labels = {
            animals: 'Animales',
            clients: 'Clientes',
            invoices: 'Facturas',
            app_settings: 'Configuración',
        }
        return labels[table] || table
    }

    function getRecordSummary(log) {
        const data = log.new_data || log.old_data
        if (!data) return '-'

        if (log.table_name === 'animals') return data.crotal || '-'
        if (log.table_name === 'clients') return data.fiscal_name || '-'
        if (log.table_name === 'invoices') return data.invoice_number || 'Borrador'
        if (log.table_name === 'app_settings') return data.key || '-'
        return '-'
    }

    // Filtrar por búsqueda de texto (client-side para simplificar)
    const filteredLogs = logs.filter((log) => {
        if (!filters.search) return true
        const summary = getRecordSummary(log).toLowerCase()
        return summary.includes(filters.search.toLowerCase())
    })

    if (loading && logs.length === 0) {
        return <div className="p-8">Cargando historial de auditoría...</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Historial de Auditoría</h1>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Filtros</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tabla</label>
                        <select
                            value={filters.table}
                            onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todas</option>
                            <option value="animals">Animales</option>
                            <option value="clients">Clientes</option>
                            <option value="invoices">Facturas</option>
                            <option value="app_settings">Configuración</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="all">Todas</option>
                            <option value="INSERT">Creaciones</option>
                            <option value="UPDATE">Modificaciones</option>
                            <option value="DELETE">Eliminaciones</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Buscar registro</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                placeholder="Crotal, nombre..."
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex justify-end">
                    <button
                        onClick={handleApplyFilters}
                        className="px-4 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                    >
                        Aplicar
                    </button>
                </div>
            </div>

            {/* Tabla de logs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Fecha/Hora
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Acción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Tabla
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Registro
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                    No hay registros de auditoría
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(log.created_at).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadge(
                                                log.action
                                            )}`}
                                        >
                                            {getActionLabel(log.action)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {getTableLabel(log.table_name)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {getRecordSummary(log)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                    Página {page + 1} — Mostrando {filteredLogs.length} registros
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                        Anterior
                    </button>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={logs.length < PAGE_SIZE}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    )
}
