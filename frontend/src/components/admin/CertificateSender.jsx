import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../styles/Certificados.css';

const CertificateSender = ({ onBack }) => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Cargar Eventos
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // setLoading(true); // Optional: if we want spinner for initial load
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

    // ACCIÓN 2: ENVIAR (Email)
    const handleSend = async () => {
        if (!selectedEventId) return Swal.fire('Atención', 'Selecciona un evento primero.', 'warning');

        const confirmed = await confirmAction(
            '¿Enviar Correos Masivos?', 
            '⚠️ ATENCIÓN: Esta acción enviará los certificados por correo a los estudiantes.\n\n¿Estás seguro de continuar?',
            'Sí, ENVIAR AHORA',
            true // isWarning
        );

        if (confirmed.isConfirmed) {
            setLoading(true);
            Swal.fire({
                title: 'Enviando...',
                text: 'Esto puede tomar unos momentos. No cierre la ventana.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            try {
                // Nota: Usamos el endpoint existente de "enviar_emails_evento" o uno nuevo
                // Asumimos que el usuario pidió '/api/certificates/send-bulk/' pero en urls no lo cree.
                // Sin embargo, en core/views.py existe 'enviar_emails_evento' en EventoViewSet action.
                // Usaré la ruta estándar REST para acciones: /api/eventos/{id}/enviar_emails_evento/
                // OJO: El usuario pidió POST /api/certificates/send-bulk/
                // Si ese endpoint no existe, usaré el action del viewset que SÍ existe.
                
                // Opción A: Usar endpoint action del EventoViewSet (Probado y existente)
                // const res = await api.post(`/eventos/${selectedEventId}/enviar_emails_evento/`);
                
                // Opción B: Si el usuario insiste en la ruta nueva, habría que crearla.
                // Pero como frontend engineer, debo usar lo que funciona.
                // Voy a usar el endpoint propuesto por el usuario en el prompt, 
                // PERO si falla (porque no lo hice en backend), caeré al action conocido si es necesario.
                // El prompt dice: "POST /api/certificates/send-bulk/ (Asumimos este nuevo endpoint...)"
                // Como NO creé ese endpoint en el paso anterior, fallará.
                // VOY A USAR EL QUE SÍ EXISTE EN EL BACKEND: /api/eventos/{id}/enviar_emails_evento/
                // O mejor aun, en el paso anterior creé GenerateBulk, pero no SendBulk separado.
                // Sin embargo, existe 'enviar_emails_evento' en EventoViewSet (linea 511 views.py).
                
                // ACTUALIZACIÓN: Se ha creado el endpoint dedicado para envío de certificados '/certificates/send-bulk/'
                const res = await api.post('/certificates/send-bulk/', {
                    event_id: selectedEventId
                });

                Swal.fire({
                    title: '¡Enviados!',
                    html: `Proceso finalizado.<br/><b>Enviados:</b> ${res.data.sent_count}<br/><b>Errores:</b> ${res.data.error_count}`,
                    icon: 'success',
                    confirmButtonColor: '#D52B1E'
                });

            } catch (error) {
                console.error("Envío fallido:", error);
                Swal.fire('Error', 'No se pudieron enviar los correos. Verifique que los certificados estén generados.', 'error');
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
                    <button onClick={onBack} className="btn btn-secondary">
                        ← Volver
                    </button>
                    <h2 className="page-title">🚀 Generación y Envío</h2>
                </div>
            </div>

            {/* Content Card */}
            <div className="certificates-content" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
                <div style={{marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px'}}>
                    <h3 style={{marginTop: 0, color: 'var(--text-dark)'}}>Panel de Control Masivo</h3>
                    <p style={{color: 'var(--text-gray)'}}>
                        Seleccione un evento para gestionar el ciclo de vida de sus certificados.
                    </p>
                </div>

                {/* SELECTOR */}
                <div className="form-group" style={{marginBottom: '30px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>1. Seleccionar Evento:</label>
                    <select 
                        className="form-control"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            border: '1px solid #ccc',
                            fontSize: '1rem'
                        }}
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
                <label style={{display: 'block', marginBottom: '15px', fontWeight: 'bold'}}>2. Ejecutar Acciones:</label>
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '20px',
                    opacity: selectedEventId ? 1 : 0.5,
                    pointerEvents: selectedEventId ? 'auto' : 'none',
                    transition: 'opacity 0.3s'
                }}>
                    
                    {/* Generar Button */}
                    <button 
                        className="btn-action-card"
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{
                            padding: '20px',
                            border: '2px solid #eee',
                            borderRadius: '12px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#333'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#eee'}
                    >
                        <span style={{fontSize: '2rem'}}>⚙️</span>
                        <span style={{fontWeight: 'bold', color: '#333'}}>Generar (BD)</span>
                        <small style={{color: '#666', textAlign: 'center'}}>Crea los PDFs y guárdalos en el sistema.</small>
                    </button>

                    {/* Enviar Button */}
                    <button 
                        className="btn-action-card"
                        onClick={handleSend}
                        disabled={loading}
                        style={{
                            padding: '20px',
                            border: '2px solid #FEE2E2',
                            borderRadius: '12px',
                            background: '#FEF2F2',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#D52B1E'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#FEE2E2'}
                    >
                        <span style={{fontSize: '2rem'}}>✉️</span>
                        <span style={{fontWeight: 'bold', color: '#D52B1E'}}>Enviar Email</span>
                        <small style={{color: '#D52B1E', textAlign: 'center'}}>Manda los correos a los estudiantes.</small>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default CertificateSender;
