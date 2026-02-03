import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/ProgramasManagement.css';

const ProgramasManagement = () => {
    const navigate = useNavigate();
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedPrograma, setSelectedPrograma] = useState(null);
    const [formData, setFormData] = useState({ id: '', descripcion: '' });

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [programaToDelete, setProgramaToDelete] = useState(null);

    const token = localStorage.getItem('token');
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchProgramas();
    }, []);

    const fetchProgramas = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8000/api/programas/', authConfig);
            // Handle both array response and paginated response
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setProgramas(data);
            setError('');
        } catch (err) {
            setError('Error al cargar los programas');
            setProgramas([]); // Ensure it's always an array
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({ id: '', descripcion: '' });
        setSelectedPrograma(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (programa) => {
        setModalMode('edit');
        setFormData({ id: programa.id, descripcion: programa.descripcion });
        setSelectedPrograma(programa);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({ id: '', descripcion: '' });
        setSelectedPrograma(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.descripcion.trim()) {
            setError('El nombre del programa es obligatorio');
            return;
        }

        try {
            if (modalMode === 'create') {
                // Para crear, necesitamos enviar el ID también
                if (!formData.id) {
                    setError('El ID del programa es obligatorio');
                    return;
                }
                await axios.post('http://localhost:8000/api/programas/', formData, authConfig);
                setSuccessMessage('Programa creado exitosamente');
            } else {
                await axios.put(`http://localhost:8000/api/programas/${selectedPrograma.id}/`, formData, authConfig);
                setSuccessMessage('Programa actualizado exitosamente');
            }

            handleCloseModal();
            fetchProgramas();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al guardar el programa');
            console.error(err);
        }
    };

    const handleDeleteClick = (programa) => {
        setProgramaToDelete(programa);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await axios.delete(`http://localhost:8000/api/programas/${programaToDelete.id}/`, authConfig);
            setSuccessMessage('Programa eliminado exitosamente');
            setShowDeleteConfirm(false);
            setProgramaToDelete(null);
            fetchProgramas();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al eliminar el programa');
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="programas-container">
                <div className="loading-spinner">Cargando programas...</div>
            </div>
        );
    }

    return (
        <div className="programas-container">
            {/* Header */}
            <div className="programas-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary btn-back">
                        ← Volver
                    </button>
                    <h2>📚 Programas Académicos</h2>
                </div>
                <button onClick={handleOpenCreateModal} className="btn btn-primary btn-add">
                    + Nuevo Programa
                </button>
            </div>

            {/* Messages */}
            {error && <div className="alert alert-error">{error}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            {/* Table */}
            <div className="programas-table-container">
                <table className="programas-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre del Programa</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programas.map(programa => (
                            <tr key={programa.id}>
                                <td className="id-cell">{programa.id}</td>
                                <td className="name-cell">{programa.descripcion}</td>
                                <td className="actions-cell">
                                    <button
                                        onClick={() => handleOpenEditModal(programa)}
                                        className="btn btn-sm btn-edit"
                                        title="Editar programa"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(programa)}
                                        className="btn btn-sm btn-danger"
                                        title="Eliminar programa"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {programas.length === 0 && (
                    <div className="empty-state">
                        <p>No hay programas académicos registrados.</p>
                        <button onClick={handleOpenCreateModal} className="btn btn-primary">
                            Crear el primer programa
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalMode === 'create' ? '➕ Nuevo Programa' : '✏️ Editar Programa'}</h3>
                            <button className="modal-close" onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>ID del Programa *</label>
                                <input
                                    type="number"
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    placeholder="Ej: 101"
                                    required
                                    disabled={modalMode === 'edit'}
                                    className={modalMode === 'edit' ? 'input-disabled' : ''}
                                />
                                {modalMode === 'edit' && (
                                    <small className="help-text">El ID no puede modificarse</small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Nombre del Programa *</label>
                                <input
                                    type="text"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Ej: Ingeniería de Sistemas"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {modalMode === 'create' ? 'Crear Programa' : 'Guardar Cambios'}
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
                            <p>¿Estás seguro de eliminar el programa:</p>
                            <p className="programa-name"><strong>{programaToDelete?.descripcion}</strong></p>
                            <p className="warning-text">Esta acción no se puede deshacer y podría afectar a los estudiantes asociados.</p>
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

export default ProgramasManagement;
