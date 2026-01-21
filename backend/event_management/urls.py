from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AsistenteViewSet, CodigoQRViewSet, EventoViewSet

# Router para generar automáticamente las URLs de los ViewSets
router = DefaultRouter()
router.register(r'asistentes', AsistenteViewSet) # /api/asistentes/ (Legacy)
router.register(r'qr', CodigoQRViewSet)          # /api/qr/ (Escaneo y gestión)
router.register(r'eventos', EventoViewSet)       # /api/eventos/ (Gestión principal)

urlpatterns = [
    # Incluir las rutas del router
    path('', include(router.urls)),
]
