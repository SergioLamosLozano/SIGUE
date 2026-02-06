import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';
import '../../styles/Certificados.css'; // Usamos los mismos estilos base
import '../../styles/CertificateHistory.css'; // Estilos específicos de la tabla

// Recibimos 'onBack' como prop para mantener consistencia con el panel padre
const CertificateHistory = ({ onBack }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Initial Load: Events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await api.get('/eventos/');
                const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
                // Sort by most recent
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
                // Endpoint: GET /certificates/?event_id=XYZ
                const res = await api.get(`/certificates/?event_id=${selectedEventId}`);
                
                // Ensure data structure
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setCertificates(data);
                setSelectedIds([]); // Reset selection on event change
            } catch (error) {
                console.error("Error loading certificates", error);
                // Swal.fire('Error', 'No se encontraron certificados para este evento o hubo un error.', 'error');
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
            // Select all visible (filtered) certificates
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

    // 1. FUNCIÓN PARA DESCARGA INDIVIDUAL
    const handleDownloadSingle = async (certId, filename) => {
        try {
            Swal.fire({
                title: 'Descargando...',
                didOpen: () => Swal.showLoading()
            });

            // Usamos 'api' para que viaje el Token
            const response = await api.get(`/certificates/${certId}/download/`, {
                responseType: 'blob'
            });

            // Crear enlace invisible para descargar
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `certificado_${certId}.pdf`);
            document.body.appendChild(link);
            link.click();
            
            // Limpieza
            link.remove();
            window.URL.revokeObjectURL(url);
            Swal.close();

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo descargar el archivo. Verifica tu sesión.', 'error');
        }
    };

    // 2. FUNCIÓN PARA DESCARGA MASIVA
    const handleDownloadZip = async () => {
        if (selectedIds.length === 0) return;

        try {
            Swal.fire({
                title: 'Generando ZIP...',
                text: 'Comprimiendo los certificados seleccionados.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Petición POST con JSON body: { certificate_ids: [...] }
            const response = await api.post('/certificates/download-zip/', 
                { certificate_ids: selectedIds }, 
                { responseType: 'blob' }
            );

            // Descargar el ZIP
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
        <div className="certificate-sender-container"> {/* Usamos la misma clase container del Sender */}
            
            {/* --- HEADER IDÉNTICO AL SENDER --- */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button onClick={onBack} className="btn-back">
                        ← Volver
                    </button>
                    <h2 className="page-title">📂 Historial de Certificados</h2>
                </div>
            </div>

            {/* --- TARJETA DE CONTENIDO (Estilo Unificado) --- */}
            <div className="sender-content" style={{maxWidth: '1200px'}}> {/* Un poco más ancho para la tabla */}
                
                {/* BARRA DE FILTROS */}
                <div className="history-filters" style={{display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap'}}>
                    <div className="sender-form-group" style={{flex: '1', minWidth: '300px'}}>
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
                    
                    <div className="sender-form-group" style={{flex: '2', minWidth: '300px'}}>
                        <label className="sender-label">Buscar Estudiante:</label>
                        <input 
                            type="text" 
                            className="sender-select" // Reutilizamos estilo de input
                            style={{padding: '12px'}}
                            placeholder="🔍 Buscar por nombre o identificación..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={!selectedEventId}
                        />
                    </div>
                </div>

                {/* BARRA DE ACCIONES MASIVAS (Condicional) */}
                {selectedIds.length > 0 && (
                    <div className="bulk-actions-bar" style={{
                        background: '#fff1f0', 
                        border: '1px solid #ffccc7', 
                        padding: '10px 20px', 
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{fontWeight: 'bold', color: '#D52B1E'}}>{selectedIds.length} seleccionados</span>
                        <div className="actions-buttons">
                            <button className="btn-secondary" onClick={handleDownloadZip} style={{background: 'white', border: '1px solid #ccc'}}>
                                ⬇️ Descargar ZIP
                            </button>
                        </div>
                    </div>
                )}

                {/* TABLA ESTILIZADA */}
                <div className="table-responsive">
                    <table className="modern-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                                <th style={{width: '40px', padding: '15px'}}>
                                    <input 
                                        type="checkbox" 
                                        onChange={handleSelectAll} 
                                        checked={isAllSelected}
                                        disabled={filteredCertificates.length === 0}
                                    />
                                </th>
                                <th style={{textAlign: 'left', padding: '15px', color: '#374151'}}>Estudiante</th>
                                <th style={{textAlign: 'left', padding: '15px', color: '#374151'}}>Identificación</th>
                                <th style={{textAlign: 'left', padding: '15px', color: '#374151'}}>Fecha Generación</th>
                                <th style={{textAlign: 'center', padding: '15px', color: '#374151'}}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center p-5" style={{padding: '40px', textAlign: 'center', color: '#666'}}>
                                        Cargando certificados...
                                    </td>
                                </tr>
                            ) : !selectedEventId ? (
                                <tr>
                                    <td colSpan="5" className="text-center p-5" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                                        Selecciona un evento arriba para ver el historial.
                                    </td>
                                </tr>
                            ) : filteredCertificates.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center p-5" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                                        No se encontraron certificados para este evento.
                                    </td>
                                </tr>
                            ) : (
                                filteredCertificates.map(cert => (
                                    <tr key={cert.id} className={selectedIds.includes(cert.id) ? 'row-selected' : ''} style={{borderBottom: '1px solid #f3f4f6'}}>
                                        <td style={{padding: '15px'}}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(cert.id)}
                                                onChange={(e) => handleSelectOne(cert.id, e.target.checked)} 
                                            />
                                        </td>
                                        <td className="font-medium" style={{padding: '15px'}}>
                                            {cert.estudiante_nombre || cert.usuario?.full_name || 'Desconocido'}
                                            <div style={{fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal'}}>
                                                {cert.estudiante_email || cert.usuario?.email}
                                            </div>
                                        </td>
                                        <td style={{padding: '15px'}}>{cert.estudiante_documento || cert.usuario?.id}</td>
                                        <td style={{padding: '15px'}}>{new Date(cert.created_at || Date.now()).toLocaleDateString()}</td>
                                        <td className="text-center" style={{padding: '15px', textAlign: 'center'}}>
                                            <button 
                                                className="btn-icon" 
                                                onClick={() => handleDownloadSingle(cert.id, cert.filename)}
                                                title="Descargar PDF"
                                                style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}
                                            >
                                                👁️
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
