import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Info, Save } from 'lucide-react'

/**
 * Módulo de Configuración
 * Datos del emisor de facturas - Conectado con Supabase app_settings
 */
export default function Settings() {
    const [formData, setFormData] = useState({
        fiscal_name: '',
        nif: '',
        address: '',
        phone: '',
        email: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'emisor')
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (data?.value) {
                setFormData({
                    fiscal_name: data.value.fiscal_name || '',
                    nif: data.value.nif || '',
                    address: data.value.address || '',
                    phone: data.value.phone || '',
                    email: data.value.email || '',
                })
            }
        } catch (error) {
            console.error('Error loading settings:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)

        try {
            if (!formData.fiscal_name || !formData.nif) {
                setMessage({ type: 'error', text: 'El nombre fiscal y NIF son obligatorios' })
                setSaving(false)
                return
            }

            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'emisor',
                    value: formData,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'key' })

            if (error) throw error

            setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
        } catch (error) {
            console.error('Error saving settings:', error)
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8">Cargando configuración...</div>
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
                            Nombre Fiscal / Razón Social *
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIF/CIF *</label>
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
                    disabled={saving}
                    className="mt-6 flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>
        </div>
    )
}
