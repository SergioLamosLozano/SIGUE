/**
 * App.jsx - Main Application Component
 * 
 * Principal entry point for the SIGUE application.
 * Uses semantic CSS classes from App.css instead of inline styles.
 */

import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import './App.css'
import './styles/global.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

// Dashboard Components
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
import CertificatesPanel from './components/admin/CertificatesPanel'

/**
 * DashboardHeader Component
 * Displays title and user controls (profile, logout).
 */
const DashboardHeader = ({ title, homeLink = "/" }) => {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar dashboard-header">
            <div className="dashboard-header__left">
                {homeLink && (
                    <Link to={homeLink} className="dashboard-header__home-link" title="Inicio">
                        🏠
                    </Link>
                )}
                <h1 className="dashboard-header__title">{title}</h1>
            </div>

            <div className="dashboard-header__right">
                <span className="dashboard-header__user">
                    Hola, <strong>{user?.full_name || user?.username || 'Usuario'}</strong>
                </span>

                <Link to="/profile" className="dashboard-header__settings-btn" title="Configuración">
                    ⚙️
                </Link>

                <button onClick={logout} className="dashboard-header__logout-btn">
                    Salir
                </button>
            </div>
        </nav>
    );
};

/**
 * DashboardCard Component
 * Reusable card for admin dashboard menu items.
 */
const DashboardCard = ({ to, icon, title, description }) => (
    <Link to={to} className="dashboard-card">
        <div className="dashboard-card__icon">{icon}</div>
        <h3 className="dashboard-card__title">{title}</h3>
        <p className="dashboard-card__description">{description}</p>
    </Link>
);

/**
 * AdminSelectionMenu Component
 * Main menu for administrators with navigation cards.
 * Uses Univalle institutional color palette (red).
 */
const AdminSelectionMenu = () => (
    <div className="admin-panel">
        <div className="admin-panel__title">
            <h2>Panel de Control</h2>
        </div>

        <div className="dashboard-grid">
            <DashboardCard
                to="/admin-dashboard/events"
                icon="📅"
                title="Gestión de Eventos"
                description="Crear eventos, gestionar inscritos, generar QRs y controlar asistencia."
            />

            <DashboardCard
                to="/admin-dashboard/users"
                icon="👥"
                title="Gestión de Usuarios"
                description="Administrar usuarios, roles, contraseñas y permisos del sistema."
            />

            <DashboardCard
                to="/admin-dashboard/estudiantes"
                icon="🎓"
                title="Estudiantes Activos"
                description="Cargar estudiantes matriculados desde Excel para difusión de eventos."
            />

            <DashboardCard
                to="/admin-dashboard/programas"
                icon="📚"
                title="Programas Académicos"
                description="Gestionar programas de estudio, facultades y carreras universitarias."
            />

            <DashboardCard
                to="/admin-dashboard/certificates"
                icon="📜"
                title="Certificados"
                description="Gestionar plantillas y generar certificados de asistencia."
            />
        </div>
    </div>
);

// Event Management Container (Admin)
const AdminEvents = () => (
    <>
        <EventList canCreate={true} />
    </>
);

// Student Dashboard
const StudentDashboard = () => (
    <div className="role-panel">
        <h2>Panel de Estudiante</h2>
        <p>Bienvenido Estudiante. Aquí podrás ver, inscribirte y consultar el historial de eventos.</p>
        <EventList />
    </div>
);

// Teacher Dashboard
const TeacherDashboard = () => (
    <div className="role-panel">
        <h2>Panel de Docente</h2>
        <p>Bienvenido Docente. Puedes crear eventos (sujetos a aprobación).</p>
        <EventList canCreate={true} />
    </div>
);

// Assistant Dashboard (Support Staff)
const AssistantDashboard = () => (
    <div className="role-panel">
        <h2>Panel de Asistente</h2>
        <QRScanner />
    </div>
);

// Profile Page Component
const ProfilePage = () => {
    const { user } = useAuth();
    let homeLink = "/";
    
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

/**
 * Main App Component
 * Defines all application routes and authentication logic.
 */
function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Public Route: Login */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected Routes - Administrator */}
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
                                    <ExcelUpload />
                                </div>
                            } />
                            <Route path="/admin-dashboard/programas" element={
                                <div className="container">
                                    <DashboardHeader title="Programas Académicos" homeLink="/admin-dashboard" />
                                    <ProgramasManagement />
                                </div>
                            } />
                            <Route path="/admin-dashboard/certificates" element={
                                <div className="container">
                                    <DashboardHeader title="Gestión de Certificados" homeLink="/admin-dashboard" />
                                    <CertificatesPanel />
                                </div>
                            } />
                            <Route path="/admin-dashboard/event/:id" element={
                                <div className="container">
                                    <EventDashboard />
                                </div>
                            } />
                            <Route path="/admin-dashboard/event/:id/scanner" element={
                                <div className="container">
                                    <nav className="navbar">
                                        <div className="scanner-header">
                                            <h1>📸 Escáner de Evento</h1>
                                            <Link to="/admin-dashboard/events">⬅ Volver a Eventos</Link>
                                        </div>
                                    </nav>
                                    <QRScanner />
                                </div>
                            } />
                            {/* Legacy Routes (hidden but functional) */}
                            <Route path="/admin-dashboard/generar-qr" element={
                                <div className="container"><QRGenerator /></div>
                            } />
                            <Route path="/admin-dashboard/stats" element={
                                <div className="container"><Statistics /></div>
                            } />
                        </Route>

                        {/* Protected Routes - Student */}
                        <Route element={<ProtectedRoute allowedRoles={['Estudiante']} />}>
                            <Route path="/student-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Estudiante" />
                                    <StudentDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Protected Routes - Teacher */}
                        <Route element={<ProtectedRoute allowedRoles={['Docente']} />}>
                            <Route path="/teacher-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Docente" />
                                    <TeacherDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Protected Routes - Assistant (Staff) */}
                        <Route element={<ProtectedRoute allowedRoles={['Asistente', 'Administrador']} />}>
                            <Route path="/assistant-dashboard" element={
                                <div className="container">
                                    <DashboardHeader title="Portal Asistente" />
                                    <AssistantDashboard />
                                </div>
                            } />
                        </Route>

                        {/* Common Route - Profile */}
                        <Route path="/profile" element={<ProfilePage />} />

                        {/* Default redirect to Login */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    )
}

export default App
