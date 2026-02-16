import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { showSuccess, showError, showConfirm } from '../../services/alert';
import UserCertificates from '../common/UserCertificates';
import '../../styles/EventList.css';

/**
 * Componente principal para listar eventos.
 * Maneja dos vistas principales:
 * 1. Admin: Tabla de gestión completa (Crear, Editar, Eliminar).
 * 2. Usuario (Estudiante/Docente): Tarjetas de eventos disponibles y suscripciones.
 */
const EventList = ({ canCreate = false }) => {
    // Estados para datos
    const [eventos, setEventos] = useState([]);
    const [misEventos, setMisEventos] = useState([]); // IDs de eventos donde el usuario está inscrito
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Estado para EDICIÓN
    const [editingEventId, setEditingEventId] = useState(null);
    const [existingFlyerUrl, setExistingFlyerUrl] = useState(null); // Para mostrar la imagen actual al editar

    // Hooks
    const navigate = useNavigate();
    const { user } = useAuth();

    // Estado para el formulario de Nuevo/Editar Evento
    const [newEvent, setNewEvent] = useState({
        titulo: '',
        descripcion: '',
        fecha: '',
        fecha_fin: '',
        lugar: '',
        requiere_entregable: false,
        cantidad_entregables: 0,
        entregables_items: [], // Array de objetos {id, name} para múltiples tipos (Comida, Souvenir)
        asistencia_qr: false,
        programas_dirigidos_ids: [], // IDs de programas seleccionados
        enviar_difusion: false // Enviar correos automáticamente al crear/editar
    });
    const [flyerFile, setFlyerFile] = useState(null);

    // Estado para programas académicos (A quién va dirigido)
    const [programas, setProgramas] = useState([]);
    // Estado para lugares/ubicaciones
    const [lugares, setLugares] = useState([]);

    // Configuración de Auth para Axios
    const token = sessionStorage.getItem('token');
    const authConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    // --- CARGA DE DATOS ---
    const fetchEventos = async () => {
        try {
            // Traer todos los eventos disponibles
            const res = await axios.get('http://localhost:8000/api/eventos/', authConfig);
            const eventsData = res.data.results || res.data;
            setEventos(eventsData);

            // Traer eventos donde YA estoy inscrito
            const resMis = await axios.get('http://localhost:8000/api/eventos/mis_eventos/', authConfig);
            const myEventsData = Array.isArray(resMis.data) ? resMis.data : (resMis.data.results || []);
            setMisEventos(myEventsData.map(e => e.id));
        } catch (error) {
            console.error("Error fetching eventos", error);
        } finally {
            setLoading(false);
        }
    };

    // Cargar programas académicos para el selector
    const fetchProgramas = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/programas/', authConfig);
            const programasData = res.data.results || res.data;
            setProgramas(programasData);
        } catch (error) {
            console.error("Error fetching programas", error);
        }
    };

    // Cargar ubicaciones para el selector
    const fetchLugares = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/locations/', authConfig);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setLugares(data);
        } catch (error) {
            console.error("Error fetching lugares", error);
        }
    };

    useEffect(() => {
        fetchEventos();
        fetchProgramas();
        fetchLugares();
    }, []);

    // --- MANEJADORES DE ACCIÓN ---

    const handleFileChange = (e) => {
        setFlyerFile(e.target.files[0]);
    };

    // Helper para formatear fechas al input datetime-local (YYYY-MM-DDTHH:MM)
    const formatDateForInput = (isoDateString) => {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        // Ajustar a zona horaria local o mantener la del string si ya viene correcta
        // Truco simple para input datetime-local: obtener YYYY-MM-DDTHH:MM
        // Ojo: toISOString() da UTC. Para local, construimos manualmente o usamos librerías.
        // Vamos a usar un ajuste simple de timezone offset.
        const headerOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - headerOffset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    // Preparar el formulario para Editar
    const handleEdit = (evento) => {
        setEditingEventId(evento.id);

        // Parsear entregables (suponiendo que viene como objeto o string JSON)
        let entItems = [];
        if (evento.detalles_entregables) {
            try {
                const parsed = typeof evento.detalles_entregables === 'string'
                    ? JSON.parse(evento.detalles_entregables)
                    : evento.detalles_entregables;
                if (parsed && Array.isArray(parsed.items)) {
                    entItems = parsed.items.map((name, idx) => ({ id: Date.now() + idx, name }));
                }
            } catch (e) { console.error("Error parseando entregables", e); }
        }

        setNewEvent({
            titulo: evento.titulo,
            descripcion: evento.descripcion || '',
            fecha: formatDateForInput(evento.fecha),
            fecha_fin: formatDateForInput(evento.fecha_fin),
            lugar: evento.lugar,
            requiere_entregable: evento.requiere_entregable || false,
            cantidad_entregables: evento.cantidad_entregables || 0,
            entregables_items: entItems,
            asistencia_qr: evento.asistencia_qr || false,
            // Asumimos que el backend devuelve la lista de IDs o objetos en 'programas_dirigidos'
            // Si devuelve objetos, mapeamos a IDs.
            programas_dirigidos_ids: Array.isArray(evento.programas_dirigidos)
                ? evento.programas_dirigidos.map(p => typeof p === 'object' ? p.id : p)
                : [],
            enviar_difusion: false // Por defecto false al editar para no spamear, a menos que el usuario quiera
        });

        // Configurar imagen existente
        if (evento.has_flyer && evento.flyer_base64) {
            setExistingFlyerUrl(`data:${evento.flyer_content_type || 'image/png'};base64,${evento.flyer_base64}`);
        } else {
            setExistingFlyerUrl(null);
        }
        setFlyerFile(null); // Resetear archivo nuevo subido
        setShowModal(true);
    };

    /**
     * Envía el formulario para crear o editar un evento.
     * Maneja FormData para permitir subida de imágenes (flyer).
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append('titulo', newEvent.titulo);
        formData.append('descripcion', newEvent.descripcion);
        formData.append('fecha', newEvent.fecha);
        if (newEvent.fecha_fin) formData.append('fecha_fin', newEvent.fecha_fin);
        else formData.append('fecha_fin', ''); // Enviar vacío si se limpia

        formData.append('lugar', newEvent.lugar);
        formData.append('requiere_entregable', newEvent.requiere_entregable);

        // Lógica de entregables
        let totalQty = newEvent.cantidad_entregables;
        if (newEvent.entregables_items.length > 0) {
            const itemsNames = newEvent.entregables_items.map(i => i.name).filter(n => n.trim() !== '');
            formData.append('detalles_entregables', JSON.stringify({ items: itemsNames }));
            // totalQty se podría calcular o dejar manual, mantenemos manual o 0
        }
        formData.append('cantidad_entregables', totalQty);

        formData.append('asistencia_qr', newEvent.asistencia_qr);

        // Añadir programas dirigidos
        // OJO: En form-data arrays se envían repitiendo la clave
        if (newEvent.programas_dirigidos_ids && newEvent.programas_dirigidos_ids.length > 0) {
            newEvent.programas_dirigidos_ids.forEach(id => {
                formData.append('programas_dirigidos_ids', id);
            });
        } else {
            // Si queremos limpiar los programas al editar, necesitamos enviar algo que Django entienda como vacío
            // o simplemente no enviar nada y que el backend maneje el set.
            // Para 'ManyRelatedField' en DRF, enviar lista vacía a veces requiere truco, pero probemos omitir
            // o enviar un valor vacío explicito si es necesario.
        }

        // Difusión
        if (newEvent.enviar_difusion) {
            formData.append('enviar_difusion', 'true');
        }

        if (flyerFile) {
            formData.append('flyer', flyerFile);
        }

        try {
            if (editingEventId) {
                // MODO EDICIÓN
                await axios.patch(`http://localhost:8000/api/eventos/${editingEventId}/`, formData, {
                    headers: {
                        ...authConfig.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                showSuccess('Evento actualizado exitosamente');
            } else {
                // MODO CREACIÓN
                const res = await axios.post('http://localhost:8000/api/eventos/', formData, {
                    headers: {
                        ...authConfig.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                // Verificar si se activó la difusión
                const isDiffusionActive = formData.get('enviar_difusion') === 'true' || formData.get('enviar_difusion') === true;

                if (isDiffusionActive && res.data.emails_enviados) {
                    // Evento Creado + Difusión Completada
                    showSuccess(
                        '¡Evento Creado y Difusión Completada!',
                        `El evento se guardó correctamente. Se enviaron ${res.data.emails_enviados} correos de difusión.`
                    );
                } else {
                    // Solo Crear
                    showSuccess('¡Evento Creado!', 'El evento ha sido registrado exitosamente en el sistema.');
                }
            }

            setShowModal(false);
            resetForm();
            fetchEventos(); // Recargar lista
        } catch (error) {
            console.error(error);
            const action = editingEventId ? 'actualizar' : 'crear';
            showError(`Error al ${action} evento: ` + (error.response?.data?.detail || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewEvent({
            titulo: '',
            descripcion: '',
            fecha: '',
            fecha_fin: '',
            lugar: '',
            requiere_entregable: false,
            cantidad_entregables: 0,
            entregables_items: [],
            asistencia_qr: false,
            programas_dirigidos_ids: [],
            enviar_difusion: false
        });
        setFlyerFile(null);
        setEditingEventId(null);
        setExistingFlyerUrl(null);
    };

    const handleJoin = async (eventoId) => {
        try {
            await axios.post(`http://localhost:8000/api/eventos/${eventoId}/unirse/`, {}, authConfig);
            fetchEventos();
            showSuccess('Te has inscrito al evento exitosamente');
        } catch (error) {
            showError(error.response?.data?.message || 'Error al inscribirse');
        }
    };

    const handleDelete = async (eventoId) => {
        const confirmed = await showConfirm(
            '¿Seguro que deseas eliminar este evento?',
            'Esta acción no se puede deshacer'
        );
        if (!confirmed) return;

        try {
            await axios.delete(`http://localhost:8000/api/eventos/${eventoId}/`, authConfig);
            fetchEventos();
            showSuccess('Evento eliminado');
        } catch (error) {
            showError('Error al eliminar', error.response?.data?.detail || 'No tienes permiso');
        }
    };

    const handleApprove = async (eventoId) => {
        const confirmed = await showConfirm(
            '¿Aprobar este evento?',
            'El evento será visible para todos los estudiantes.'
        );
        if (!confirmed) return;

        try {
            await axios.post(`http://localhost:8000/api/eventos/${eventoId}/aprobar/`, {}, authConfig);
            fetchEventos();
            showSuccess('Evento aprobado exitosamente');
        } catch (error) {
            showError('Error al aprobar');
        }
    };

    // --- FILTRADO DE PESTAÑAS (USUARIO) ---
    const [activeTab, setActiveTab] = useState('available');

    const isAdmin = user?.role === 'Administrador';
    const isDocente = user?.role === 'Docente';

    const filterEvents = () => {
        const now = new Date();
        // Admin: Ve todo sin filtros de pestañas
        if (isAdmin) return eventos;

        return eventos.filter(evento => {
            const eventStart = new Date(evento.fecha);
            // Si no tiene fecha fin, asumimos duración de 3 horas para la lógica de "Pasado"
            const eventEnd = evento.fecha_fin
                ? new Date(evento.fecha_fin)
                : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);

            const isRegistered = misEventos.includes(evento.id);
            const isPast = eventEnd < now;

            if (activeTab === 'available') {
                return !isRegistered && !isPast;
            } else if (activeTab === 'registered') {
                return isRegistered && !isPast;
            } else if (activeTab === 'history') {
                return isPast;
            }
            return true;
        });
    };

    const displayedEvents = filterEvents();

    if (loading) return <div className="loading">Cargando eventos...</div>;

    return (
        <div className="event-list-container">
            {/* HEADER DE LA SECCIÓN */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin-dashboard')}
                            className="btn btn-secondary"
                            title="Volver al Panel"
                        >
                            ⬅ Volver
                        </button>
                    )}
                    <h2 className="page-title">
                        {isAdmin ? '📅 Gestión de Eventos' : '📅 Eventos y Actividades'}
                    </h2>
                </div>

                <div className="page-header-card__right">
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                            ➕ Crear Nuevo Evento
                        </button>
                    )}
                </div>
            </div>

            {/* TABS DE NAVEGACIÓN (DOCENTES Y ESTUDIANTES) */}
            {!isAdmin && (
                <div className="tabs-container">
                    <button
                        className={`tab-button ${activeTab === 'available' ? 'active' : ''}`}
                        onClick={() => setActiveTab('available')}
                    >
                        📅 Disponibles
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'registered' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registered')}
                    >
                        ✅ Mis Inscripciones
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        🕒 Historial
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'certificates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('certificates')}
                    >
                        📜 Mis Certificados
                    </button>
                </div>
            )}

            {/* CONTENIDO DE LA PESTAÑA CERTIFICADOS */}
            {activeTab === 'certificates' && !isAdmin ? (
                <UserCertificates />
            ) : displayedEvents.length === 0 ? (
                <div className="empty-state">
                    <h3>No hay eventos en esta sección</h3>
                    <p>
                        {activeTab === 'available' && "No hay eventos próximos disponibles para inscripción."}
                        {activeTab === 'registered' && "No te has inscrito a ningún evento próximo."}
                        {activeTab === 'history' && "No tienes eventos pasados registrados."}
                        {isAdmin && "No se han creado eventos aún."}
                    </p>
                </div>
            ) : (
                <div className="event-grid">
                    {displayedEvents.map(evento => (
                        <div
                            key={evento.id}
                            className={`event-card ${canCreate ? 'clickable admin-view' : ''} ${evento.estado === 'PENDIENTE' ? 'pending-event' : ''}`}
                            onClick={() => {
                                if (canCreate) {
                                    navigate(`/admin-dashboard/event/${evento.id}`);
                                }
                            }}
                            style={evento.estado === 'PENDIENTE' ? { border: '2px dashed #f59e0b', opacity: 0.9 } : {}}
                        >
                            {/* IMAGEN DE FLYER SI EXISTE (almacenado como base64 en BD) */}
                            {evento.has_flyer && evento.flyer_base64 && (
                                <div className="event-image-container">
                                    <img
                                        src={`data:${evento.flyer_content_type || 'image/png'};base64,${evento.flyer_base64}`}
                                        alt={evento.titulo}
                                        className="event-image"
                                    />
                                </div>
                            )}

                            <div className="event-content">
                                <h3 className="event-title">{evento.titulo}</h3>
                                <div className="event-info">
                                    📅 {new Date(evento.fecha).toLocaleString()}
                                </div>
                                <div className="event-info">
                                    📍 {evento.lugar_nombre || evento.lugar}
                                </div>

                                <p className="event-description">{evento.descripcion}</p>

                                {/* Badges informativos */}
                                <div className="event-badges">
                                    {evento.estado === 'PENDIENTE' && <span className="badge badge-warning">⏳ Pendiente</span>}
                                    {evento.requiere_entregable && <span className="badge badge-refrigerio">🎁 Entregable</span>}
                                    {evento.asistencia_qr && <span className="badge badge-qr">📱 QR</span>}
                                </div>

                                {/* BOTONES DE ACCIÓN */}
                                <div className="event-actions">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>

                                        {/* --- GESTIÓN (Admin o Dueño) --- */}
                                        {(isAdmin || (canCreate && evento.creado_por === user.id)) && (
                                            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                                {/* Aprobar (Solo Admin y Pendiente) */}
                                                {isAdmin && evento.estado === 'PENDIENTE' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(evento.id); }}
                                                        className="btn btn-success"
                                                        style={{ flex: 1 }}
                                                        title="Aprobar Evento"
                                                    >
                                                        ✅ Aprobar
                                                    </button>
                                                )}

                                                {/* Botón EDITAR */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(evento); }}
                                                    className="event-card-btn"
                                                    title="Editar Evento"
                                                >
                                                    ✏️ Editar
                                                </button>

                                                {/* Botón ELIMINAR */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(evento.id); }}
                                                    className="event-card-btn"
                                                    title="Eliminar Evento"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        )}

                                        {/* --- PARTICIPACIÓN (Todos excepto Admin, o incluso Admin si quisiera) --- */}
                                        {!isAdmin && (
                                            <>
                                                {activeTab === 'history' ? (
                                                    <div className="alert alert-secondary" style={{ marginBottom: 0, textAlign: 'center', padding: '0.5rem', background: '#f3f4f6', color: '#6b7280' }}>
                                                        🏁 Finalizado
                                                    </div>
                                                ) : misEventos.includes(evento.id) ? (
                                                    <div className="alert alert-success" style={{ marginBottom: 0, textAlign: 'center', padding: '0.5rem' }}>
                                                        ✅ Ya estás inscrito
                                                    </div>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); handleJoin(evento.id); }} className="btn btn-primary" style={{ width: '100%' }}>
                                                        Unirme al Evento
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE CREACIÓN / EDICIÓN */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content modal-content-custom" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '900px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '0'
                    }}>
                        <div className="event-modal-header">
                            <h3 className="event-modal-title">
                                {editingEventId ? '✏️ Editar Evento' : '✨ Crear Nuevo Evento'}
                            </h3>
                            <button className="event-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="event-modal-body">
                            <form onSubmit={handleSubmit}>
                                {/* Layout de dos columnas */}
                                <div className="event-form-grid">
                                    {/* COLUMNA IZQUIERDA */}
                                    <div>
                                        <h4 className="event-section-title">
                                            📋 Información del Evento
                                        </h4>

                                        <div className="event-form-group">
                                            <label className="event-label">
                                                Título del Evento *
                                            </label>
                                            <input
                                                className="event-input"
                                                value={newEvent.titulo}
                                                onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                                                required
                                                placeholder="Ej: Día del Contador"
                                            />
                                        </div>

                                        <div className="event-form-group">
                                            <label className="event-label">
                                                Descripción
                                            </label>
                                            <textarea
                                                className="event-textarea"
                                                value={newEvent.descripcion}
                                                onChange={e => setNewEvent({ ...newEvent, descripcion: e.target.value })}
                                                placeholder="Describe los detalles del evento..."
                                            />
                                        </div>

                                        <div className="event-date-row">
                                            <div className="event-form-group">
                                                <label className="event-label">
                                                    📅 Fecha Inicio *
                                                </label>
                                                <input
                                                    className="event-input"
                                                    type="datetime-local"
                                                    value={newEvent.fecha}
                                                    onChange={e => setNewEvent({ ...newEvent, fecha: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="event-form-group">
                                                <label className="event-label">
                                                    📅 Fecha Fin
                                                </label>
                                                <input
                                                    className="event-input"
                                                    type="datetime-local"
                                                    value={newEvent.fecha_fin}
                                                    onChange={e => setNewEvent({ ...newEvent, fecha_fin: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLUMNA DERECHA */}
                                    <div>
                                        <h4 className="event-section-title">
                                            📍 Ubicación y Difusión
                                        </h4>

                                        <div className="event-form-group">
                                            <label className="event-label">
                                                Lugar del Evento *
                                            </label>
                                            <select
                                                className="event-input"
                                                value={newEvent.lugar}
                                                onChange={e => setNewEvent({ ...newEvent, lugar: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccione una ubicación</option>
                                                {lugares.map(lugar => (
                                                    <option key={lugar.id} value={lugar.id}>
                                                        {lugar.descripcion}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="event-form-group">
                                            <label className="event-label">
                                                🖼️ Flyer / Imagen Promocional
                                            </label>
                                            <div className="event-flyer-box">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    id="flyer-upload"
                                                    style={{ display: 'none' }}
                                                />
                                                <label htmlFor="flyer-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                                    {flyerFile ? (
                                                        <div className="flyer-content-success">
                                                            <span style={{ fontSize: '1.5rem' }}>✅</span>
                                                            <p style={{ margin: '8px 0 0', fontWeight: '500', fontSize: '0.9rem' }}>{flyerFile.name}</p>
                                                            <p style={{ fontSize: '0.8rem', color: '#666' }}>Nueva imagen lista para subir</p>
                                                        </div>
                                                    ) : existingFlyerUrl && editingEventId ? (
                                                        <div className="flyer-content-existing" style={{ position: 'relative' }}>
                                                            <img
                                                                src={existingFlyerUrl}
                                                                alt="Actual"
                                                                style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '6px', marginBottom: '5px' }}
                                                            />
                                                            <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>Imagen Actual (Clic para cambiar)</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flyer-content-placeholder">
                                                            <span style={{ fontSize: '1.5rem' }}>📤</span>
                                                            <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Clic para seleccionar imagen</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Fin del grid de dos columnas */}

                                {/* A quién va dirigido - Selección de Programas */}
                                {programas.length > 0 && (
                                    <div className="event-modal-section">
                                        <h4 className="event-section-title">¿A quién va dirigido?</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 10px' }}>
                                            Selecciona los programas académicos a los que va dirigido este evento:
                                        </p>
                                        <div className="programas-grid">
                                            {programas.map(programa => (
                                                <label
                                                    key={programa.id}
                                                    className={`programa-item ${newEvent.programas_dirigidos_ids.includes(programa.id) ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newEvent.programas_dirigidos_ids.includes(programa.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    programas_dirigidos_ids: [...newEvent.programas_dirigidos_ids, programa.id]
                                                                });
                                                            } else {
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    programas_dirigidos_ids: newEvent.programas_dirigidos_ids.filter(id => id !== programa.id)
                                                                });
                                                            }
                                                        }}
                                                        style={{ width: 'auto' }}
                                                    />
                                                    <span style={{ fontSize: '0.9rem' }}>{programa.descripcion}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {newEvent.programas_dirigidos_ids.length > 0 && (
                                            <>
                                                <p style={{ fontSize: '0.85rem', color: '#2196f3', margin: '8px 0 0' }}>
                                                    ✓ {newEvent.programas_dirigidos_ids.length} programa(s) seleccionado(s)
                                                </p>

                                                {/* Checkbox para enviar difusión automática */}
                                                {!editingEventId && (
                                                    <label className={`difusion-box ${newEvent.enviar_difusion ? 'active' : 'inactive'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newEvent.enviar_difusion}
                                                            onChange={e => setNewEvent({
                                                                ...newEvent,
                                                                enviar_difusion: e.target.checked
                                                            })}
                                                            style={{ width: 'auto' }}
                                                        />
                                                        <div>
                                                            <strong style={{ display: 'block', color: newEvent.enviar_difusion ? '#2e7d32' : '#e65100' }}>
                                                                📧 {newEvent.enviar_difusion ? 'Se enviarán correos automáticamente' : 'Enviar correos de difusión al crear'}
                                                            </strong>
                                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                                                {newEvent.enviar_difusion
                                                                    ? 'Los estudiantes de los programas seleccionados recibirán un email de invitación'
                                                                    : 'Marca esta opción para notificar a los estudiantes automáticamente'}
                                                            </span>
                                                        </div>
                                                    </label>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Opciones Avanzadas (Refrigerio, QR) */}
                                <div className="event-modal-section">
                                    <h4 className="event-section-title">Opciones Adicionales</h4>

                                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '300px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={newEvent.requiere_entregable}
                                                    onChange={e => setNewEvent({ ...newEvent, requiere_entregable: e.target.checked })}
                                                    style={{ width: 'auto' }}
                                                />
                                                <strong>Requiere Entregables / Souvenirs</strong>
                                            </label>

                                            {newEvent.requiere_entregable && (
                                                <div className="refrigerio-list">
                                                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Tipo de entregables (Selecciona o escribe):</p>

                                                    {/* Botones de selección rápida */}
                                                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                                        {['Desayuno', 'Almuerzo', 'Cena', 'Refrigerio', 'Souvenir', 'Certificado Impreso'].map(tipo => (
                                                            <button
                                                                key={tipo}
                                                                type="button"
                                                                className="btn btn-sm btn-outline-secondary" // Puedes definir este estilo o usar inline
                                                                style={{
                                                                    fontSize: '0.8rem',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '15px',
                                                                    border: '1px solid #ccc',
                                                                    background: '#f9f9f9'
                                                                }}
                                                                onClick={() => {
                                                                    setNewEvent(prev => ({
                                                                        ...prev,
                                                                        entregables_items: [...prev.entregables_items, { id: Date.now(), name: tipo }]
                                                                    }));
                                                                }}
                                                            >
                                                                + {tipo}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {newEvent.entregables_items.map((item) => (
                                                        <div key={item.id} className="refrigerio-item">
                                                            <input
                                                                className="event-input"
                                                                placeholder="Ej: Souvenir, Desayuno..."
                                                                value={item.name}
                                                                onChange={e => {
                                                                    const newItems = newEvent.entregables_items.map(i =>
                                                                        i.id === item.id ? { ...i, name: e.target.value } : i
                                                                    );
                                                                    setNewEvent({ ...newEvent, entregables_items: newItems });
                                                                }}
                                                                style={{ flex: 1 }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                style={{ padding: '0 10px' }}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const newItems = newEvent.entregables_items.filter(i => i.id !== item.id);
                                                                    setNewEvent(prev => ({ ...prev, entregables_items: newItems }));
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ width: '100%', marginTop: '5px' }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setNewEvent(prev => ({
                                                                ...prev,
                                                                entregables_items: [...prev.entregables_items, { id: Date.now(), name: '' }]
                                                            }));
                                                        }}
                                                    >
                                                        + Agregar Otro
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={newEvent.asistencia_qr}
                                                    onChange={e => setNewEvent({ ...newEvent, asistencia_qr: e.target.checked })}
                                                    style={{ width: 'auto' }}
                                                />
                                                <strong>Controlar Asistencia (QR)</strong>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }} disabled={submitting}>
                                        {submitting ? '⏳ Procesando...' : (editingEventId ? '💾 Guardar Cambios' : '✨ Crear Evento')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventList;
