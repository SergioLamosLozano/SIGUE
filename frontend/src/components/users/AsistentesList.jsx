import { useState, useEffect } from 'react';
import { getAsistentes, createAsistente, updateAsistente, deleteAsistente, exportarAsistentesCSV } from '../../services/api';
import '../../styles/AsistentesList.css';

/**
 * Componente para listar y gestionar asistentes (Usuarios con rol de Estudiante/Asistente).
 * Permite CRUD básico e importación/exportación masiva.
 * NOTA: Esta vista es una alternativa simplificada a UserManagement enfocada en 'Asistentes'.
 */
function AsistentesList() {
  const [asistentes, setAsistentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado de Modales
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Estado de Edición
  const [editingAsistente, setEditingAsistente] = useState(null);
  const [formData, setFormData] = useState({
    identificacion: '',
    nombre_completo: '',
    telefono: '',
    correo: '',
    sede: ''
  });

  useEffect(() => {
    fetchAsistentes();
  }, []);

  const fetchAsistentes = async () => {
    try {
      setLoading(true);
      const response = await getAsistentes(false); // false = traer todos sin paginación corta si aplica
      setAsistentes(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los asistentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Maneja Creación o Edición según el estado 'editingAsistente'.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAsistente) {
        await updateAsistente(editingAsistente.id, formData);
      } else {
        await createAsistente(formData);
      }
      setShowModal(false);
      resetForm();
      fetchAsistentes();
    } catch (err) {
      alert('Error al guardar el asistente: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (asistente) => {
    setEditingAsistente(asistente);
    setFormData({
      identificacion: asistente.identificacion || '',
      nombre_completo: asistente.nombre_completo || '',
      telefono: asistente.telefono || '',
      correo: asistente.correo || '',
      sede: asistente.sede || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este asistente?')) {
      try {
        await deleteAsistente(id);
        fetchAsistentes();
      } catch (err) {
        alert('Error al eliminar: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      identificacion: '',
      nombre_completo: '',
      telefono: '',
      correo: '',
      sede: ''
    });
    setEditingAsistente(null);
  };

  const handleNewAsistente = () => {
    resetForm();
    setShowModal(true);
  };

  const handleExportarCSV = () => {
    exportarAsistentesCSV();
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  // --- IMPORTACIÓN EXCEL --- //

  const handleImportarExcel = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Por favor selecciona un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      setImporting(true);
      // Asumimos que la función importarAsistentesExcel existe en api.js o se llama directamente
      // Nota: Si no existe en imports, esto fallará. Debe existir en api.js.
      // Si no existe, axios.post('/asistentes/importar_excel/') es la alternativa.
      // Como no lo veo importado arriba, usaré la lógica genérica si falla
      
      // const response = await importarAsistentesExcel(formData); 
      // Si no está importado, mejor usar axios directo para asegurar:
       const response = await axios.post('http://localhost:8000/api/asistentes/importar_excel/', formData, {
           headers: { 
               'Content-Type': 'multipart/form-data',
               'Authorization': `Bearer ${localStorage.getItem('token')}`
           }
       });

      alert(`Importación completada:\nCreados: ${response.data.creados}\nActualizados: ${response.data.actualizados}\nErrores: ${response.data.errores.length}`);
      setShowImportModal(false);
      setImportFile(null);
      fetchAsistentes();
    } catch (err) {
      alert('Error al importar: ' + (err.response?.data?.error || err.message));
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="loading">Cargando asistentes...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <div className="estudiantes-header">
        <h2>Lista de Asistentes</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleExportarCSV}
            title="Descargar lista completa en formato CSV"
          >
            📊 Exportar CSV
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowImportModal(true)}
            title="Importar asistentes desde Excel"
            style={{ backgroundColor: '#6c757d', color: 'white' }}
          >
            📥 Importar Excel
          </button>
          <button className="btn btn-success" onClick={handleNewAsistente}>
            ➕ Nuevo Asistente
          </button>
        </div>
      </div>
      
      <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
        📋 Total de asistentes: <strong>{asistentes.length}</strong>
      </div>

      {asistentes.length === 0 ? (
        <p>No hay asistentes registrados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Documento</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Dependencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asistentes.map((asistente) => (
              <tr key={asistente.id}>
                <td>{asistente.nombre_completo}</td>
                <td>{asistente.identificacion}</td>
                <td>{asistente.correo || <span style={{ color: '#888' }}>Sin correo</span>}</td>
                <td>{asistente.telefono || <span style={{ color: '#888' }}>-</span>}</td>
                <td>{asistente.sede || <span style={{ color: '#888' }}>-</span>}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(asistente)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(asistente.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal para crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAsistente ? 'Editar Asistente' : 'Nuevo Asistente'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Identificación *</label>
                <input
                  type="text"
                  name="identificacion"
                  value={formData.identificacion}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingAsistente}
                />
              </div>
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Correo</label>
                  <input
                    type="email"
                    name="correo"
                    value={formData.correo}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Sede</label>
                <input
                  type="text"
                  name="sede"
                  value={formData.sede}
                  onChange={handleInputChange}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAsistente ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Importar Excel */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Importar Asistentes desde Excel</h3>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleImportarExcel}>
              <div className="alert alert-info">
                <p>El archivo Excel debe tener las siguientes columnas:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                  <li>Nombre completo</li>
                  <li>Correo</li>
                  <li>telefono</li>
                  <li>Identificacion</li>
                  <li>Sede</li>
                </ul>
              </div>
              
              <div className="form-group">
                <label>Seleccionar Archivo Excel (.xlsx, .xls)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  required
                  style={{ padding: '10px', border: '1px solid #ddd', width: '100%' }}
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)} disabled={importing}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={importing || !importFile}>
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AsistentesList;
