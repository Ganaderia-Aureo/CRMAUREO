import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { TrendingUp, Users, Beef, FileText, AlertCircle } from 'lucide-react'

/**
 * Dashboard Principal
 * Muestra KPIs y alertas del negocio
 */
export default function Dashboard({ onNavigate }) {
    const [stats, setStats] = useState({
        activeAnimals: 0,
        totalClients: 0,
        pendingInvoices: 0,
        projectedRevenue: 0,
    })
    const [loading, setLoading] = useState(true)
    const [alert, setAlert] = useState(null)

    useEffect(() => {
        loadDashboardData()
        checkMonthlyAlert()
    }, [])

    async function loadDashboardData() {
        try {
            // Contar animales activos (excluyendo soft-deleted)
            const { count: animalCount } = await supabase
                .from('animals')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ACTIVE')
                .is('deleted_at', null)

            // Contar clientes (excluyendo soft-deleted)
            const { count: clientCount } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .is('deleted_at', null)

            // Contar facturas en borrador del mes actual
            const currentDate = new Date()
            const { count: draftCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'DRAFT')
                .eq('period_month', currentDate.getMonth() + 1)
                .eq('period_year', currentDate.getFullYear())

            // Calcular proyección REAL basada en tarifas por cliente
            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
            let projected = 0

            const { data: clientsWithRates } = await supabase
                .from('clients')
                .select('id, contract_rules')
                .is('deleted_at', null)

            if (clientsWithRates) {
                for (const client of clientsWithRates) {
                    const { count: clientAnimals } = await supabase
                        .from('animals')
                        .select('*', { count: 'exact', head: true })
                        .eq('client_id', client.id)
                        .eq('status', 'ACTIVE')
                        .is('deleted_at', null)

                    const rate = client.contract_rules?.daily_rate || 2.5
                    projected += (clientAnimals || 0) * rate * daysInMonth
                }
            }

            setStats({
                activeAnimals: animalCount || 0,
                totalClients: clientCount || 0,
                pendingInvoices: draftCount || 0,
                projectedRevenue: projected,
            })
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    function checkMonthlyAlert() {
        const today = new Date()
        if (today.getDate() === 1) {
            setAlert({
                type: 'warning',
                message: '¡Inicio de mes! Recuerda generar los borradores de facturación',
                action: () => onNavigate('invoices')
            })
        }
    }

    const kpis = [
        {
            label: 'Animales Activos',
            value: stats.activeAnimals,
            icon: Beef,
            color: 'bg-blue-500',
        },
        {
            label: 'Clientes Totales',
            value: stats.totalClients,
            icon: Users,
            color: 'bg-purple-500',
        },
        {
            label: 'Facturas Pendientes',
            value: stats.pendingInvoices,
            icon: FileText,
            color: 'bg-orange-500',
        },
        {
            label: 'Proyección Mensual',
            value: formatCurrency(stats.projectedRevenue),
            icon: TrendingUp,
            color: 'bg-green-500',
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Cargando dashboard...</div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            {/* Alerta */}
            {alert && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="ml-3 flex-1">
                            <p className="text-yellow-700 font-medium">{alert.message}</p>
                            {alert.action && (
                                <button
                                    onClick={alert.action}
                                    className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
                                >
                                    Ir a Facturación
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, index) => {
                    const Icon = kpi.icon
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${kpi.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm font-medium">{kpi.label}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Información adicional */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Bienvenido al CRM Ganadería Áureo</h2>
                <p className="text-gray-600">
                    Sistema de gestión integral para tu explotación ganadera. Utiliza el menú lateral para navegar entre las diferentes secciones.
                </p>
            </div>
        </div>
    )
}
