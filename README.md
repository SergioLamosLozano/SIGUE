# SIGUE - Sistema de Gestión de Eventos y Refrigerios

Bienvenido a **SIGUE**, un sistema integral diseñado para facilitar la administración de eventos académicos, el control de asistencia mediante tecnología QR y la gestión eficiente de refrigerios universitarios.

## 📋 Descripción

Este proyecto soluciona la problemática del control manual de asistencia y entrega de alimentos en eventos masivos. Permite a los administradores crear eventos, a los estudiantes inscribirse y obtener un código QR único, y al personal de logística validar dichos códigos en tiempo real para el ingreso o la entrega de refrigerios.

Adicionalmente, el sistema automatiza la generación y envío de certificados de asistencia en formato PDF.

## 🚀 Características Principales

### 📅 Gestión de Eventos
- Creación y edición de eventos con fecha, hora, lugar y cupos.
- Carga de imágenes promocionales (Flyers).
- Configuración de tipos de refrigerios (Desayuno, Almuerzo, Refrigerio PM).
- Control de fechas de inscripción.

### 📱 Códigos QR Inteligentes
- **Generación Automática**: Cada inscrito recibe un QR único.
- **Multi-Propósito**: El mismo sistema maneja QRs para Entrada y para cada comida específica.
- **Validación en Tiempo Real**: Evita la suplantación y el doble canje de beneficios.
- **Escáner Web**: Módulo de lectura compatible con cámaras de celular y webcam.

### 👥 Gestión de Usuarios
- **Roles Diferenciados**:
  - **Administrador**: Control total del sistema.
  - **Asistente (Staff)**: Permiso para escanear y verificar QRs.
  - **Estudiante/Docente**: Inscripción a eventos y visualización de historial.
- Autenticación segura basada en Tokens (JWT).

### 🎓 Certificación y Reportes
- **Certificados PDF**: Generación masiva basada en plantillas personalizables.
- **Envío por Email**: Distribución automática de QRs y Certificados.
- **Estadísticas**: Dashboard con datos de asistencia real vs. inscritos.
- **Exportación**: Descarga de listas de asistencia en Excel/CSV.

## 🛠️ Tecnologías Utilizadas

Este proyecto utiliza una arquitectura moderna separando Backend y Frontend:

### Backend (API REST)
- **Lenguaje**: Python 3.x
- **Framework**: Django 5.2
- **API Toolkit**: Django REST Framework (DRF)
- **Base de Datos**: MySQL (Optimizado para consutas relacionales)
- **Autenticación**: Simple JWT
- **Librerías Clave**: 
  - `reportlab` (Generación de PDFs)
  - `pandas` (Procesamiento de Excel)
  - `qrcode` (Generación de códigos)
  - `django-cors-headers` (Seguridad Web)

### Frontend (Cliente Web)
- **Framework**: React 18
- **Build Tool**: Vite (Rápido y ligero)
- **Estilos**: CSS3 Moderno (Diseño Responsivo y Glassmorphism)
- **Librerías Clave**:
  - `axios` (Peticiones HTTP)
  - `react-router-dom` (Navegación)
  - `html5-qrcode` (Lector de QR en navegador)

## � Arquitectura del Proyecto

```text
SIGUE/
├── backend/                 # Lógica del Servidor (Django)
│   ├── config/              # Configuración global (Settings, URLs)
│   ├── event_management/    # App principal (Eventos, QRs, PDF)
│   ├── users/               # Gestión de usuarios y Auth
│   ├── media/               # Archivos generados (QRs, Flyers)
│   └── manage.py            # CLI de Django
│
└── frontend/                # Interfaz de Usuario (React)
    ├── public/              # Assets estáticos
    ├── src/
    │   ├── components/      # Componentes Reutilizables
    │   │   ├── events/      # Vistas de Eventos
    │   │   ├── qr/          # Escáner y Generador
    │   │   └── users/       # Perfil y Gestión
    │   ├── context/         # AuthContext (Estado Global)
    │   └── services/        # API Service (Axios)
    ├── index.html           # Entry Point
    └── vite.config.js       # Configuración Vite
```

## ⚙️ Guía de Instalación

Sigue estos pasos para desplegar el proyecto en tu entorno local:

### Prerrequisitos
- Tener instalado **Python 3.10+** y **Node.js 18+**.
- Tener un servidor **MySQL** corriendo (ej: XAMPP, MySQL Workbench).

### 1. Configuración del Backend

1. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Crea y activa un entorno virtual (recomendado):
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   # En Mac/Linux:
   source venv/bin/activate
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura las variables de entorno:
   - Crea un archivo `.env` en la carpeta `backend/` basado en tus credenciales de base de datos (DB_NAME, DB_USER, DB_PASSWORD).
5. Ejecuta las migraciones:
   ```bash
   python manage.py migrate
   ```
6. Inicia el servidor:
   ```bash
   python manage.py runserver
   ```
   *El backend correrá en http://localhost:8000*

### 2. Configuración del Frontend

1. Abre una nueva terminal y navega a la carpeta frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de Node:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El frontend correrá en http://localhost:5173*

## � Acceso al Sistema

Para el primer ingreso, necesitarás un superusuario creado desde el backend:

```bash
# En terminal backend
python manage.py createsuperuser
```

Luego podrás iniciar sesión en el Frontend con esas credenciales y tendrás acceso al Panel de Administrador.

---
**Desarrollado para la Gestión Académica y Eventos Universitarios**
*Versión 1.0.0*
