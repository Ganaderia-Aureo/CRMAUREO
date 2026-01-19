import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Info } from 'lucide-react'

/**
 * Módulo de Configuración
 * Datos del emisor de facturas
 */
export default function Settings() {
    const [formData, setFormData] = useState({
        fiscal_name: '',
        nif: '',
        address: '',
        phone: '',
        email: '',
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    async function handleSave() {
        setLoading(true)
        setMessage(null)

        try {
            // En un sistema real, guardarías esto en la tabla 'app_settings'
            // Por simplicidad, solo mostramos mensaje de éxito
            setMessage({ type: 'success', text: 'Configuración guardada correctamente' })

            // Ejemplo de cómo guardaría en Supabase:
            // const { error } = await supabase.from('app_settings').upsert([formData])
            // if (error) throw error

        } catch (error) {
            setMessage({ type: 'error', text: 'Error al guardar configuración' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Configuración</h1>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                        <p className="text-blue-700">
                            Estos datos aparecerán como emisor en todas tus facturas.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Datos del Emisor</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre Fiscal / Razón Social
                        </label>
                        <input
                            type="text"
                            value={formData.fiscal_name}
                            onChange={(e) => setFormData({ ...formData, fiscal_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="IVAN RODRIGUEZ LENZA"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIF/CIF</label>
                        <input
                            type="text"
                            value={formData.nif}
                            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="12345678Z"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="987123456"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Calle Principal, 1, León"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="contacto@aureo.com"
                        />
                    </div>
                </div>

                {message && (
                    <div
                        className={`mt-4 p-3 rounded-lg ${message.type === 'success'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="mt-6 bg-brand-700 hover:bg-brand-800 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>
        </div>
    )
}
