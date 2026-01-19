import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateInitials } from '../lib/utils'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

/**
 * Módulo de Gestión de Clientes
 * CRUD completo con generación automática de iniciales
 */
export default function Clients() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(null) // ID del cliente en edición, null si creando nuevo
    const [formData, setFormData] = useState({
        fiscal_name: '',
        nif: '',
        email: '',
        phone: '',
        address: '',
        initials: '',
        contract_rules: {
            daily_rate: 2.5,
            iva_rate: 10,
            retention_rate: 2,
            charge_entry_day: true,
            charge_exit_day: false,
        },
    })

    useEffect(() => {
        loadClients()
    }, [])

    async function loadClients() {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('fiscal_name')

            if (error) throw error
            setClients(data || [])
        } catch (error) {
            console.error('Error loading clients:', error)
            alert('Error al cargar clientes')
        } finally {
            setLoading(false)
        }
    }

    function handleNew() {
        setEditing('new')
        setFormData({
            fiscal_name: '',
            nif: '',
            email: '',
            phone: '',
            address: '',
            initials: '',
            contract_rules: {
                daily_rate: 2.5,
                iva_rate: 10,
                retention_rate: 2,
                charge_entry_day: true,
                charge_exit_day: false,
            },
        })
    }

    function handleEdit(client) {
        setEditing(client.id)
        setFormData(client)
    }

    function handleCancel() {
        setEditing(null)
        setFormData({
            fiscal_name: '',
            nif: '',
            email: '',
            phone: '',
            address: '',
            initials: '',
            contract_rules: {
                daily_rate: 2.5,
                iva_rate: 10,
                retention_rate: 2,
                charge_entry_day: true,
                charge_exit_day: false,
            },
        })
    }

    async function handleSave() {
        try {
            // Validación básica
            if (!formData.fiscal_name || !formData.nif) {
                alert('El nombre fiscal y NIF son obligatorios')
                return
            }

            if (editing === 'new') {
                // Crear nuevo cliente
                const { error } = await supabase.from('clients').insert([formData])
                if (error) throw error
            } else {
                // Actualizar cliente existente
                const { error } = await supabase
                    .from('clients')
                    .update(formData)
                    .eq('id', editing)
                if (error) throw error
            }

            await loadClients()
            handleCancel()
        } catch (error) {
            console.error('Error saving client:', error)
            alert('Error al guardar cliente: ' + error.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return

        try {
            const { error } = await supabase.from('clients').delete().eq('id', id)
            if (error) throw error
            await loadClients()
        } catch (error) {
            console.error('Error deleting client:', error)
            alert('Error al eliminar cliente')
        }
    }

    // Auto-generar iniciales cuando cambie el nombre
    function handleNameChange(e) {
        const name = e.target.value
        setFormData({
            ...formData,
            fiscal_name: name,
            initials: generateInitials(name),
        })
    }

    if (loading) {
        return <div className="p-8">Cargando clientes...</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Cliente
                </button>
            </div>

            {/* Formulario de creación/edición */}
            {editing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editing === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Fiscal *
                            </label>
                            <input
                                type="text"
                                value={formData.fiscal_name}
                                onChange={handleNameChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="Casa Castro S.L."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NIF *</label>
                            <input
                                type="text"
                                value={formData.nif}
                                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="B12345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="contacto@casacastro.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="987123456"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="Calle Principal, 123, León"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Iniciales (3 caracteres)
                            </label>
                            <input
                                type="text"
                                value={formData.initials}
                                onChange={(e) =>
                                    setFormData({ ...formData, initials: e.target.value.toUpperCase().substring(0, 3) })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                maxLength={3}
                                placeholder="CC"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tarifa Diaria (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.contract_rules.daily_rate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contract_rules: {
                                            ...formData.contract_rules,
                                            daily_rate: parseFloat(e.target.value),
                                        },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
                            <input
                                type="number"
                                value={formData.contract_rules.iva_rate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contract_rules: {
                                            ...formData.contract_rules,
                                            iva_rate: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Retención (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.contract_rules.retention_rate || 2}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contract_rules: {
                                            ...formData.contract_rules,
                                            retention_rate: parseFloat(e.target.value),
                                        },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.contract_rules.charge_entry_day}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            contract_rules: {
                                                ...formData.contract_rules,
                                                charge_entry_day: e.target.checked,
                                            },
                                        })
                                    }
                                    className="w-4 h-4 text-brand-600"
                                />
                                <span className="text-sm text-gray-700">Cobrar día entrada</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.contract_rules.charge_exit_day}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            contract_rules: {
                                                ...formData.contract_rules,
                                                charge_exit_day: e.target.checked,
                                            },
                                        })
                                    }
                                    className="w-4 h-4 text-brand-600"
                                />
                                <span className="text-sm text-gray-700">Cobrar día salida</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Guardar
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Listado de clientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Iniciales
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nombre Fiscal
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                NIF
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarifa
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {clients.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No hay clientes creados. Haz clic en "Nuevo Cliente" para empezar.
                                </td>
                            </tr>
                        ) : (
                            clients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                                            {client.initials}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {client.fiscal_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{client.nif}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div>{client.email}</div>
                                        <div className="text-gray-400">{client.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                        {client.contract_rules?.daily_rate || '-'} €/día
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(client)}
                                            className="text-brand-600 hover:text-brand-900 mr-3"
                                        >
                                            <Edit className="w-4 h-4 inline" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(client.id)}
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
