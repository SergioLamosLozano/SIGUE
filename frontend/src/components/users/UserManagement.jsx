import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showConfirm, showToast } from '../../services/alert';
import '../../styles/UserManagement.css';

/**
 * Componente de Gestión de Usuarios para Administradores.
 * Permite listar, crear, editar y eliminar usuarios del sistema.
 */
const UserManagement = () => {
    const navigate = useNavigate();
    
    // Estados de datos
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados de UI (Búsqueda y Paginación)
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estados del Modal (Crear/Editar)
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [formData, setFormData] = useState({
        id: '',
        full_name: '',
        email: '',
        role: 'Estudiante',
        dependency: '',
        password: '',
        is_active: true
    });

    // Configuración API
    const token = localStorage.getItem('token');
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };
    const API_URL = 'http://localhost:8000/api/users/manage/';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_URL, authConfig);
            // Manejar paginación de DRF si aplica (results) o lista directa
            const results = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setUsers(results);
        } catch (error) {
            console.error(error);
            showError('Error', 'No se pudieron cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    // --- Búsqueda y Paginación ---
    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        return (
            user.full_name.toLowerCase().includes(term) ||
            user.id.toLowerCase().includes(term) ||
            (user.email && user.email.toLowerCase().includes(term))
        );
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Operaciones CRUD ---

    const handleOpenCreate = () => {
        setModalMode('create');
        setFormData({
            id: '',
            full_name: '',
            email: '',
            role: 'Estudiante',
            dependency: '',
            password: '',
            is_active: true
        });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setModalMode('edit');
        setFormData({
            id: user.id,
            full_name: user.full_name,
            email: user.email || '',
            role: user.role,
            dependency: user.dependency || '',
            password: '', // No mostrar password encriptado
            is_active: user.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (user) => {
        const confirmed = await showConfirm(
            'Eliminar Usuario', 
            `¿Estás seguro de eliminar a ${user.full_name}? Esta acción no se puede deshacer.`
        );
        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}${user.id}/`, authConfig);
            showSuccess('Eliminado', 'Usuario eliminado correctamente');
            fetchUsers();
        } catch (error) {
            showError('Error', 'No se pudo eliminar el usuario: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await axios.post(API_URL, formData, authConfig);
                showSuccess('Creado', 'Usuario creado exitosamente');
            } else {
                // Modo Edición
                const payload = { ...formData };
                if (!payload.password) delete payload.password; // No enviar campo vacío si no se cambia pass
                
                await axios.patch(`${API_URL}${formData.id}/`, payload, authConfig);
                showSuccess('Actualizado', 'Usuario actualizado correctamente');
            }
            setShowModal(false);
            fetchUsers();
        } catch (error) {
            showError('Error', 'Operación fallida: ' + JSON.stringify(error.response?.data || error.message));
        }
    };

    return (
        <div className="user-management-container">
             {/* HEADER */}
             <div className="user-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate('/admin-dashboard')}
                        title="Volver al Panel"
                    >
                        ⬅ Volver
                    </button>
                    <h2 style={{ margin: 0 }}>👤 Gestión de Usuarios</h2>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreate}>
                    ➕ Crear Nuevo Usuario
                </button>
            </div>

            <div className="user-table-card">
                
                {/* BARRA DE BÚSQUEDA */}
                <div className="user-search-container">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar por nombre, cédula o email..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="search-input"
                    />
                </div>

                {/* TABLA DE USUARIOS */}
                <div className="user-table-wrapper">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>ID / Cédula</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Dependencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.full_name}</td>
                                    <td>{user.email || '-'}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'Administrador' ? 'badge-primary' : 'badge-secondary'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.dependency}</td>
                                    <td>
                                        {user.is_active ? 
                                            <span className="status-active">Activo</span> : 
                                            <span className="status-inactive">Inactivo</span>
                                        }
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" style={{ marginRight: '5px' }} onClick={() => handleOpenEdit(user)} title="Editar">
                                            ✏️
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user)} title="Eliminar">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {currentUsers.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="pagination">
                         <button 
                            className="btn btn-sm btn-secondary" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(cp => cp - 1)}
                        >
                            Anterior
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button 
                            className="btn btn-sm btn-secondary" 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(cp => cp + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>{modalMode === 'create' ? 'Crear Usuario' : 'Editar Usuario'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Identificación (ID/Cédula)</label>
                                <input 
                                    value={formData.id} 
                                    onChange={e => setFormData({...formData, id: e.target.value})}
                                    disabled={modalMode === 'edit'} // No se puede cambiar ID al editar
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input 
                                    value={formData.full_name} 
                                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                                    required
                                />
                            </div>
                             <div className="form-group">
                                <label>Correo Electrónico</label>
                                <input 
                                    type="email"
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Rol</label>
                                <select 
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    className="form-group select" 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value="Estudiante">Estudiante</option>
                                    <option value="Docente">Docente</option>
                                    <option value="Asistente">Asistente (Admin Eventos)</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                             <div className="form-group">
                                <label>Dependencia / Programa</label>
                                <input 
                                    value={formData.dependency} 
                                    onChange={e => setFormData({...formData, dependency: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>{modalMode === 'create' ? 'Contraseña' : 'Nueva Contraseña (Opcional)'}</label>
                                <input 
                                    type="password"
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    required={modalMode === 'create'}
                                />
                            </div>
                             <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="checkbox"
                                    checked={!formData.is_active} 
                                    onChange={e => setFormData({...formData, is_active: !e.target.checked})}
                                    style={{ width: 'auto' }}
                                />
                                <label style={{ margin: 0 }}>Desactivar Usuario (Bloquear Acceso)</label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
