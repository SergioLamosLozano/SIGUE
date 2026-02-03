import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import './styles/global.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

// Componentes del Dashboard
import AsistentesList from './components/users/AsistentesList'
import QRScanner from './components/qr/QRScanner'
import QRGenerator from './components/qr/QRGenerator'
import Statistics from './components/Statistics'

import EventList from './components/events/EventList'
import EventDashboard from './components/events/EventDashboard'
import UserProfile from './components/users/UserProfile'
import UserManagement from './components/users/UserManagement'
import ExcelUpload from './components/admin/ExcelUpload'
import ProgramasManagement from './components/admin/ProgramasManagement'

/**
 * Componente de Cabecera del Dashboard
 * Muestra el título y controles de usuario (perfil, cerrar sesión).
 */
const DashboardHeader = ({ title, homeLink = "/" }) => {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar" style={{ justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {homeLink && (
                    <Link to={homeLink} style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', marginRight: '10px' }}>
                        🏠
                    </Link>
                )}
                <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{title}</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: 'white', marginRight: '10px' }}>
                    Hola, <strong>{user?.full_name || user?.username || 'Usuario'}</strong>
                </span>

                {/* Enlace al perfil del usuario */}
                <Link
                    to="/profile"
                    className="btn"
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '0 5px',
                        textDecoration: 'none'
                    }}
                    title="Configuración"
                >
                    ⚙️
                </Link>

                <button
                    onClick={logout}
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '5px 12px', fontSize: '0.9rem' }}
                >
                    Salir
                </button>
            </div>
        </nav>
    );
};

/**
 * Menú principal para el Administrador
 * Botones grandes para navegar a las secciones principales.
 */
