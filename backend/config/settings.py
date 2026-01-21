"""
Configuración de Django para el proyecto config.

Generado por 'django-admin startproject' usando Django 5.2.7.

Para más información sobre este archivo, ver:
https://docs.djangoproject.com/en/5.2/topics/settings/

Para la lista completa de configuraciones y sus valores, ver:
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

from pathlib import Path
from decouple import config, Csv
from datetime import timedelta
import os  # Importación necesaria para manejo de rutas del sistema operativo

# Construir rutas dentro del proyecto como: BASE_DIR / 'subdir'.
# BASE_DIR es el directorio raíz del proyecto.
BASE_DIR = Path(__file__).resolve().parent.parent


# Configuraciones de desarrollo de inicio rápido - no aptas para producción
# Ver https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# ADVERTENCIA DE SEGURIDAD: ¡mantén secreta la clave secreta usada en producción!
# Se lee desde las variables de entorno (.env) o usa un valor por defecto inseguro.
SECRET_KEY = config('SECRET_KEY', default='django-insecure-default-key')

# ADVERTENCIA DE SEGURIDAD: ¡no ejecutes con debug activado en producción!
# DEBUG=True mostrará errores detallados. En producción debe ser False.
DEBUG = config('DEBUG', default=True, cast=bool)

# Lista de hosts/dominios permitidos para servir la aplicación.
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=Csv())


# Definición de aplicaciones

INSTALLED_APPS = [
    # Aplicaciones por defecto de Django
    'django.contrib.admin',         # Sitio de administración
    'django.contrib.auth',          # Sistema de autenticación
    'django.contrib.contenttypes',  # Marco de tipos de contenido
    'django.contrib.sessions',      # Gestión de sesiones
    'django.contrib.messages',      # Mensajería (flash messages)
    'django.contrib.staticfiles',   # Gestión de archivos estáticos
    
    # Aplicaciones de terceros
    'rest_framework',               # Django REST Framework para crear APIs
    'corsheaders',                  # Headers CORS para permitir peticiones del frontend
    
    # Aplicaciones locales (creadas para este proyecto)
    'event_management',             # Gestión de eventos y refrigerios
    'users',                        # Gestión de usuarios (personalizado)
]

# Modelo de usuario personalizado que estamos usando (definido en la app users)
AUTH_USER_MODEL = 'users.CustomUser'

MIDDLEWARE = [
    # Middleware para seguridad
    'django.middleware.security.SecurityMiddleware',
    # Middleware para manejo de sesiones
    'django.contrib.sessions.middleware.SessionMiddleware',
    # Middleware para CORS (debe ir antes de CommonMiddleware)
    'corsheaders.middleware.CorsMiddleware',
    # Middleware común
    'django.middleware.common.CommonMiddleware',
    # Middleware para protección CSRF
    'django.middleware.csrf.CsrfViewMiddleware',
    # Middleware de autenticación
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Middleware de mensajes
    'django.contrib.messages.middleware.MessageMiddleware',
    # Middleware de protección contra clickjacking
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configuración de URLs raíz
ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [], # Directorios adicionales para buscar templates
        'APP_DIRS': True, # Busca templates dentro de las carpetas de las aplicaciones
        'OPTIONS': {
            'context_processors': [
                # Procesadores de contexto para inyectar variables en los templates
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Aplicación WSGI para despliegue
WSGI_APPLICATION = 'config.wsgi.application'


# Base de datos
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Configuración de la base de datos MySQL
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.db.backends.mysql'),
        'NAME': config('DB_NAME', default='contaduria_db'), # Nombre de la BD
        'USER': config('DB_USER', default='root'),         # Usuario de la BD
        'PASSWORD': config('DB_PASSWORD', default='Sergio990806'), # Contraseña
        'HOST': config('DB_HOST', default='localhost'),    # Host (localhost)
        'PORT': config('DB_PORT', default='3306'),         # Puerto (3306)
        'OPTIONS': {
            # Modo estricto para transacciones
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            # Codificación de caracteres
            'charset': 'utf8mb4',
        },
    }
}


# Validación de contraseñas
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internacionalización
# https://docs.djangoproject.com/en/5.2/topics/i18n/

# Código de idioma (Español)
LANGUAGE_CODE = 'es-es'

# Zona horaria (Colombia)
TIME_ZONE = 'America/Bogota'

# Activar internacionalización
USE_I18N = True

# Activar zonas horarias
USE_TZ = True


# Archivos estáticos (CSS, JavaScript, Imágenes)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Archivos de medios (Subidos por el usuario, como Códigos QR)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Tipo de campo de clave primaria por defecto
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuración de CORS (Intercambio de recursos de origen cruzado)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",    # Frontend Vite local
    "http://127.0.0.1:5173",    # Frontend Vite local (IP)
]

# Permitir credenciales (cookies, headers de autorización)
CORS_ALLOW_CREDENTIALS = True

# Configuración de Django REST Framework
REST_FRAMEWORK = {
    # Clases de permisos por defecto
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated', # Requiere autenticación por defecto
    ],
    # Clases de autenticación
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication', # Autenticación JWT
    ),
    # Paginación
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 1000  # Aumentado para mostrar todos los visitantes en una lista grande
}

# Configuración de Simple JWT (JSON Web Tokens)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),     # Token de acceso dura 4 horas
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),     # Token de refresco dura 1 dia
    'ROTATE_REFRESH_TOKENS': False,                  # No rotar tokens de refresco
    'BLACKLIST_AFTER_ROTATION': True,                # Blacklist después de rotar (si se activara)
    'AUTH_HEADER_TYPES': ('Bearer',),                # Tipo de header (Authorization: Bearer <token>)
}

# Configuración de Email (Gmail SMTP)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool) # Usar TLS para seguridad
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
# La contraseña se sanea automáticamente para remover espacios accidentales
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='').replace(' ', '')
# Email desde el cual se envían los correos
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER if EMAIL_HOST_USER else 'noreply@refrigerios.edu.co')

# Nota: Para Gmail, necesitas crear una "Contraseña de aplicación" si usas 2FA
# Instrucciones en: https://support.google.com/accounts/answer/185833
