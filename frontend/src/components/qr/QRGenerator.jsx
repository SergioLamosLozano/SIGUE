import React, { useState, useEffect } from 'react';
import {
  getEstudiantes,
  generarCodigosQR,
  generarCodigosMasivo,
  getCodigosPorEstudiante,
  getCodigoQRBase64
} from '../../services/api';
import '../../styles/QRGenerator.css';

/**
 * Componente para generar códigos QR.
 * Soporta generación individual (seleccionando un usuario) y masiva.
 * Permite visualizar el historial de códigos generados para un usuario.
 */
function QRGenerator() {
  // Estados para datos
  const [estudiantes, setEstudiantes] = useState([]);
  const [selectedEstudiante, setSelectedEstudiante] = useState('');
  const [codigos, setCodigos] = useState([]); // Códigos QR del usuario seleccionado
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  
  // Estados de control de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  
  // Contador para métricas rápidas
  const [pendientesCount, setPendientesCount] = useState(0);

  // Carga inicial
  useEffect(() => {
    fetchEstudiantes();
  }, []);

  // Lógica de búsqueda en tiempo real
  useEffect(() => {
    if (busqueda.trim() === '') {
      setEstudiantesFiltrados(estudiantes);
    } else {
      const busquedaLower = busqueda.toLowerCase();
      const filtrados = estudiantes.filter(est => {
        const nombre = (est.nombre_completo || '').toLowerCase();
        const identificacion = (est.identificacion || '').toString().toLowerCase();
        return nombre.includes(busquedaLower) || identificacion.includes(busquedaLower);
      });
      setEstudiantesFiltrados(filtrados);
    }
  }, [busqueda, estudiantes]);

  // Actualizar contador de pendientes
  useEffect(() => {
    const count = estudiantes.filter(est => !est.tieneCodigos).length;
    setPendientesCount(count);
  }, [estudiantes]);

  /**
   * Obtiene la lista completa de asistentes y verifica si ya tienen códigos generados.
   */
  const fetchEstudiantes = async () => {
    try {
      const response = await getEstudiantes();
      const data = response.data.results || response.data;
      
      // Enriquecer la lista verificando QRs existentes
      // NOTA: Esto podría ser lento con muchos usuarios, idealmente el backend
      // debería devolver un flag "has_qr" en la lista principal.
      const asistentesConInfo = await Promise.all(
        data.map(async (asistente) => {
          try {
            const codigosResponse = await getCodigosPorEstudiante(asistente.id);
            const tieneCodigos = codigosResponse.data && codigosResponse.data.length > 0;
            return { ...asistente, tieneCodigos };
          } catch (err) {
            return { ...asistente, tieneCodigos: false };
          }
        })
      );
      
      setEstudiantes(asistentesConInfo);
      setEstudiantesFiltrados(asistentesConInfo);
    } catch (err) {
      console.error('Error al cargar asistentes:', err);
      setError('Error al cargar la lista de asistentes. Asegúrate de que el backend esté corriendo.');
    }
  };

  /**
   * Genera un nuevo código QR para el estudiante seleccionado individualmente.
   */
  const handleGenerar = async () => {
    if (!selectedEstudiante) {
      setError('Por favor selecciona un asistente');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await generarCodigosQR(selectedEstudiante);
      setSuccess(response.data.mensaje);
      await handleVerCodigos();
      await fetchEstudiantes(); // Actualizar indicadores de la lista
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar códigos QR');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera QRs para TODOS los asistentes pendientes de una sola vez.
   */
  const handleGenerarMasivo = async () => {
    if (pendientesCount === 0) {
      setError('No hay asistentes pendientes de código QR.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de generar códigos QR para los ${pendientesCount} asistentes que faltan?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCodigos([]);
      
      const response = await generarCodigosMasivo();
      
      setSuccess(
        `${response.data.mensaje}\n` +
        `Total de códigos generados: ${response.data.total_codigos_generados}\n` +
        `Asistentes procesados: ${response.data.asistentes_procesados?.length || 0}\n` +
        `Emails enviados: ${response.data.emails_enviados}\n` +
        `Emails fallidos: ${response.data.emails_fallidos}`
      );
      await fetchEstudiantes();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.mensaje || 'Error al generar códigos masivos';
      setError(errorMsg);
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene y muestra las imágenes de los QRs del usuario seleccionado.
   */
  const handleVerCodigos = async () => {
    if (!selectedEstudiante) {
      setError('Por favor selecciona un asistente');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await getCodigosPorEstudiante(selectedEstudiante);
      
      if (!response.data || response.data.length === 0) {
        setError('Este asistente aún no tiene códigos QR generados.');
        setCodigos([]);
        setLoading(false);
        return;
      }
      
      // Cargar imágenes Base64 para cada código
      const codigosConImagenes = await Promise.all(
        response.data.map(async (codigo) => {
          try {
            const imgResponse = await getCodigoQRBase64(codigo.id);
            return {
              ...codigo,
              imagen: imgResponse.data.imagen_base64
            };
          } catch (err) {
            console.error('Error al obtener imagen:', err);
            return codigo;
          }
        })
      );
      
      setCodigos(codigosConImagenes);
      setSuccess(`Se encontraron ${codigosConImagenes.length} códigos QR para este asistente.`);
    } catch (err) {
      setError('Error al cargar códigos QR: ' + (err.response?.data?.error || err.message));
      setCodigos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEstudianteChange = (e) => {
    setSelectedEstudiante(e.target.value);
    setCodigos([]);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="card">
      <h2>Generar Códigos QR</h2>

      {/* Mensajes de feedback */}
      {error && <div className="alert alert-error" style={{whiteSpace: 'pre-line'}}>{error}</div>}
      {success && <div className="alert alert-success" style={{whiteSpace: 'pre-line'}}>{success}</div>}

      {/* --- PANEL DE GENERACIÓN MASIVA --- */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #444' }}>
        <h3>🚀 Generación Masiva</h3>
        <p style={{ marginBottom: '1rem', color: '#aaa' }}>
          Genera códigos QR automáticamente para los asistentes que aún no tienen.
        </p>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1rem',
          backgroundColor: '#2a2a2a',
          padding: '1rem',
          borderRadius: '8px'
        }}>
          <div>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{pendientesCount}</span>
            <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>asistentes pendientes</span>
          </div>
          <div style={{ color: '#888' }}>
            Total registrados: {estudiantes.length}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGenerarMasivo}
          disabled={loading || pendientesCount === 0}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
        >
          {loading ? '⏳ Generando...' : `🎫 Generar Códigos para ${pendientesCount} Asistentes`}
        </button>
      </div>

      <hr style={{ margin: '2rem 0', borderColor: '#444' }} />

      {/* --- PANEL INDIVIDUAL --- */}
      <h3>Generar para un Asistente Específico</h3>
      
      {/* Buscador */}
      <div className="form-group">
        <label htmlFor="busqueda">🔍 Buscar Asistente</label>
        <input
          type="text"
          id="busqueda"
          placeholder="Buscar por nombre o identificación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #444',
            borderRadius: '4px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontSize: '1rem'
          }}
        />
        <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {estudiantesFiltrados.length} asistente(s) encontrado(s)
        </p>
      </div>

      {/* Selector */}
      <div className="form-group">
        <label htmlFor="estudiante">Seleccionar Asistente</label>
        <select
          id="estudiante"
          value={selectedEstudiante}
          onChange={handleEstudianteChange}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #444',
            borderRadius: '4px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontSize: '1rem'
          }}
        >
          <option value="">-- Seleccionar --</option>
          {estudiantesFiltrados.map((est) => (
            <option key={est.id} value={est.id}>
              {est.nombre_completo} - ID: {est.identificacion} {est.tieneCodigos ? '✅' : '❌'}
            </option>
          ))}
        </select>
      </div>

      {/* Botones de Acción Individual */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={handleGenerar}
          disabled={loading || !selectedEstudiante}
        >
          {loading ? 'Generando...' : 'Generar Código QR'}
        </button>

        <button
          className="btn btn-success"
          onClick={handleVerCodigos}
          disabled={loading || !selectedEstudiante}
        >
          Ver Códigos Existentes
        </button>
      </div>

      {/* Visualización de QRs */}
      {codigos.length > 0 && (
        <div className="qr-grid">
          {codigos.map((codigo) => (
            <div key={codigo.id} className="qr-container card">
              <h3>{codigo.tipo_comida}</h3>
              {codigo.imagen ? (
                <img
                  src={codigo.imagen}
                  alt={`QR ${codigo.tipo_comida}`}
                  className="qr-image"
                />
              ) : (
                <p>Imagen no disponible</p>
              )}
              <p>Estado: {codigo.usado ? '❌ Usado' : '✅ Disponible'}</p>
              {codigo.fecha_uso && (
                <p>Usado el: {new Date(codigo.fecha_uso).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QRGenerator;
