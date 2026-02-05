import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../services/alert';

const UserProfile = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        dependency: '',
        currentPassword: '', // Contraseña actual (requerida para cambios)
        newPassword: '',     // Nueva contraseña
        confirmPassword: ''  // Confirmación
    });
    const [loading, setLoading] = useState(false);

    // Redirección de seguridad si no hay usuario
    useEffect(() => {
        if (user === null) {
            navigate('/'); 
        }
    }, [user, navigate]);

    // Cargar datos iniciales
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

        // 1. Validación de Contraseñas
        if (formData.newPassword) {
            // Si intenta cambiar la contraseña, debe poner la actual
            if (!formData.currentPassword) {
                showError("Seguridad", "Debes ingresar tu contraseña actual para poder cambiarla.");
                return;
            }
            // Verificar coincidencia
            if (formData.newPassword !== formData.confirmPassword) {
                showError("Error", "Las nuevas contraseñas no coinciden.");
                return;
            }
        }

        setLoading(true);
        try {
            // Preparamos el payload básico
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                dependency: formData.dependency
            };
            
            // Solo adjuntamos datos de contraseña si el usuario quiere cambiarla
            if (formData.newPassword) {
                payload.current_password = formData.currentPassword; // Para validar en backend
                payload.password = formData.newPassword;             // La nueva a guardar
            }

            await updateProfile(payload);
            
            showSuccess("Perfil Actualizado", "Tus datos se han guardado correctamente.");
            
            // Limpiar campos de contraseña tras éxito
            setFormData(prev => ({ 
                ...prev, 
                currentPassword: '', 
                newPassword: '', 
                confirmPassword: '' 
            })); 

        } catch (err) {
            // Manejo de errores (ej: contraseña actual incorrecta)
            const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.response?.data?.current_password || err.message;
            showError("Error al actualizar", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null; 

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '40px auto' }}>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>👤 Mi Perfil</h2>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        ⬅ Volver
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* --- DATOS BÁSICOS --- */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Identificación</label>
                            <input type="text" value={user.id} disabled style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label>Rol</label>
                            <input type="text" value={user.role} disabled style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Nombre Completo</label>
                        <input name="full_name" value={formData.full_name} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label>Dependencia / Programa</label>
                        <input 
                            name="dependency" 
                            value={formData.dependency} 
                            onChange={handleChange} 
                            placeholder={user?.role === 'Estudiante' ? 'Programa Académico' : 'Departamento'}
                        />
                    </div>

                    {/* --- SECCIÓN DE CAMBIO DE CONTRASEÑA --- */}
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '30px', border: '1px solid #e9ecef' }}>
                        <h4 style={{ margin: '0 0 15px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔒 Cambiar Contraseña
                        </h4>
                        
                        <div className="form-group">
                            <label>Contraseña Actual</label>
                            <input 
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Ingresa tu contraseña actual para autorizar cambios"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Nueva Contraseña</label>
                                <input 
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="Nueva contraseña"
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirmar Nueva Contraseña</label>
                                <input 
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Repite la nueva contraseña"
                                    disabled={!formData.newPassword} // Se habilita solo si escribes una nueva
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 30px', fontSize: '1rem' }}>
                            {loading ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;