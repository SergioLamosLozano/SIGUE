import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../services/alert';
import '../../styles/EventList.css'; 

const StaffEventosList = () => {
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    const homeLink = user?.role === 'Administrador' ? '/admin-dashboard' : 
                   user?.role === 'Estudiante' ? '/student-dashboard' : 
                   user?.role === 'Docente' ? '/teacher-dashboard' : 
                   user?.role === 'Coordinador' ? '/coordinador-dashboard' : '/';

    useEffect(() => {
        const fetchStaffEventos = async () => {
            try {
                const response = await api.get('/eventos/mis-eventos-staff/');
                setEventos(response.data);
            } catch (error) {
                console.error('Error fetching staff events:', error);
                showError('Error', 'No se pudieron cargar los eventos de Staff.');
            } finally {
                setLoading(false);
            }
        };

        fetchStaffEventos();
    }, []);

    if (loading) return <div className="loading">Cargando eventos...</div>;

    return (
        <div className="page-content">
            {/* Header de la página */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button 
                        onClick={() => navigate(homeLink)} 
                        className="btn btn-secondary"
                        title="Volver al Panel"
                    >
                        ⬅ Volver
                    </button>
                    <h2 className="page-title">📋 Tus Eventos Asignados como Staff</h2>
                </div>
            </div>

            {eventos.length === 0 ? (
                <div className="empty-state">
                    <h3>No hay eventos asignados</h3>
                    <p>En este momento no estás asignado como Staff de ningún evento activo.</p>
                </div>
            ) : (
                <div className="event-grid">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="event-card">
                            {/* Card Header con Imagen */}
                            {evento.flyer_base64 && (
                                <div className="event-image-container">
                                    <img
                                        src={`data:${evento.flyer_content_type || 'image/png'};base64,${evento.flyer_base64}`}
                                        alt={evento.titulo}
                                        className="event-image"
                                    />
                                </div>
                            )}

                            {/* Card Body */}
                            <div className="event-content">
                                <h3 className="event-title">{evento.titulo}</h3>
                                <div className="event-info">
                                    📅 {new Date(evento.fecha).toLocaleString()}
                                </div>
                                <div className="event-info">
                                    📍 {evento.lugar_nombre || evento.lugar}
                                </div>

                                <p className="event-description">
                                    {evento.descripcion || 'Sin descripción disponible para este evento.'}
                                </p>

                                {/* Badges informativos */}
                                <div className="event-badges">
                                    {evento.requiere_entregable && <span className="badge badge-refrigerio">🎁 Entregable</span>}
                                    {evento.asistencia_qr && <span className="badge badge-qr">📱 QR</span>}
                                    <span className="badge badge-warning">👷 Staff</span>
                                </div>

                                <div className="event-actions">
                                    <button
                                        className="btn btn-primary w-100"
                                        onClick={() => navigate(`/staff-dashboard/event/${evento.id}`)}
                                    >
                                        Abrir Dashboard del Evento
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StaffEventosList;
