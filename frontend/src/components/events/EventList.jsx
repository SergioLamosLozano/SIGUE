import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showConfirm } from '../../services/alert';
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
    
    // Hooks
    const navigate = useNavigate();
    const { user } = useAuth();

    // Estado para el formulario de Nuevo Evento
    const [newEvent, setNewEvent] = useState({
        titulo: '',
        descripcion: '',
        fecha: '',
        fecha_fin: '',
        lugar: '',
        requiere_refrigerio: false,
        cantidad_refrigerios: 0,
        refrigerios_items: [], // Array de objetos {id, name} para múltiples comidas
        asistencia_qr: false
    });
    const [flyerFile, setFlyerFile] = useState(null);

    // Configuración de Auth para Axios
    const token = localStorage.getItem('token');
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

    useEffect(() => {
        fetchEventos();
    }, []);

    // --- MANEJADORES DE ACCIÓN ---

    const handleFileChange = (e) => {
        setFlyerFile(e.target.files[0]);
    };

    /**
     * Envía el formulario para crear un nuevo evento.
     * Maneja FormData para permitir subida de imágenes (flyer).
     */
    const handleCreate = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('titulo', newEvent.titulo);
        formData.append('descripcion', newEvent.descripcion);
        formData.append('fecha', newEvent.fecha);
        if(newEvent.fecha_fin) formData.append('fecha_fin', newEvent.fecha_fin);
        formData.append('lugar', newEvent.lugar);
        formData.append('requiere_refrigerio', newEvent.requiere_refrigerio);
        
        // Lógica de refrigerios: Si hay items específicos, generar JSON de detalles
        let totalQty = newEvent.cantidad_refrigerios;
        if(newEvent.refrigerios_items.length > 0) {
            const itemsNames = newEvent.refrigerios_items.map(i => i.name).filter(n => n.trim() !== '');
            formData.append('detalles_refrigerios', JSON.stringify({ items: itemsNames }));
            totalQty = 0; // Se calculará dinámicamente si es complejo, o se ignora en este modo
        }
        
        formData.append('cantidad_refrigerios', totalQty);
        formData.append('asistencia_qr', newEvent.asistencia_qr);
        
        if (flyerFile) {
            formData.append('flyer', flyerFile);
        }

        try {
            await axios.post('http://localhost:8000/api/eventos/', formData, {
                headers: {
                    ...authConfig.headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowModal(false);
            resetForm();
            fetchEventos(); // Recargar lista
            showSuccess('Evento creado exitosamente');
        } catch (error) {
            console.error(error);
            showError('Error al crear evento: ' + (error.response?.data?.detail || error.message));
        }
    };

    const resetForm = () => {
        setNewEvent({
            titulo: '',
            descripcion: '',
            fecha: '',
            fecha_fin: '',
            lugar: '',
            requiere_refrigerio: false,
            cantidad_refrigerios: 0,
            refrigerios_items: [],
            asistencia_qr: false
        });
        setFlyerFile(null);
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
        if(!confirmed) return;
        
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
        if(!confirmed) return;

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

            // Docentes pueden ver sus propios eventos en 'available' si son recientes, 
            // o en 'history' si pasaron.
            // PERO: Si el docente creó el evento, tal vez no quiera "inscribirse".
            // Aun así, permitimos que se muestre.

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
            <div className="event-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {isAdmin && (
                        <button 
                            onClick={() => navigate('/admin-dashboard')} 
                            className="btn btn-secondary"
                            title="Volver al Panel"
                        >
                            ⬅ Volver
                        </button>
                    )}
                    <h2 style={{ margin: 0 }}>
                        {isAdmin ? 'Gestión de Eventos' : 'Eventos y Actividades'}
                    </h2>
                </div>
                
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        ➕ Crear Nuevo Evento
                    </button>
                )}
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
                </div>
            )}

            {/* LISTA DE EVENTOS (GRID) */}
            {displayedEvents.length === 0 ? (
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
                            {/* IMAGEN DE FLYER SI EXISTE */}
                            {evento.flyer && (
                                <div className="event-image-container">
                                    <img src={evento.flyer} alt={evento.titulo} className="event-image" />
                                </div>
                            )}
                            
                            <div className="event-content">
                                <h3 className="event-title">{evento.titulo}</h3>
                                <div className="event-info">
                                    📅 {new Date(evento.fecha).toLocaleString()}
                                </div>
                                <div className="event-info">
                                    📍 {evento.lugar}
                                </div>
                                
                                <p className="event-description">{evento.descripcion}</p>
                                
                                {/* Badges informativos */}
                                <div className="event-badges">
                                    {evento.estado === 'PENDIENTE' && <span className="badge badge-warning">⏳ Pendiente</span>}
                                    {evento.requiere_refrigerio && <span className="badge badge-refrigerio">🍿 Refrigerio</span>}
                                    {evento.asistencia_qr && <span className="badge badge-qr">📱 QR</span>}
                                </div>
                                
                                {/* BOTONES DE ACCIÓN */}
                                <div className="event-actions">
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px', width: '100%'}}>
                                        
                                        {/* --- GESTIÓN (Admin o Dueño) --- */}
                                        {(isAdmin || (canCreate && evento.creado_por === user.id)) && (
                                            <div style={{display: 'flex', gap: '5px', width: '100%'}}>
                                                {/* Aprobar (Solo Admin y Pendiente) */}
                                                {isAdmin && evento.estado === 'PENDIENTE' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(evento.id); }} 
                                                        className="btn btn-success" 
                                                        style={{ flex: 1 }}
                                                    >
                                                        ✅ Aprobar
                                                    </button>
                                                )}
                                                
                                                {/* Eliminar (Admin o Dueño) */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(evento.id); }} 
                                                    className="btn btn-danger" 
                                                    style={{ flex: 1 }}
                                                >
                                                    🗑 Eliminar
                                                </button>
                                            </div>
                                        )}

                                        {/* --- PARTICIPACIÓN (Todos excepto Admin, o incluso Admin si quisiera) --- */}
                                        {/* Docentes y Estudiantes pueden unirse. 
                                            Si el Docente es el creador, puede unirse también si desea (para generar su propio QR). 
                                        */}
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
            
            {/* MODAL DE CREACIÓN (SOLO ADMIN) */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Crear Nuevo Evento</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            {/* ... Campos del formulario (Título, Fecha, Lugar) ... */}
                            <div className="form-group">
                                <label>Título del Evento</label>
                                <input 
                                    value={newEvent.titulo} 
                                    onChange={e => setNewEvent({...newEvent, titulo: e.target.value})} 
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea 
                                    value={newEvent.descripcion} 
                                    onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})} 
                                    style={{ minHeight: '80px' }}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha y Hora Inicio</label>
                                    <input 
                                        type="datetime-local" 
                                        value={newEvent.fecha} 
                                        onChange={e => setNewEvent({...newEvent, fecha: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha y Hora Fin (Opcional)</label>
                                    <input 
                                        type="datetime-local" 
                                        value={newEvent.fecha_fin} 
                                        onChange={e => setNewEvent({...newEvent, fecha_fin: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Lugar</label>
                                <input 
                                    value={newEvent.lugar} 
                                    onChange={e => setNewEvent({...newEvent, lugar: e.target.value})} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label>Flyer / Imagen Promocional</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Opciones Avanzadas (Refrigerio, QR) */}
                            <div className="modal-section">
                                <h4 className="modal-section-title">Opciones Adicionales</h4>
                                
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '300px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={newEvent.requiere_refrigerio}
                                                onChange={e => setNewEvent({...newEvent, requiere_refrigerio: e.target.checked})}
                                                style={{ width: 'auto' }}
                                            />
                                            <strong>Requiere Refrigerio</strong>
                                        </label>
                                        
                                        {newEvent.requiere_refrigerio && (
                                            <div className="refrigerio-list">
                                                <p style={{margin: '0 0 10px', fontSize: '0.9rem'}}>Define qué comidas se darán:</p>
                                                
                                                {newEvent.refrigerios_items.map((item) => (
                                                    <div key={item.id} className="refrigerio-item">
                                                        <input 
                                                            placeholder="Ej: Desayuno, Almuerzo"
                                                            value={item.name}
                                                            onChange={e => {
                                                                const newItems = newEvent.refrigerios_items.map(i => 
                                                                    i.id === item.id ? { ...i, name: e.target.value } : i
                                                                );
                                                                setNewEvent({...newEvent, refrigerios_items: newItems});
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
                                                                const newItems = newEvent.refrigerios_items.filter(i => i.id !== item.id);
                                                                setNewEvent(prev => ({...prev, refrigerios_items: newItems}));
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
                                                            refrigerios_items: [...prev.refrigerios_items, { id: Date.now(), name: '' }]
                                                        }));
                                                    }}
                                                >
                                                    + Agregar Comida
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={newEvent.asistencia_qr}
                                                onChange={e => setNewEvent({...newEvent, asistencia_qr: e.target.checked})}
                                                style={{ width: 'auto' }}
                                            />
                                            <strong>Controlar Asistencia (QR)</strong>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Crear Evento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventList;
