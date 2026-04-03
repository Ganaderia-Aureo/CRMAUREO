import React from 'react'
import { Home, Users, Beef, FileText, Settings, ClipboardList } from 'lucide-react'

const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'animals', label: 'Animales', icon: Beef },
    { id: 'invoices', label: 'Facturas', icon: FileText },
    { id: 'settings', label: 'Config', icon: Settings },
    { id: 'auditlog', label: 'Auditoría', icon: ClipboardList },
]

export default function BottomNav({ currentView, onNavigate }) {
    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-800 border-t border-brand-700 z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex">
                {menuItems.map(({ id, label, icon: Icon }) => {
                    const isActive = currentView === id
                    return (
                        <button
                            key={id}
                            onClick={() => onNavigate(id)}
                            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-w-0 transition-colors ${
                                isActive
                                    ? 'text-white'
                                    : 'text-brand-300 active:text-brand-100'
                            }`}
                        >
                            <div className={`relative flex items-center justify-center w-8 h-6 rounded-full transition-colors ${
                                isActive ? 'bg-brand-700' : ''
                            }`}>
                                <Icon className="w-4 h-4 shrink-0" />
                            </div>
                            <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">
                                {label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
