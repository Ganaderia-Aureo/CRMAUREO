import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Animals from './components/Animals'
import Invoices from './components/Invoices'
import Settings from './components/Settings'
import AuditLog from './components/AuditLog'
import { Toaster } from 'react-hot-toast'
import './index.css'

/**
 * Componente Principal de la Aplicación
 * Maneja routing y autenticación
 */
function AppContent() {
    const { user, loading } = useAuth()
    const [currentView, setCurrentView] = useState('dashboard')

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-gray-600">Cargando...</div>
            </div>
        )
    }

    if (!user) {
        return <Login />
    }

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard onNavigate={setCurrentView} />
            case 'clients':
                return <Clients />
            case 'animals':
                return <Animals />
            case 'invoices':
                return <Invoices />
            case 'settings':
                return <Settings />
            case 'auditlog':
                return <AuditLog />
            default:
                return <Dashboard onNavigate={setCurrentView} />
        }
    }

    return (
        <div className="flex h-screen bg-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <Sidebar currentView={currentView} onNavigate={setCurrentView} />
            <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{renderView()}</main>
            <BottomNav currentView={currentView} onNavigate={setCurrentView} />
        </div>
    )
}

/**
 * App Root con Provider de Autenticación
 */
function App() {
    return (
        <AuthProvider>
            <AppContent />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
    )
}

export default App
