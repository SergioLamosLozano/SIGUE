import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente de Ruta Protegida.
 * Verifica si el usuario está autenticado y tiene los permisos (roles) necesarios.
 * Si no, redirige al login o a la página principal.
 */
const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    // Mostrar estado de carga mientras se verifica la sesión
    if (loading) {
        return <div>Cargando...</div>;
    }

    // Si no hay usuario logueado, redirigir a Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si se especifican roles y el usuario no tiene uno de ellos, acceso denegado
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirigir a inicio (que a su vez redirigirá al dashboard correcto o login)
        return <Navigate to="/" replace />;
    }

    // Si todo está bien, renderizar el contenido de la ruta (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
