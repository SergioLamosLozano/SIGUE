import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/UserCertificates.css';

/**
 * UserCertificates Component
 * Muestra los certificados del usuario autenticado y permite descargarlos.
 * Reutilizable en StudentDashboard y TeacherDashboard.
 */
const UserCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null); // ID del cert que se está descargando

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const response = await api.get('/certificates/');
            const data = response.data.results || response.data;
            setCertificates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error al cargar certificados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (certId, filename) => {
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
            console.error('Error al descargar:', error);
            alert('No se pudo descargar el certificado. Intenta de nuevo.');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="user-certs-card">
                <h3 className="user-certs-title">📜 Mis Certificados</h3>
                <p className="user-certs-loading">Cargando certificados...</p>
            </div>
        );
    }

    return (
        <div className="user-certs-card">
            <h3 className="user-certs-title">📜 Mis Certificados</h3>

            {certificates.length === 0 ? (
                <div className="user-certs-empty">
                    <span className="user-certs-empty-icon">🎓</span>
                    <p>Aún no tienes certificados generados.</p>
                    <span className="user-certs-empty-hint">
                        Cuando asistas a un evento y se generen certificados, aparecerán aquí.
                    </span>
                </div>
            ) : (
                <>
                    <p className="user-certs-count">
                        Tienes <strong>{certificates.length}</strong> certificado{certificates.length !== 1 ? 's' : ''} disponible{certificates.length !== 1 ? 's' : ''}
                    </p>
                    <div className="user-certs-table-wrapper">
                        <table className="user-certs-table">
                            <thead>
                                <tr>
                                    <th>Evento</th>
                                    <th>Fecha de Generación</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certificates.map(cert => (
                                    <tr key={cert.id}>
                                        <td className="user-certs-event-name">
                                            {cert.evento_titulo || cert.evento?.titulo || `Evento #${cert.evento}`}
                                        </td>
                                        <td>
                                            {cert.created_at
                                                ? new Date(cert.created_at).toLocaleDateString('es-CO', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                                : 'N/A'
                                            }
                                        </td>
                                        <td>
                                            <button
                                                className="user-certs-download-btn"
                                                onClick={() => handleDownload(cert.id, cert.filename)}
                                                disabled={downloading === cert.id}
                                            >
                                                {downloading === cert.id ? '⏳ Descargando...' : '📥 Descargar PDF'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserCertificates;
