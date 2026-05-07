# MetaOff

Aplicación web para eliminar metadatos de archivos y proteger tu privacidad digital.

## Descripción

MetaOff permite subir archivos, analizar sus metadatos (información oculta como ubicación GPS, dispositivo usado, fecha de creación, etc.) y limpiarlos para compartir archivos de forma segura sin exponer información personal.

## Tecnologías

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + exiftool-vendored

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
# Instalar dependencias del servidor
cd server && npm install

# Instalar dependencias del cliente
cd client && npm install
```

## Uso

```bash
# Iniciar el servidor (puerto 3001)
cd server && npm run dev

# Iniciar el cliente (puerto 5173)
cd client && npm run dev
```

Luego abre `http://localhost:5173` en tu navegador.

## Características

- Subida de múltiples archivos (arrastrar o hacer clic)
- Análisis de metadatos antes de limpiar
- Limpieza de metadatos de imágenes, PDFs y otros formatos
- Descarga de archivos limpios
- Tema claro/oscuro
- Interfaz en español