/**
 * MetaOff - Aplicación para eliminar metadatos
 * Copyright (C) 2026 RoberDev
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getMetadata, removeMetadata } from './metadataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Configuración de Multer para almacenamiento temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Memoria temporal para rastrear archivos (en producción usar DB)
const filesMap = new Map();

// Endpoint: Subir archivo y analizar metadatos
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const fileId = uuidv4();
    const metadata = await getMetadata(req.file.path);

    filesMap.set(fileId, {
      id: fileId,
      originalName: req.file.originalname,
      path: req.file.path,
      metadata: metadata,
      status: 'analyzed'
    });

    res.json({ id: fileId, originalName: req.file.originalname, metadata });
  } catch (error) {
    console.error('Error in /upload:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

// Endpoint: Limpiar metadatos
app.post('/api/clean/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileData = filesMap.get(id);

    if (!fileData) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const cleanFileName = `clean-${path.basename(fileData.path)}`;
    const outputPath = path.join(__dirname, 'uploads', cleanFileName);

    // Limpiar metadatos
    await removeMetadata(fileData.path, outputPath);

    // Verificar metadatos antes y después
    const metadatasBefore = fileData.metadata.all;
    const metadatasAfter = await getMetadata(outputPath);

    // Contar campos eliminados
    const fieldsBefore = Object.keys(metadatasBefore).length;
    const fieldsAfter = Object.keys(metadatasAfter.all).length;
    const fieldsRemoved = fieldsBefore - fieldsAfter;

    console.log(`Limpieza completada: ${fieldsBefore} → ${fieldsAfter} campos (${fieldsRemoved} eliminados)`);

    const updatedData = {
      ...fileData,
      cleanPath: outputPath,
      cleanMetadata: metadatasAfter,
      status: 'cleaned',
      cleaningReport: {
        fieldsBefore,
        fieldsAfter,
        fieldsRemoved,
        successRate: fieldsBefore > 0 ? Math.round((fieldsRemoved / fieldsBefore) * 100) : 100
      }
    };
    
    filesMap.set(id, updatedData);
    console.log(`Archivo limpiado y actualizado en Map. ID: ${id}, CleanPath: ${outputPath}`);

    res.json({ 
      id, 
      status: 'cleaned', 
      metadata: metadatasAfter,
      report: updatedData.cleaningReport
    });
  } catch (error) {
    console.error('Error in /clean:', error);
    res.status(500).json({ error: `Error al limpiar metadatos: ${error.message}` });
  }
});

// Endpoint: Descargar archivo limpio
app.get('/api/download/:id', (req, res) => {
  const { id } = req.params;
  const fileData = filesMap.get(id);

  console.log(`Intento de descarga para ID: ${id}`);
  
  if (!fileData) {
    console.error(`Descarga fallida: ID ${id} no encontrado en filesMap`);
    return res.status(404).json({ error: 'Archivo no encontrado en el sistema' });
  }

  if (!fileData.cleanPath) {
    console.error(`Descarga fallida: cleanPath no definido para ID ${id}. Status: ${fileData.status}`);
    return res.status(404).json({ error: 'Archivo limpio no disponible todavía' });
  }

  if (!fs.existsSync(fileData.cleanPath)) {
    console.error(`Descarga fallida: El archivo físico no existe en ${fileData.cleanPath}`);
    return res.status(404).json({ error: 'El archivo físico fue eliminado del servidor' });
  }

  // Añadir cabeceras de seguridad y CORS para evitar bloqueo del navegador
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', `attachment; filename="clean-${fileData.originalName}"`);
  
  res.download(fileData.cleanPath, `clean-${fileData.originalName}`);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