const AdminSelectionMenu = () => (
    <div style={{ padding: '40px 0', maxWidth: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ color: '#1f2937', fontSize: '2rem' }}>Panel de Control</h2>
        </div>

        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '25px',
            padding: '0 40px',
            alignItems: 'center'
        }}>

            <Link to="/admin-dashboard/events" style={{ textDecoration: 'none' }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f3f4f6',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center' // Centrado vertical
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#b91c1c';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#f3f4f6';
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '20px', background: '#fee2e2', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📅</div>
                    <h3 style={{ color: '#b91c1c', margin: '15px 0', fontSize: '1.5rem' }}>Gestión de Eventos</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Crear eventos, gestionar inscritos, generar QRs y controlar asistencia.</p>
                </div>
            </Link>

            <Link to="/admin-dashboard/users" style={{ textDecoration: 'none' }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f3f4f6',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#1e40af';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#f3f4f6';
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '20px', background: '#dbeafe', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
                    <h3 style={{ color: '#1e40af', margin: '15px 0', fontSize: '1.5rem' }}>Gestión de Usuarios</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Administrar usuarios, roles, contraseñas y permisos del sistema.</p>
                </div>
            </Link>

            <Link to="/admin-dashboard/estudiantes" style={{ textDecoration: 'none' }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f3f4f6',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#059669';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#f3f4f6';
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '20px', background: '#d1fae5', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎓</div>
                    <h3 style={{ color: '#059669', margin: '15px 0', fontSize: '1.5rem' }}>Estudiantes Activos</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Cargar estudiantes matriculados desde Excel para difusión de eventos.</p>
                </div>
            </Link>

            <Link to="/admin-dashboard/programas" style={{ textDecoration: 'none' }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f3f4f6',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#7c3aed';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#f3f4f6';
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '20px', background: '#ede9fe', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📚</div>
                    <h3 style={{ color: '#7c3aed', margin: '15px 0', fontSize: '1.5rem' }}>Programas Académicos</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Gestionar programas de estudio, facultades y carreras universitarias.</p>
                </div>
            </Link>

        </div>
    </div>
);

// Contenedor para gestión de eventos (Admin)
const AdminEvents = () => (
    <>
        <EventList canCreate={true} />
    </>
);

// Dashboard para Estudiantes
const StudentDashboard = () => (
    <>
        <h2>Panel de Estudiante</h2>
        <p>Bienvenido Estudiante. Aquí podrás ver, inscribirte y consultar el historial de eventos.</p>
        <EventList />
    </>
);

// Dashboard para Docentes
const TeacherDashboard = () => (
    <>
        <h2>Panel de Docente</h2>
        <p>Bienvenido Docente. Puedes crear eventos (sujetos a aprobación).</p>
        <EventList canCreate={true} />
    </>
);

// Dashboard para Asistentes (Staff de apoyo)
const AssistantDashboard = () => (
    <>
        <h2>Panel de Asistente</h2>
        {/* Los asistentes usan el escáner QR principalmente */}
        <QRScanner />
    </>
);


const ProfilePage = () => {
    const { user } = useAuth();
    let homeLink = "/";
    // Determinar a dónde redirigir el botón 'Home' según el rol
    if (user?.role === 'Administrador') homeLink = "/admin-dashboard";
    else if (user?.role === 'Estudiante') homeLink = "/student-dashboard";
    else if (user?.role === 'Docente') homeLink = "/teacher-dashboard";
    else if (user?.role === 'Asistente') homeLink = "/assistant-dashboard";

    return (
        <div className="container">
            <DashboardHeader title="Editar Perfil" homeLink={homeLink} />
            <UserProfile />
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Ruta Pública: Login */}
                        <Route path="/login" element={<Login />} />

                        {/* Rutas Protegidas - Administrador */}
                        <Route element={<ProtectedRoute allowedRoles={['Administrador']} />}>
                            <Route path="/admin-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Panel de Administración" homeLink="/admin-dashboard" />
                                    <AdminSelectionMenu />
                                </div>
                            } />
                            <Route path="/admin-dashboard/events" element={
                                <div className="container">
                                    <DashboardHeader title="Gestión de Eventos" homeLink="/admin-dashboard" />
                                    <AdminEvents />
                                </div>
                            } />
                            <Route path="/admin-dashboard/users" element={
                                <div className="container">
                                    <DashboardHeader title="Gestión de Usuarios" homeLink="/admin-dashboard" />
                                    <UserManagement />
                                </div>
                            } />
                            <Route path="/admin-dashboard/estudiantes" element={
                                <div className="container">
                                    <DashboardHeader title="Estudiantes Activos" homeLink="/admin-dashboard" />
                                    <div style={{ maxWidth: '800px', margin: '30px auto' }}>
                                        <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>🎓 Cargar Estudiantes Matriculados</h2>
                                        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
                                            Sube el archivo Excel con los estudiantes activos del semestre. Estos datos se usarán
                                            para enviar correos de difusión automática cuando crees eventos dirigidos a programas específicos.
                                        </p>
                                        <ExcelUpload />
                                    </div>
                                </div>
                            } />
                            <Route path="/admin-dashboard/programas" element={
                                <div className="container">
                                    <DashboardHeader title="Programas Académicos" homeLink="/admin-dashboard" />
                                    <ProgramasManagement />
                                </div>
                            } />
                            <Route path="/admin-dashboard/event/:id" element={<div className="container"><EventDashboard /></div>} />
                            <Route path="/admin-dashboard/event/:id/scanner" element={
                                <div className="container">
                                    <nav className="navbar">
                                        <h1>📸 Escáner de Evento</h1>
                                        <a href="javascript:history.back()" style={{ color: 'white', textDecoration: 'none' }}>⬅ Volver al Evento</a>
                                    </nav>
                                    <QRScanner />
                                </div>
                            } />
                            {/* Rutas Legacy (ocultas pero funcionales por si acaso) */}
                            <Route path="/admin-dashboard/generar-qr" element={<div className="container"><QRGenerator /></div>} />
                            <Route path="/admin-dashboard/stats" element={<div className="container"><Statistics /></div>} />
                        </Route>

                        {/* Rutas Protegidas - Estudiante */}
                        <Route element={<ProtectedRoute allowedRoles={['Estudiante']} />}>
                            <Route path="/student-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Estudiante" />
                                    <StudentDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Rutas Protegidas - Docente */}
                        <Route element={<ProtectedRoute allowedRoles={['Docente']} />}>
                            <Route path="/teacher-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Docente" />
                                    <TeacherDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Rutas Protegidas - Asistente (Staff) */}
                        <Route element={<ProtectedRoute allowedRoles={['Asistente', 'Administrador']} />}>
                            <Route path="/assistant-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Asistente" />
                                    <AssistantDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Ruta Común - Perfil */}
                        <Route path="/profile" element={<ProfilePage />} />

                        {/* Redirección por defecto a Login */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    )
}

export default App
