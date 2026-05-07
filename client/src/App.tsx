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

import { useState, useRef, useEffect } from 'react'

interface MetadataSummary {
  [key: string]: any;
}

interface FileItem {
  id: string;
  originalName: string;
  status: 'analyzed' | 'cleaning' | 'cleaned';
  metadata: {
    summary: MetadataSummary;
    all: any;
  };
  cleaningReport?: {
    fieldsBefore: number;
    fieldsAfter: number;
    fieldsRemoved: number;
    successRate: number;
  };
}

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<MetadataSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    
    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: formData,
        });
        return await response.json();
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const validResults = results.filter(r => r !== null);
      setFiles(prev => [...prev, ...validResults.map(r => ({ ...r, status: 'analyzed' }))]);
    } catch (error) {
      alert('Error al subir algunos archivos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClean = async (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'cleaning' } : f));

    try {
      const response = await fetch(`http://localhost:3001/api/clean/${id}`, {
        method: 'POST',
      });
      const data = await response.json();
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'cleaned', 
        metadata: data.metadata,
        cleaningReport: data.report
      } : f));
    } catch (error) {
      console.error('Error cleaning file:', error);
      alert('Error al limpiar metadatos');
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'analyzed' } : f));
    }
  };

  const handleCleanAll = async () => {
    const analyzedFiles = files.filter(f => f.status === 'analyzed');
    for (const file of analyzedFiles) {
      await handleClean(file.id);
    }
  };

  const handleDownload = async (id: string, originalName: string) => {
    try {
      console.log(`Iniciando descarga para ID: ${id}`);
      const response = await fetch(`http://localhost:3001/api/download/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor' }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clean-${originalName}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log('Descarga completada con éxito');
    } catch (error: any) {
      console.error('Download error:', error);
      alert(`No se pudo descargar el archivo: ${error.message}`);
    }
  };

  const getFileEmoji = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return '🎥';
    if (['docx', 'doc', 'txt'].includes(ext || '')) return '📝';
    return '📁';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      // Reutilizamos la lógica de subida enviando un objeto similar al evento de input
      const mockEvent = {
        target: { files: droppedFiles }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleUpload(mockEvent);
    }
  };

  return (
    <div className="container">
      <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <header>
        <h1>MetaOff</h1>
        <p>Seguridad y privacidad para tus archivos digitales.</p>
      </header>

      <div 
        className={`dropzone ${isUploading ? 'active' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDrop={handleDrop}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
          {isUploading ? '⚙️' : '📤'}
        </div>
        <h2>{isUploading ? 'Procesando...' : 'Suelta tus archivos aquí'}</h2>
        <p style={{ color: 'var(--text-light)' }}>
          Haz clic para explorar tus carpetas o arrastra archivos directamente.
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleUpload} 
          multiple
        />
      </div>

      {files.length > 0 && (
        <div className="file-list-header">
          <h3 style={{ fontSize: '1.25rem' }}>Archivos ({files.length})</h3>
          <button 
            className="btn-primary" 
            onClick={handleCleanAll}
            disabled={!files.some(f => f.status === 'analyzed') || isUploading}
          >
            🧹 Limpiar Todos
          </button>
        </div>
      )}

      <div className="file-list">
        {files.map((file, index) => (
          <div key={file.id} className="file-card" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="file-icon">
              {getFileEmoji(file.originalName)}
            </div>
            
            <div className="file-info">
              <span className="file-name">{file.originalName}</span>
              <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`status-badge status-${file.status}`}>
                  {file.status === 'analyzed' ? '🔍 Analizado' : file.status === 'cleaning' ? '⚡ Limpiando' : '✨ Limpio'}
                </span>
                {file.cleaningReport && (
                  <span className="status-badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    {file.cleaningReport.successRate}% limpieza ({file.cleaningReport.fieldsRemoved} campos)
                  </span>
                )}
              </div>
            </div>

            <div className="actions">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedFileMetadata(file.metadata.summary)}
                title="Ver detalles"
              >
                Detalles
              </button>
              
              {file.status === 'analyzed' && (
                <button 
                  className="btn-primary"
                  onClick={() => handleClean(file.id)}
                >
                  Limpiar
                </button>
              )}

              {file.status === 'cleaned' && (
                <button 
                  className="btn-success"
                  onClick={() => handleDownload(file.id, file.originalName)}
                >
                  Descargar
                </button>
              )}

              {file.status === 'cleaning' && <div className="loader"></div>}
            </div>
          </div>
        ))}
      </div>

      {selectedFileMetadata && (
        <div className="modal-overlay" onClick={() => setSelectedFileMetadata(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.5rem' }}>Inspección Técnica</h2>
              <button 
                className="btn-secondary" 
                onClick={() => setSelectedFileMetadata(null)}
                style={{ padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>
            <div className="metadata-grid">
              {Object.keys(selectedFileMetadata).length > 0 ? (
                Object.entries(selectedFileMetadata).map(([key, value]) => (
                  <div key={key} className="metadata-item">
                    <span className="metadata-key">{key}</span>
                    <span className="metadata-value">{String(value)}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛡️</div>
                  <p>Este archivo está completamente limpio de metadatos sensibles.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
