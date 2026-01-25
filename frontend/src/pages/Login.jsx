import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';
import { showSuccess, showError, showToast } from '../services/alert';

// Programas académicos disponibles para estudiantes
const PROGRAMS = [
    'Contaduria Publica',
    'Tecnologia en Desarrollo de software',
    'Administracion de empresas',
    'Tecnologia agronoma',
    'Ingenieria agricola',
    'Ingenieria industrial'
];

const Login = () => {
    // Estado para el formulario de Login
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // Hooks de Autenticación y Navegación
    const { login } = useAuth();
    const navigate = useNavigate();

    // Redirección automática si el usuario ya está logueado
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) {
            switch(user.role) {
                case 'Administrador': navigate('/admin-dashboard'); break;
                case 'Estudiante': navigate('/student-dashboard'); break;
                case 'Docente': navigate('/teacher-dashboard'); break;
                case 'Asistente': navigate('/assistant-dashboard'); break;
                default: navigate('/');
            }
        }
    }, [navigate]);

    // Estado para el Modal de Registro
    const [showRegister, setShowRegister] = useState(false);
    const [regData, setRegData] = useState({
        full_name: '',
        id: '',
        email: '',
        role: 'Estudiante',
        dependency: 'Contaduria Publica', // Valor por defecto para estudiantes
        password: '',
        confirmPassword: '',
        verificationCode: ''
    });
    const [verificationStep, setVerificationStep] = useState(false); // Controls if we show the register form or the code input


    /**
     * Maneja el envío del formulario de Login.
     */
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(id, password);
             // Obtener usuario actualizado tras login exitoso
             const user = JSON.parse(localStorage.getItem('user'));
             // Redirigir según el rol
             switch(user.role) {
                case 'Administrador': navigate('/admin-dashboard'); break;
                case 'Estudiante': navigate('/student-dashboard'); break;
                case 'Docente': navigate('/teacher-dashboard'); break;
                case 'Asistente': navigate('/assistant-dashboard'); break;
                default: navigate('/');
            }
        } catch (err) {
            setError('Credenciales inválidas. Por favor intente de nuevo.');
        }
    };

    /**
     * Maneja el registro de nuevos usuarios.
     */
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (regData.password !== regData.confirmPassword) {
            showError("Error", "Las contraseñas no coinciden");
            return;
        }

        try {
            const payload = {
                id: regData.id,
                full_name: regData.full_name,
                email: regData.email,
                role: regData.role,
                password: regData.password,
                dependency: regData.role === 'Estudiante' ? regData.dependency : (regData.dependency || '')
            };

            await axios.post('http://localhost:8000/api/users/auth/register/', payload);
            
            // Éxito: Pasar al paso de verificación
            setVerificationStep(true);
            showToast("Código de verificación enviado a su correo", "info");
            
        } catch (error) {
            console.error(error);
            showError("Error al registrar", error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message);
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/users/auth/verify/', {
                id: regData.id,
                code: regData.verificationCode
            });
            
            showSuccess("¡Verificado!", "Cuenta verificada exitosamente. Ahora puedes iniciar sesión.");
            setShowRegister(false);
            setVerificationStep(false);
            
            // Autocompletar login
            setId(regData.id);
            setPassword('');
            // Limpiar form
            setRegData({...regData, password: '', confirmPassword: '', verificationCode: ''});

        } catch (error) {
             showError("Error de verificación", error.response?.data?.error || "Código incorrecto");
        }
    };

    /**
     * Genera una contraseña segura sugerida.
     */
    const suggestPassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let newPass = "";
        for (let i = 0; i < 12; i++) {
            newPass += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setRegData({ ...regData, password: newPass, confirmPassword: newPass });
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Iniciar Sesión</h2>
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                        <label htmlFor="id">Identificación</label>
                        <input 
                            type="text" 
                            id="id" 
                            value={id} 
                            onChange={(e) => setId(e.target.value)} 
                            required 
                            placeholder="Ingrese su identificación"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input 
                            type="password" 
                            id="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="Ingrese su contraseña"
                        />
                    </div>
                    <button type="submit" className="login-btn">Ingresar</button>
                    
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <span style={{ color: '#6c757d' }}>¿No tienes cuenta? </span>
                        <button 
                            type="button" 
                            onClick={() => setShowRegister(true)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--primary-color)', 
                                cursor: 'pointer', 
                                fontWeight: 'bold',
                                textDecoration: 'underline'
                            }}
                        >
                            Crear Cuenta
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL DE REGISTRO Y VERIFICACIÓN */}
            {showRegister && (
                <div className="modal-overlay" onClick={() => setShowRegister(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>{verificationStep ? 'Verificar Cuenta' : 'Crear Nueva Cuenta'}</h3>
                            <button className="modal-close" onClick={() => setShowRegister(false)}>✕</button>
                        </div>
                        
                        {verificationStep ? (
                             <form onSubmit={handleVerifySubmit}>
                                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                                    <p>Hemos enviado un código a <strong>{regData.email}</strong></p>
                                </div>
                                <div className="form-group">
                                    <label>Código de Verificación (4 dígitos)</label>
                                    <input 
                                        type="text"
                                        maxLength="4"
                                        value={regData.verificationCode}
                                        onChange={e => setRegData({...regData, verificationCode: e.target.value})}
                                        required
                                        placeholder="Ej: 1234"
                                        style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px'}}
                                    />
                                </div>
                                <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '10px' }}>
                                    Verificar y Activar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    style={{ width: '100%', marginTop: '10px' }}
                                    onClick={() => setVerificationStep(false)}
                                >
                                    Volver / Corregir Correo
                                </button>
                             </form>
                        ) : (
                        <form onSubmit={handleRegisterSubmit}>
                            <div className="form-group">
                                <label>Rol</label>
                                <select 
                                    value={regData.role}
                                    onChange={e => setRegData({...regData, role: e.target.value, dependency: e.target.value === 'Estudiante' ? 'Contaduria Publica' : ''})}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    <option value="Estudiante">Estudiante</option>
                                    <option value="Docente">Docente</option>
                                    <option value="Asistente">Asistente</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input 
                                    value={regData.full_name}
                                    onChange={e => setRegData({...regData, full_name: e.target.value})}
                                    required
                                />
                            </div>

                             <div className="form-group">
                                <label>Identificación</label>
                                <input 
                                    value={regData.id}
                                    onChange={e => setRegData({...regData, id: e.target.value})}
                                    required
                                />
                            </div>

                             <div className="form-group">
                                <label>Email (Obligatorio)</label>
                                <input 
                                    type="email"
                                    value={regData.email}
                                    onChange={e => setRegData({...regData, email: e.target.value})}
                                    required
                                />
                            </div>

                             <div className="form-group">
                                <label>Dependencia / Programa</label>
                                {regData.role === 'Estudiante' ? (
                                    <select 
                                        value={regData.dependency}
                                        onChange={e => setRegData({...regData, dependency: e.target.value})}
                                        style={{ width: '100%', padding: '8px' }}
                                    >
                                        {PROGRAMS.map(prog => (
                                            <option key={prog} value={prog}>{prog}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type="text"
                                        placeholder={regData.role === 'Docente' ? "Facultad / Departamento" : "Área"}
                                        value={regData.dependency}
                                        onChange={e => setRegData({...regData, dependency: e.target.value})}
                                    />
                                )}
                            </div>

                             <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ margin: 0 }}>Contraseña</label>
                                    <small 
                                        onClick={suggestPassword} 
                                        style={{ cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 'bold' }}
                                    >
                                        🪄 Sugerir
                                    </small>
                                </div>
                                <input 
                                    type="text" // Visible para ver la sugerencia, luego se puede ocultar si se implementa toggle
                                    value={regData.password}
                                    onChange={e => setRegData({...regData, password: e.target.value})}
                                    required
                                    minLength={6}
                                />
                            </div>
                             <div className="form-group">
                                <label>Confirmar Contraseña</label>
                                <input 
                                    type="password"
                                    value={regData.confirmPassword}
                                    onChange={e => setRegData({...regData, confirmPassword: e.target.value})}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                                Registrarse
                            </button>
                        </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
