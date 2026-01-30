from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    # User views
    CustomTokenObtainPairView, 
    RegisterView, 
    UserUpdateView, 
    UserViewSet, 
    VerifyEmailView,
    # Event management views
    AsistenteViewSet, 
    CodigoQRViewSet, 
    EventoViewSet
)

# Router para generar automáticamente las URLs de los ViewSets
router = DefaultRouter()

# User management routes
router.register(r'users/manage', UserViewSet, basename='user-manage')

# Event management routes
router.register(r'asistentes', AsistenteViewSet)  # /api/asistentes/ (Legacy)
router.register(r'qr', CodigoQRViewSet)           # /api/qr/ (Escaneo y gestión)
router.register(r'eventos', EventoViewSet)        # /api/eventos/ (Gestión principal)

urlpatterns = [
    # =====================================================================
    # USER AUTHENTICATION ENDPOINTS
    # =====================================================================
    
    # Login: devuelve access token y refresh token + info de usuario
    path('users/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # Refrescar el access token usando el refresh token
    path('users/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Registro de nuevos usuarios
    path('users/auth/register/', RegisterView.as_view(), name='auth_register'),

    # Verificar email
    path('users/auth/verify/', VerifyEmailView.as_view(), name='auth_verify'),
    
    # Ver y editar el perfil propio del usuario autenticado
    path('users/profile/', UserUpdateView.as_view(), name='user_profile'),
    
    # =====================================================================
    # ROUTER URLS (Auto-generated from ViewSets)
    # =====================================================================
    path('', include(router.urls)),
]
