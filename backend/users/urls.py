from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, RegisterView, UserUpdateView, UserViewSet, VerifyEmailView

# Router para las vistas basadas en ViewSet (CRUD de administradores)
router = DefaultRouter()
router.register(r'manage', UserViewSet, basename='user-manage')

urlpatterns = [
    # Endpoint para login: devuelve access token y refresh token + info de usuario
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # Endpoint para refrescar el access token usando el refresh token
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Endpoint para registro de nuevos usuarios
    path('auth/register/', RegisterView.as_view(), name='auth_register'),

    # Endpoint para verificar email
    path('auth/verify/', VerifyEmailView.as_view(), name='auth_verify'),
    
    # Endpoint para ver y editar el perfil propio del usuario autenticado
    path('profile/', UserUpdateView.as_view(), name='user_profile'),
    
    # Inclusión de las rutas generadas automáticamente por el router (para UserViewSet)
    path('', include(router.urls)),
]
