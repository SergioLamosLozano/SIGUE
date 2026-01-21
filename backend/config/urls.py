"""
Configuración de URLs para el proyecto.

La lista `urlpatterns` enruta las URLs a las vistas correspondientes. 
Para más información, consulta: https://docs.djangoproject.com/en/5.2/topics/http/urls/

Ejemplos:
Vistas basadas en funciones:
    1. Importar:  from my_app import views
    2. Agregar a urlpatterns:  path('', views.home, name='home')
Vistas basadas en clases:
    1. Importar:  from other_app.views import Home
    2. Agregar a urlpatterns:  path('', Home.as_view(), name='home')
Incluir otra configuración de URL (URLconf):
    1. Importar la función include(): from django.urls import include, path
    2. Agregar a urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Definición de las rutas principales del proyecto
urlpatterns = [
    # Ruta para el panel de administración de Django
    path('admin/', admin.site.urls),
    
    # Rutas API para la gestión de eventos (incluyendo los endpoints principales)
    # Se delega a event_management.urls
    path('api/', include('event_management.urls')),
    
    # Rutas API para la gestión de usuarios (autenticación, registro)
    # Se delega a users.urls
    path('api/users/', include('users.urls')),
]

# Configuración para servir archivos multimedia (MEDIA) en entorno de desarrollo.
# Esto permite ver las imágenes subidas (como los códigos QR) localmente.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
