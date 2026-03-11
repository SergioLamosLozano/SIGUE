import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { showSuccess, showError, showConfirm } from '../../services/alert';
import '../../styles/StaffManagement.css';

/**
 * Componente de Gestión de Staff para el Coordinador.
 * Permite:
 * 1. Seleccionar uno de sus eventos y ver sus fechas.
 * 2. Buscar usuarios (Estudiante/Docente) por nombre, ID o correo.
 * 3. Asignar o quitar permisos temporales de staff en ese evento.
 */
const StaffManagement = () => {
    const navigate = useNavigate();

    // --- Estado general ---
    const [mis_eventos, setMisEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [staffActual, setStaffActual] = useState([]);

    // --- Estado de búsqueda ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // --- Estado de acciones ---
    const [loadingAction, setLoadingAction] = useState(null); // usuario_id siendo procesado

    // --- Cargar mis eventos ---
useEffect(() => {
    const cargarDatos = async () => {
        try {
            const res = await api.get('/eventos/');
            // Accedemos a .results por si la API está paginada
            const listaEventos = Array.isArray(res.data) ? res.data : res.data.results;
            
            if (listaEventos) {
                const propios = listaEventos.filter(e => e.creado_por != null);
                setMisEventos(propios);
            }
        } catch (e) {
            console.error('Error cargando eventos:', e);
        }
    };
    cargarDatos();
}, []);

    // --- Cargar staff del evento seleccionado ---
    const fetchStaff = useCallback(async (eventoId) => {
        try {
            const res = await api.get(`/eventos/${eventoId}/staff/`);
            setStaffActual(res.data);
        } catch (e) {
            console.error('Error cargando staff:', e);
            setStaffActual([]);
        }
    }, []);

    const handleEventoChange = (e) => {
        const id = e.target.value;
        if (!id) { setSelectedEvento(null); setStaffActual([]); return; }
        const evento = mis_eventos.find(ev => String(ev.id) === String(id));
        setSelectedEvento(evento || null);
        if (evento) fetchStaff(evento.id);
    };

    // --- Búsqueda de usuarios ---
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        const timeout = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get(`/users/search/?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data.results || []);
            } catch (e) {
                console.error('Error buscando usuarios:', e);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // --- Verificar si un usuario ya es staff ---
    const isStaff = (usuario_id) => staffActual.some(s => s.usuario_id === String(usuario_id));

    // --- Asignar Staff ---
    const handleAsignarStaff = async (usuario) => {
        if (!selectedEvento) { showError('Error', 'Primero selecciona un evento'); return; }
        const confirmed = await showConfirm(
            'Asignar Staff',
            `¿Asignar a ${usuario.full_name} como staff temporal en "${selectedEvento.titulo}"?`
        );
        if (!confirmed) return;
        setLoadingAction(usuario.id);
        try {
            await api.post(`/eventos/${selectedEvento.id}/staff/agregar/`, { usuario_id: usuario.id });
            showSuccess('¡Staff asignado!', `${usuario.full_name} ahora es staff de ${selectedEvento.titulo}`);
            fetchStaff(selectedEvento.id);
        } catch (e) {
            showError('Error', e.response?.data?.error || 'No se pudo asignar staff');
        } finally {
            setLoadingAction(null);
        }
    };

    // --- Quitar Staff ---
    const handleQuitarStaff = async (usuario) => {
        if (!selectedEvento) return;
        const confirmed = await showConfirm(
            'Quitar Staff',
            `¿Quitar los permisos de staff de ${usuario.full_name} en "${selectedEvento.titulo}"?`
        );
        if (!confirmed) return;
        setLoadingAction(usuario.id);
        try {
            await api.delete(`/eventos/${selectedEvento.id}/staff/quitar/${usuario.id}/`);
            showSuccess('Staff removido', `${usuario.full_name} ya no tiene permisos de staff`);
            fetchStaff(selectedEvento.id);
        } catch (e) {
            showError('Error', e.response?.data?.error || 'No se pudo quitar el staff');
        } finally {
            setLoadingAction(null);
        }
    };

    // --- Helpers de fecha ---
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

    return (
        <div className="staff-mgmt">
            {/* Header */}
            <div className="staff-mgmt__header">
                <button onClick={() => navigate('/coordinador-dashboard')} className="staff-mgmt__back-btn">
                    ← Volver
                </button>
                <h1 className="staff-mgmt__title">👷 Gestión de Staff</h1>
            </div>

            {/* Selector de Evento */}
            <div className="staff-mgmt__section">
                <h2 className="staff-mgmt__section-title">1. Selecciona un Evento</h2>
                <select
                    className="staff-mgmt__select"
                    onChange={handleEventoChange}
                    defaultValue=""
                >
                    <option value="">— Elige un evento —</option>
                    {mis_eventos.map(ev => (
                        <option key={ev.id} value={ev.id}>
                            {ev.titulo} [{ev.estado}]
                        </option>
                    ))}
                </select>

                {selectedEvento && (
                    <div className="staff-mgmt__evento-info">
                        <div className="staff-mgmt__evento-badge" data-estado={selectedEvento.estado}>
                            {selectedEvento.estado}
                        </div>
                        <div className="staff-mgmt__evento-dates">
                            <span>📅 <strong>Inicio:</strong> {formatDate(selectedEvento.fecha)}</span>
                            <span>🏁 <strong>Fin:</strong> {formatDate(selectedEvento.fecha_fin)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Staff Actual */}
            {selectedEvento && (
                <div className="staff-mgmt__section">
                    <h2 className="staff-mgmt__section-title">Staff Asignado ({staffActual.length})</h2>
                    {staffActual.length === 0 ? (
                        <p className="staff-mgmt__empty">No hay staff asignado aún.</p>
                    ) : (
                        <div className="staff-mgmt__list">
                            {staffActual.map(s => (
                                <div key={s.id} className="staff-mgmt__item">
                                    <div className="staff-mgmt__item-info">
                                        <strong>{s.usuario_nombre}</strong>
                                        <span className="staff-mgmt__item-role">{s.usuario_role}</span>
                                        <small>{s.usuario_email}</small>
                                    </div>
                                    <button
                                        className="staff-mgmt__btn staff-mgmt__btn--remove"
                                        onClick={() => handleQuitarStaff({ id: s.usuario_id, full_name: s.usuario_nombre })}
                                        disabled={loadingAction === s.usuario_id}
                                    >
                                        {loadingAction === s.usuario_id ? '...' : '✕ Quitar Staff'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Buscador de usuarios */}
            <div className="staff-mgmt__section">
                <h2 className="staff-mgmt__section-title">2. Buscar y Asignar Staff</h2>
                {!selectedEvento && (
                    <p className="staff-mgmt__hint">⚠️ Primero selecciona un evento arriba para poder asignar staff.</p>
                )}
                <div className="staff-mgmt__search-bar">
                    <span className="staff-mgmt__search-icon">🔍</span>
                    <input
                        type="text"
                        className="staff-mgmt__search-input"
                        placeholder="Buscar por nombre, identificación o correo..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searching && <span className="staff-mgmt__search-spinner">⏳</span>}
                </div>

                {searchResults.length > 0 && (
                    <div className="staff-mgmt__results">
                        {searchResults.map(u => {
                            const yaEsStaff = isStaff(u.id);
                            const loading = loadingAction === u.id;
                            return (
                                <div key={u.id} className="staff-mgmt__item">
                                    <div className="staff-mgmt__item-info">
                                        <strong>{u.full_name}</strong>
                                        <span className="staff-mgmt__item-role">{u.role}</span>
                                        <small>{u.email} · Doc: {u.id}</small>
                                        {u.dependency && <small>Dep: {u.dependency}</small>}
                                    </div>
                                    {yaEsStaff ? (
                                        <button
                                            className="staff-mgmt__btn staff-mgmt__btn--remove"
                                            onClick={() => handleQuitarStaff(u)}
                                            disabled={!selectedEvento || loading}
                                        >
                                            {loading ? '...' : '✕ Quitar Staff'}
                                        </button>
                                    ) : (
                                        <button
                                            className="staff-mgmt__btn staff-mgmt__btn--assign"
                                            onClick={() => handleAsignarStaff(u)}
                                            disabled={!selectedEvento || loading}
                                        >
                                            {loading ? '...' : '✔ Dar Staff'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="staff-mgmt__empty">No se encontraron usuarios con ese criterio.</p>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;
