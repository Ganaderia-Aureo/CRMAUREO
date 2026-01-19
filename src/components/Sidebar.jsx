import React from 'react'
import { Home, Users, Beef, FileText, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Barra lateral de navegación
 * Siempre visible en la aplicación principal
 */
export default function Sidebar({ currentView, onNavigate }) {
    const { signOut } = useAuth()

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'animals', label: 'Animales', icon: Beef },
        { id: 'invoices', label: 'Facturación', icon: FileText },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ]

    return (
        <div className="w-64 bg-brand-800 text-white h-screen flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-brand-700">
                <h1 className="text-xl font-bold">CRM Ganadería Áureo</h1>
                <p className="text-brand-200 text-sm mt-1">Sistema de Gestión</p>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentView === item.id

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-brand-700 text-white'
                                    : 'text-brand-100 hover:bg-brand-700/50'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-brand-700">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-100 hover:bg-brand-700/50 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    )
}
