# CRMAUREO

## Instrucciones de configuración

### 1. Instalar dependencias
Abre PowerShell/CMD en la carpeta CRMAUREO y ejecuta:
```bash
npm install
```

### 2. Configurar Supabase
Edita el archivo `src/lib/supabase.js` y reemplaza:
- `TU_URL_DE_SUPABASE` con tu Project URL
- `TU_CLAVE_PUBLICA_DE_SUPABASE` con tu anon/public key

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Estructura del Proyecto
- `src/components/` - Componentes de UI (Dashboard, Clientes, Animales, etc.)
- `src/contexts/` - Contextos de React (Autenticación)
- `src/lib/` - Utilidades y configuración (Supabase, formatters)

## Próximos pasos
1. Crear proyecto en Supabase
2. Ejecutar schema SQL para crear tablas
3. Configurar las credenciales
4. Probar la aplicación
