import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';
import '../../styles/Certificados.css';
import '../../styles/CertificateHistory.css';

const CertificateHistory = ({ onBack }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(null);
    
    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Initial Load: Events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await api.get('/eventos/');
                const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
                list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                setEvents(list);
            } catch (error) {
                console.error("Error loading events", error);
                Swal.fire('Error', 'No se pudieron cargar los eventos', 'error');
            }
        };
        fetchEvents();
    }, []);

    // 2. Load Certificates when Event Changes
    useEffect(() => {
        if (!selectedEventId) {
            setCertificates([]);
            return;
        }

        const fetchCertificates = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/certificates/?event_id=${selectedEventId}`);
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setCertificates(data);
                setSelectedIds([]);
            } catch (error) {
                console.error("Error loading certificates", error);
                setCertificates([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCertificates();
    }, [selectedEventId]);

    // Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredCertificates.map(c => c.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(pid => pid !== id));
        }
    };

    // Descarga individual
    const handleDownloadSingle = async (certId, filename) => {
        setDownloading(certId);
        try {
            const response = await api.get(`/certificates/${certId}/download/`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `certificado_${certId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo descargar el archivo. Verifica tu sesión.', 'error');
        } finally {
            setDownloading(null);
        }
    };

    // Descarga masiva
    const handleDownloadZip = async () => {
        if (selectedIds.length === 0) return;

        try {
            Swal.fire({
                title: 'Generando ZIP...',
                text: 'Comprimiendo los certificados seleccionados.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await api.post('/certificates/download-zip/', 
                { certificate_ids: selectedIds }, 
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Certificados_Lote_${new Date().getTime()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            Swal.fire('¡Éxito!', 'La descarga ha comenzado.', 'success');

        } catch (error) {
            console.error("Error ZIP:", error);
            Swal.fire('Error', 'Hubo un problema generando el archivo ZIP.', 'error');
        }
    };

    // Filter Logic
    const filteredCertificates = certificates.filter(c => {
         const name = c.estudiante_nombre || c.usuario?.full_name || '';
         const doc = c.estudiante_documento || c.usuario?.documento || '';
         const search = searchTerm.toLowerCase();
         return name.toLowerCase().includes(search) || doc.includes(search);
    });

    const isAllSelected = filteredCertificates.length > 0 && selectedIds.length === filteredCertificates.length;

    return (
        <div className="certificate-sender-container">
            
            {/* Header */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button onClick={onBack} className="btn-back">
                        ← Volver
                    </button>
                    <h2 className="page-title">📂 Historial de Certificados</h2>
                </div>
            </div>

            {/* Tarjeta de Contenido */}
            <div className="sender-content sender-content--wide">
                
                {/* Barra de Filtros */}
                <div className="history-filters">
                    <div className="sender-form-group history-filter-event">
                        <label className="sender-label">Evento:</label>
                        <select 
                            className="sender-select"
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            <option value="">-- Selecciona un Evento --</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.titulo} — {new Date(ev.fecha).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="sender-form-group history-filter-search">
                        <label className="sender-label">Buscar Estudiante:</label>
                        <input 
                            type="text" 
                            className="sender-select history-search-input"
                            placeholder="🔍 Buscar por nombre o identificación..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={!selectedEventId}
                        />
                    </div>
                </div>

                {/* Barra de Acciones Masivas */}
                {selectedIds.length > 0 && (
                    <div className="bulk-actions-bar">
                        <span className="bulk-actions-count">{selectedIds.length} seleccionados</span>
                        <div className="actions-buttons">
                            <button className="btn-secondary" onClick={handleDownloadZip}>
                                ⬇️ Descargar ZIP
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabla */}
                <div className="table-responsive">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th className="th-checkbox">
                                    <input 
                                        type="checkbox" 
                                        onChange={handleSelectAll} 
                                        checked={isAllSelected}
                                        disabled={filteredCertificates.length === 0}
                                    />
                                </th>
                                <th>Estudiante</th>
                                <th>Identificación</th>
                                <th>Fecha Generación</th>
                                <th className="th-actions">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="td-status">
                                        Cargando certificados...
                                    </td>
                                </tr>
                            ) : !selectedEventId ? (
                                <tr>
                                    <td colSpan="5" className="td-status td-status--muted">
                                        Selecciona un evento arriba para ver el historial.
                                    </td>
                                </tr>
                            ) : filteredCertificates.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="td-status td-status--muted">
                                        No se encontraron certificados para este evento.
                                    </td>
                                </tr>
                            ) : (
                                filteredCertificates.map(cert => (
                                    <tr key={cert.id} className={selectedIds.includes(cert.id) ? 'row-selected' : ''}>
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(cert.id)}
                                                onChange={(e) => handleSelectOne(cert.id, e.target.checked)} 
                                            />
                                        </td>
                                        <td className="font-medium">
                                            {cert.estudiante_nombre || cert.usuario?.full_name || 'Desconocido'}
                                            <div className="td-email-subtitle">
                                                {cert.estudiante_email || cert.usuario?.email}
                                            </div>
                                        </td>
                                        <td>{cert.estudiante_documento || cert.usuario?.id}</td>
                                        <td>{new Date(cert.created_at || Date.now()).toLocaleDateString()}</td>
                                        <td className="td-actions">
                                            <button 
                                                className="user-certs-download-btn"
                                                onClick={() => handleDownloadSingle(cert.id, cert.filename)}
                                                disabled={downloading === cert.id}
                                            >
                                                {downloading === cert.id ? '⏳ Descargando...' : '📥 Descargar PDF'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CertificateHistory;
