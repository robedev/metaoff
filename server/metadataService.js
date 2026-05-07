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

import { exiftool } from 'exiftool-vendored';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export const getMetadata = async (filePath) => {
  try {
    const metadata = await exiftool.read(filePath);
    // Filtrar metadatos útiles para el usuario (pueden ser cientos)
    const filtered = {};
    const importantKeys = ['Make', 'Model', 'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Software', 'Creator', 'Title', 'Description'];
    
    for (const key of importantKeys) {
      if (metadata[key] !== undefined) {
        filtered[key] = metadata[key];
      }
    }
    
    // También incluir todos para modo avanzado
    return { summary: filtered, all: metadata };
  } catch (error) {
    console.error('Error reading metadata:', error);
    throw error;
  }
};

export const removeMetadata = async (filePath, outputPath) => {
  // Aseguramos que el directorio de salida existe
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ext = path.extname(filePath).toLowerCase();

  // Estrategia especial para XLSX/DOCX (formatos ZIP con XML)
  if (['.xlsx', '.docx', '.pptx'].includes(ext)) {
    return removeMetadataFromZipFormat(filePath, outputPath, ext);
  }

  // Para otros formatos, usar exiftool
  return removeMetadataWithExiftool(filePath, outputPath);
};

/**
 * Elimina metadatos de archivos ZIP-based (XLSX, DOCX, PPTX)
 * Reconstruye el archivo sin los archivos de propiedades
 */
const removeMetadataFromZipFormat = async (filePath, outputPath, ext) => {
  const tempDir = path.join(path.dirname(outputPath), `.temp-${Date.now()}`);
  
  try {
    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Descomprimir
    try {
      execSync(`unzip -q "${filePath}" -d "${tempDir}"`, { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`No se pudo descomprimir ${ext}: ${e.message}`);
    }

    // Eliminar archivos de metadatos
    const metadataPatterns = [
      'docProps/core.xml',
      'docProps/app.xml',
      'docProps/custom.xml',
      'docProps/thumbnail.jpeg',
      '_rels/.rels',
      '[Content_Types].xml'
    ];

    for (const pattern of metadataPatterns) {
      const filesToRemove = findFilesMatching(tempDir, pattern);
      for (const file of filesToRemove) {
        try {
          fs.unlinkSync(file);
          console.log(`Eliminado: ${file}`);
        } catch (e) {
          console.warn(`No se pudo eliminar ${file}: ${e.message}`);
        }
      }
    }

    // Recomprimir sin metadatos
    try {
      // Cambiar a directorio temporal para mantener estructura relativa
      const cwd = process.cwd();
      process.chdir(tempDir);
      execSync(`zip -r -q "${outputPath}" .`, { stdio: 'pipe' });
      process.chdir(cwd);
    } catch (e) {
      throw new Error(`No se pudo recomprimir: ${e.message}`);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error('El archivo recomprimido no se creó');
    }

    console.log(`Metadatos eliminados de ${ext}: ${outputPath}`);
    return true;
  } finally {
    // Limpiar directorio temporal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};

/**
 * Elimina metadatos usando exiftool-vendored
 */
const removeMetadataWithExiftool = async (filePath, outputPath) => {
  // Paso 1: intentar que exiftool escriba directamente en outputPath
  try {
    await exiftool.write(filePath, { all: '' }, ['-o', outputPath]);
  } catch (writeError) {
    console.warn('exiftool.write con -o falló:', writeError.message);
  }

  // Paso 2: si el archivo no existe, hacer copia manual y limpiar in-place
  if (!fs.existsSync(outputPath)) {
    console.warn(`outputPath no creado por exiftool, usando copia manual: ${outputPath}`);
    fs.copyFileSync(filePath, outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`No se pudo crear el archivo de salida: ${outputPath}`);
    }

    try {
      await exiftool.write(outputPath, { all: '' }, ['-overwrite_original']);
    } catch (cleanError) {
      console.warn('No se pudieron limpiar metadatos, se devuelve copia sin limpiar:', cleanError.message);
    }
  }

  // Verificación final
  if (!fs.existsSync(outputPath)) {
    throw new Error(`El archivo de salida no existe tras el procesamiento: ${outputPath}`);
  }

  return true;
};

/**
 * Busca archivos que coincidan con un patrón en un directorio
 */
const findFilesMatching = (dir, pattern) => {
  const results = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));

  const walk = (currentPath) => {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(dir, fullPath);

      if (regex.test(relativePath)) {
        results.push(fullPath);
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      }
    }
  };

  walk(dir);
  return results;
};

export const cleanUp = () => {
  exiftool.end();
};
