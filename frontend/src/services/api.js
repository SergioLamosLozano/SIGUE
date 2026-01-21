import axios from 'axios';

// URL base para todas las peticiones al backend
const API_URL = 'http://localhost:8000/api';

// Instancia de axios configurada
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición: Inyecta el token de autenticación (JWT) si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --------------------------------------------------------------------------
// ENDPOINTS DE LA API
// --------------------------------------------------------------------------

// --- ASISTENTES LEGACY (Importados o Externos) ---
// Gestión de asistentes que no son usuarios del sistema (solo nombre/cedula)
export const getAsistentes = (soloActivos = false) => {
  return api.get('/asistentes/');
};
export const getAsistente = (id) => api.get(`/asistentes/${id}/`);
export const createAsistente = (data) => api.post('/asistentes/', data);
export const updateAsistente = (id, data) => api.put(`/asistentes/${id}/`, data);
export const deleteAsistente = (id) => api.delete(`/asistentes/${id}/`);

// Operaciones específicas de asistentes
export const getAsistenteConCodigos = (id) => api.get(`/asistentes/${id}/con_codigos/`);
export const generarCodigosQRAsistente = (id) => api.post(`/asistentes/${id}/generar_qr/`); // Corregido endpoint
export const getEstadisticas = () => api.get('/asistentes/estadisticas/'); // Nota: Endpoint podría no existir en backend nuevo, usar Evento.estadisticas

// Importación / Exportación
export const exportarAsistentesCSV = () => {
  window.open(`${API_URL}/asistentes/exportar_csv/`, '_blank');
};
export const importarAsistentesExcel = (formData) => {
  return api.post('/asistentes/importar_excel/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// --- CÓDIGOS QR ---
// Gestión centralizada de Códigos QR
export const getCodigosQR = () => api.get('/qr/');
export const getCodigoQR = (id) => api.get(`/qr/${id}/`);
export const validarCodigoQR = (codigo) => api.post('/qr/escanear/', { codigo });
export const getCodigoQRImagen = (id) => `${API_URL}/qr/${id}/generar_imagen/`;
export const getCodigoQRBase64 = (id) => api.get(`/qr/${id}/generar_base64/`);
export const getCodigosPorAsistente = (asistenteId) => 
  api.get(`/qr/por_asistente/?asistente_id=${asistenteId}`);

// --- EVENTOS (Nuevo Sistema) ---
// Gestión de Eventos, Inscripciones y QRs de Usuarios
export const getEventos = () => api.get('/eventos/');
// Más funciones de eventos deberían agregarse aquí según se usen en los componentes

// --- RETROCOMPATIBILIDAD ---
// Mapeos para asegurar que código antiguo siga funcionando con los nuevos nombres
export const getVisitantes = getAsistentes;
export const getVisitante = getAsistente;
export const createVisitante = createAsistente;
export const updateVisitante = updateAsistente;
export const deleteVisitante = deleteAsistente;
export const getVisitanteConCodigos = getAsistenteConCodigos;
export const generarCodigosQR = generarCodigosQRAsistente;
export const generarCodigosMasivo = () => api.post('/asistentes/importar_excel/'); // Placeholder/Deprecated

// Estudiantes -> Asistentes (Legacy map)
export const getEstudiantes = getAsistentes;
export const getEstudiante = getAsistente;
export const createEstudiante = createAsistente;
export const updateEstudiante = updateAsistente;
export const deleteEstudiante = deleteAsistente;

export default api;
