import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/ProgramasManagement.css'; // Reusing styles

const LugaresManagement = ({ hideHeader = false }) => {
    const [lugares, setLugares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedLugar, setSelectedLugar] = useState(null);
    const [formData, setFormData] = useState({ descripcion: '' });

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [lugarToDelete, setLugarToDelete] = useState(null);

    const token = sessionStorage.getItem('token');
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchLugares();
    }, []);

    const fetchLugares = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8000/api/locations/', authConfig);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setLugares(data);
            setError('');
        } catch (err) {
            setError('Error al cargar las ubicaciones');
            setLugares([]);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({ descripcion: '' });
        setSelectedLugar(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (lugar) => {
        setModalMode('edit');
        setFormData({ descripcion: lugar.descripcion });
        setSelectedLugar(lugar);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({ descripcion: '' });
        setSelectedLugar(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.descripcion.trim()) {
            setError('La descripción del lugar es obligatoria');
            return;
        }

        try {
            if (modalMode === 'create') {
                await axios.post('http://localhost:8000/api/locations/', formData, authConfig);
                setSuccessMessage('Lugar creado exitosamente');
            } else {
                await axios.put(`http://localhost:8000/api/locations/${selectedLugar.id}/`, formData, authConfig);
                setSuccessMessage('Lugar actualizado exitosamente');
            }

            handleCloseModal();
            fetchLugares();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al guardar la ubicación');
            console.error(err);
        }
    };

    const handleDeleteClick = (lugar) => {
        setLugarToDelete(lugar);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await axios.delete(`http://localhost:8000/api/locations/${lugarToDelete.id}/`, authConfig);
            setSuccessMessage('Lugar eliminado exitosamente');
            setShowDeleteConfirm(false);
            setLugarToDelete(null);
            fetchLugares();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            // Check for specific error related to PROTECT
            if (err.response?.status === 500 || err.response?.data?.detail?.includes('ProtectedError')) {
                setError('No se puede eliminar este lugar porque tiene eventos asociados.');
            } else {
                setError(err.response?.data?.detail || 'Error al eliminar la ubicación');
            }
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="programas-container">
                <div className="loading-spinner">Cargando ubicaciones...</div>
            </div>
        );
    }

    return (
        <div className="programas-container">
            {!hideHeader && (
                <div className="programas-header">
                    <div className="header-left">
                        <h2>📍 Gestión de Ubicaciones</h2>
                    </div>
                    <button onClick={handleOpenCreateModal} className="btn btn-primary btn-add">
                        + Nueva Ubicación
                    </button>
                </div>
            )}

            {hideHeader && (
                <div className="programas-subheader" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button onClick={handleOpenCreateModal} className="btn btn-primary btn-add">
                        + Nueva Ubicación
                    </button>
                </div>
            )}

            {/* Messages */}
            {error && <div className="alert alert-error">{error}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            {/* Table */}
            <div className="programas-table-container">
                <table className="programas-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Descripción del Lugar</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lugares.map(lugar => (
                            <tr key={lugar.id}>
                                <td className="id-cell">{lugar.id}</td>
                                <td className="name-cell">{lugar.descripcion}</td>
                                <td className="actions-cell">
                                    <button
                                        onClick={() => handleOpenEditModal(lugar)}
                                        className="btn btn-sm btn-edit"
                                        title="Editar lugar"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(lugar)}
                                        className="btn btn-sm btn-danger"
                                        title="Eliminar lugar"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {lugares.length === 0 && (
                    <div className="empty-state">
                        <p>No hay ubicaciones registradas.</p>
                        <button onClick={handleOpenCreateModal} className="btn btn-primary">
                            Crear la primera ubicación
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalMode === 'create' ? '➕ Nueva Ubicación' : '✏️ Editar Ubicación'}</h3>
                            <button className="modal-close" onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Descripción del Lugar *</label>
                                <input
                                    type="text"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Ej: Auditorio Principal"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {modalMode === 'create' ? 'Crear Ubicación' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header modal-header-danger">
                            <h3>⚠️ Confirmar Eliminación</h3>
                        </div>
                        <div className="modal-body">
                            <p>¿Estás seguro de eliminar el lugar:</p>
                            <p className="programa-name"><strong>{lugarToDelete?.descripcion}</strong></p>
                            <p className="warning-text">Esta acción no se puede deshacer. Si el lugar tiene eventos asociados, no podrá eliminarse.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete}>
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LugaresManagement;
