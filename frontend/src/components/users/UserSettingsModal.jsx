import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const UserSettingsModal = ({ onClose }) => {
    const { user, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        dependency: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || '',
                dependency: user.dependency || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                dependency: formData.dependency
            };
            
            if (formData.password) {
                payload.password = formData.password;
            }

            await updateProfile(payload);
            setSuccess("Perfil actualizado correctamente");
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // Clear password fields
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError("Error al actualizar perfil: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3>⚙️ Configuración de Perfil</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <div className="form-group">
                        <label>Identificación (No editable)</label>
                        <input type="text" value={user?.id || ''} disabled style={{ backgroundColor: '#f0f0f0' }} />
                    </div>

                    <div className="form-group">
                        <label>Rol</label>
                        <input type="text" value={user?.role || ''} disabled style={{ backgroundColor: '#f0f0f0' }} />
                    </div>

                    <div className="form-group">
                        <label>Nombre Completo</label>
                        <input 
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Dependencia</label>
                        <input 
                            name="dependency"
                            value={formData.dependency}
                            onChange={handleChange}
                            placeholder={user?.role === 'Estudiante' ? 'Programa Académico' : 'Departamento / Área'}
                        />
                    </div>

                    <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
                    <h4 style={{ margin: '0 0 15px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Cambiar Contraseña (Opcional)</h4>

                    <div className="form-group">
                        <label>Nueva Contraseña</label>
                        <input 
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Dejar en blanco para mantener la actual"
                        />
                    </div>

                    {formData.password && (
                        <div className="form-group">
                            <label>Confirmar Nueva Contraseña</label>
                            <input 
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserSettingsModal;
