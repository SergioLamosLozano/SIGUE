import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Tarjeta de navegación reutilizable - misma estructura que DashboardCard en App.jsx
 */
const DashboardCard = ({ to, icon, title, description }) => (
    <Link to={to} className="dashboard-card">
        <div className="dashboard-card__icon">{icon}</div>
        <h3 className="dashboard-card__title">{title}</h3>
        <p className="dashboard-card__description">{description}</p>
    </Link>
);

/**
 * Panel principal del Coordinador con 3 módulos:
 * 1. Gestión de Eventos (crear/ver propios)
 * 2. Gestión de Staff (asignar personal por evento)
 * 3. Certificados
 */
const CoordinadorDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="admin-panel">
            <div className="admin-panel__title">
                <h2>Panel de Coordinador</h2>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '4px' }}>
                    Bienvenido, <strong>{user?.full_name}</strong>. Gestiona tus eventos y staff asignado.
                </p>
            </div>

            <div className="dashboard-grid">
                <DashboardCard
                    to="/coordinador-dashboard/events"
                    icon="📅"
                    title="Gestión de Eventos"
                    description="Crear y gestionar tus eventos. Quedan sujetos a aprobación del Administrador."
                />

                <DashboardCard
                    to="/coordinador-dashboard/staff"
                    icon="👷"
                    title="Gestión de Staff"
                    description="Asignar o quitar privilegios temporales de staff a estudiantes o docentes por evento."
                />

                <DashboardCard
                    to="/coordinador-dashboard/certificates"
                    icon="📜"
                    title="Certificados"
                    description="Diseñar plantillas, generar y enviar certificados de asistencia de tus eventos."
                />
            </div>
        </div>
    );
};

export default CoordinadorDashboard;
