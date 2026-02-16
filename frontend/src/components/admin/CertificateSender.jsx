import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { showSuccess, showError } from '../../services/alert';
import '../../styles/Certificados.css';
import '../../styles/CertificateSender.css';

const CertificateSender = ({ onBack }) => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Cargar Eventos
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await api.get('/eventos/');

                // Asegurar array y ordenar por fecha (más reciente primero)
                const eventList = Array.isArray(response.data)
                    ? response.data
                    : (response.data.results || []);

                // Ordenamiento descendente por fecha
                eventList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                setEvents(eventList);
            } catch (error) {
                console.error("Error cargando eventos:", error);
                Swal.fire('Error', 'No se pudieron cargar los eventos.', 'error');
            }
        };
        fetchEvents();
    }, []);

    // Helper para Alertas Estilo Univalle
    const confirmAction = async (title, text, confirmBtnText, isWarning = false) => {
        return Swal.fire({
            title: title,
            text: text,
            icon: isWarning ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: '#D52B1E', // Rojo Univalle
            cancelButtonColor: '#6B7280', // Gris neutro
            confirmButtonText: confirmBtnText,
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });
    };

    // ACCIÓN 1: GENERAR (Solo BD)
    const handleGenerate = async () => {
        if (!selectedEventId) return Swal.fire('Atención', 'Selecciona un evento primero.', 'warning');

        const ev = events.find(e => e.id == selectedEventId);
        const eventName = ev ? ev.titulo : 'el evento seleccionado';

        const confirmed = await confirmAction(
            '¿Generar Certificados?',
            `Se crearán los PDFs en la base de datos para todos los asistentes de "${eventName}".\n\nEsto NO envía correos aún.`,
            'Sí, Generar Certificados'
        );

        if (confirmed.isConfirmed) {
            setLoading(true);
            Swal.fire({
                title: 'Generando...',
                text: 'Espere mientras se crean los archivos.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const response = await api.post('/certificates/generate-bulk/', {
                    event_id: selectedEventId
                });

                Swal.fire({
                    title: '¡Generación Exitosa!',
                    text: `Se han creado ${response.data.count} certificados en el sistema.`,
                    icon: 'success',
                    confirmButtonColor: '#D52B1E'
                });

            } catch (error) {
                console.error("Generación fallida:", error);
                const msg = error.response?.data?.error || "Hubo un problema generando los certificados.";
                Swal.fire('Error', msg, 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    // ACCIÓN 2: ENVIAR (Email) — Fire & Forget (Backend procesa en segundo plano)
    const handleSend = async () => {
        if (!selectedEventId) return Swal.fire('Atención', 'Selecciona un evento primero.', 'warning');

        const confirmed = await confirmAction(
            '¿Enviar Correos Masivos?',
            '⚠️ Los certificados se enviarán en segundo plano para no bloquear el sistema. Recibirás un informe por email al finalizar. ¿Continuar?',
            'Sí, Iniciar Envío',
            true // isWarning
        );

        if (confirmed.isConfirmed) {
            setLoading(true);

            try {
                // El backend ahora responde rápido (proceso en segundo plano)
                await api.post('/certificates/send-bulk/', {
                    event_id: selectedEventId
                });

                showSuccess(
                    '¡Ejecutando en Segundo Plano!',
                    'El sistema está enviando los correos. Puedes seguir trabajando; te notificaremos por email al terminar.'
                );

            } catch (error) {
                console.error("Error al iniciar envío:", error);
                const msg = error.response?.data?.error || 'No se pudo iniciar el proceso de envío.';
                showError('Error', msg);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="certificate-sender-container">
            {/* Header */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button onClick={onBack} className="btn-back">
                        ← Volver
                    </button>
                    <h2 className="page-title">🚀 Generación y Envío</h2>
                </div>
            </div>

            {/* Content Card */}
            <div className="sender-content">
                <div className="sender-intro">
                    <h3 className="sender-title">Panel de Control Masivo</h3>
                    <p className="sender-subtitle">
                        Seleccione un evento para gestionar el ciclo de vida de sus certificados.
                    </p>
                </div>

                {/* SELECTOR */}
                <div className="sender-form-group">
                    <label className="sender-label">1. Seleccionar Evento:</label>
                    <select
                        className="sender-select"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">-- Elige un evento disponible --</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>
                                {ev.titulo} ({new Date(ev.fecha).toLocaleDateString()}) [{ev.estado}]
                            </option>
                        ))}
                    </select>
                </div>

                {/* ACTIONS GRID */}
                <label className="sender-label sender-label--spaced">2. Ejecutar Acciones:</label>
                <div className={`sender-action-grid ${!selectedEventId ? 'disabled' : ''}`}>

                    {/* Generar Button */}
                    <button
                        className="btn-action-card btn-action-generate"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        <span className="action-icon">⚙️</span>
                        <span className="action-title">Generar (BD)</span>
                        <small className="action-desc">Crea los PDFs y guárdalos en el sistema.</small>
                    </button>

                    {/* Enviar Button */}
                    <button
                        className="btn-action-card btn-action-send"
                        onClick={handleSend}
                        disabled={loading}
                    >
                        <span className="action-icon">✉️</span>
                        <span className="action-title">Enviar Email</span>
                        <small className="action-desc">Manda los correos a los estudiantes.</small>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default CertificateSender;
