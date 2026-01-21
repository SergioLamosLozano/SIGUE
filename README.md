# Sistema de Gestión de Refrigerios con Códigos QR

Sistema completo para gestionar desayuno, almuerzo y refrigerio en eventos mediante códigos QR únicos por estudiante.

## 🏗️ Arquitectura del Proyecto

- **Backend**: Django + Django REST Framework + MySQL
- **Frontend**: React + Vite + Axios
- **Códigos QR**: Generación automática con biblioteca qrcode
- **Base de Datos**: MySQL (refrigerios_db)

## 📁 Estructura del Proyecto

```
Prueba Refrigerios/
├── backend/          # API Django REST Framework
│   ├── event_management/  # Aplicación Django principal
│   ├── manage.py
│   └── requirements.txt
├── frontend/         # Aplicación React con Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🚀 Comandos de Instalación

### 1️⃣ Configuración del Backend (Django)

#### Paso 1: Crear entorno virtual
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### Paso 2: Instalar dependencias
```powershell
pip install -r requirements.txt
```

#### Paso 3: Configurar Variables de Entorno
Copia el archivo de ejemplo y configura tus credenciales:
```powershell
cp .env.example .env
```

Edita `.env` con tus credenciales:
- Contraseñas de MySQL
- Email y contraseña de aplicación de Gmail
- Secret key de Django

**Ver guía completa**: [CONFIGURACION_VARIABLES_ENTORNO.md](CONFIGURACION_VARIABLES_ENTORNO.md)

#### Paso 4: Configurar MySQL
Crea las bases de datos en MySQL:
```sql
CREATE DATABASE refrigerio_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE rica_univalle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Paso 4: Aplicar migraciones
```powershell
python manage.py migrate
```

#### Paso 5: Crear superusuario
```powershell
python manage.py createsuperuser
```

#### Paso 6: Ejecutar servidor de desarrollo
```powershell
python manage.py runserver
```

El backend estará disponible en: `http://localhost:8000`

---

### 2️⃣ Configuración del Frontend (React + Vite)

#### Paso 1: Crear proyecto con Vite
```powershell
cd ../frontend
npm create vite@latest . -- --template react
```

#### Paso 2: Instalar dependencias
```powershell
npm install
```

#### Paso 3: Instalar bibliotecas adicionales
```powershell
npm install axios react-router-dom react-qr-scanner html5-qrcode
```

#### Paso 4: Ejecutar servidor de desarrollo
```powershell
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

---

## 📊 Modelos de Base de Datos

### Estudiante
- `id`: ID único
- `nombre`: Nombre completo
- `identificacion`: Número de documento
- `email`: Correo electrónico
- `activo`: Estado del estudiante

### CodigoQR
- `id`: ID único
- `estudiante`: Relación con Estudiante
- `tipo_comida`: DESAYUNO | ALMUERZO | REFRIGERIO
- `codigo`: Código QR único (UUID)
- `usado`: Boolean (si fue escaneado)
- `fecha_creacion`: Timestamp
- `fecha_uso`: Timestamp del escaneo

---

## 🔌 Endpoints de la API

### Estudiantes
- `GET /api/estudiantes/` - Listar todos los estudiantes
- `POST /api/estudiantes/` - Crear nuevo estudiante
- `GET /api/estudiantes/{id}/` - Ver detalle de estudiante
- `PUT /api/estudiantes/{id}/` - Actualizar estudiante
- `DELETE /api/estudiantes/{id}/` - Eliminar estudiante

### Códigos QR
- `GET /api/codigos-qr/` - Listar todos los códigos QR
- `POST /api/codigos-qr/generar/` - Generar 3 códigos QR para un estudiante
- `POST /api/codigos-qr/validar/` - Validar y marcar código QR como usado
- `GET /api/codigos-qr/estudiante/{id}/` - Ver códigos QR de un estudiante

---

## 🎯 Funcionalidades Principales

1. **Registro de Estudiantes**: Administrar lista de invitados
2. **Generación Automática de QR**: 3 códigos por estudiante (desayuno, almuerzo, refrigerio)
3. **Escaneo de QR**: Validación en tiempo real
4. **Uso Único**: Los códigos se marcan como usados después del escaneo
5. **Panel de Administración**: Gestión completa desde Django Admin

---

## 🛠️ Tecnologías Utilizadas

### Backend
- Django 5.x
- Django REST Framework
- Python QRCode
- Pillow (procesamiento de imágenes)
- MySQL (refrigerios_db)
- mysqlclient (conector MySQL)

### Frontend
- React 18
- Vite
- Axios (peticiones HTTP)
- HTML5-QRCode (escaneo de QR)
- React Router (navegación)

---

## 📝 Notas de Desarrollo

- Los códigos QR se generan usando UUID para garantizar unicidad
- CORS está habilitado para desarrollo local
- Los códigos QR incluyen el tipo de comida y el ID del estudiante
- Base de datos MySQL `refrigerios_db` con charset utf8mb4
- Ver `backend/CONFIGURACION_MYSQL.md` para más detalles sobre MySQL

---

## 🔐 Seguridad

- Validación de códigos QR en el backend
- Verificación de uso único
- Autenticación para endpoints administrativos

---

## 📦 Despliegue

### Backend
- Configurar variables de entorno
- Usar PostgreSQL en producción
- Configurar `ALLOWED_HOSTS`
- Ejecutar `collectstatic`

### Frontend
- Build de producción: `npm run build`
- Servir desde Nginx o servicio de hosting

---

## 👨‍💻 Autor

Sistema desarrollado para gestión de eventos con refrigerios

## 📄 Licencia

Este proyecto es de uso educativo
