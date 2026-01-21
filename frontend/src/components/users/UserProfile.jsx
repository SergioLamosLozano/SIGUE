import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../services/alert';

/**
 * Componente de Perfil de Usuario.
 * Permite a cualquier usuario logueado ver y actualizar sus datos básicos y contraseña.
 */
const UserProfile = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        dependency: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    // Cargar datos del usuario al montar
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

    /**
     * Envía los cambios al backend.
     * Solo envía la contraseña si se ha llenado el campo.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validación de contraseña
        if (formData.password && formData.password !== formData.confirmPassword) {
            showError("Error", "Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                dependency: formData.dependency
            };
            
            // Adjuntar password solo si se desea cambiar
            if (formData.password) {
                payload.password = formData.password;
            }

            await updateProfile(payload);
            showSuccess("Perfil Actualizado", "Tus datos han sido guardados correctamente.");
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // Limpiar campos de password
        } catch (err) {
            showError("Error al actualizar", (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div>Cargando...</div>;

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '40px auto' }}>
            <div className="card">
                {/* CABECERA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>👤 Mi Perfil</h2>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        ⬅ Volver
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Campos de Solo Lectura */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Identificación</label>
                            <input type="text" value={user.id} disabled style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
                            <small style={{ color: '#666' }}>El ID no se puede cambiar.</small>
                        </div>

                        <div className="form-group">
                            <label>Rol</label>
                            <input type="text" value={user.role} disabled style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
                        </div>
                    </div>

                    {/* Campos Editables */}
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
                        <label>Dependencia / Programa</label>
                        <input 
                            name="dependency"
                            value={formData.dependency}
                            onChange={handleChange}
                            placeholder={user?.role === 'Estudiante' ? 'Programa Académico' : 'Departamento / Área'}
                        />
                    </div>

                    {/* Sección de Seguridad */}
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                        <h4 style={{ margin: '0 0 15px', color: 'var(--text-secondary)' }}>🔒 Seguridad</h4>
                        
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
                    </div>

                    {/* Botón Guardar */}
                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 30px' }}>
                            {loading ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;
