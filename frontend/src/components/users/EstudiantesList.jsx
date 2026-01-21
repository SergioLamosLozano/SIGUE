import { useState, useEffect } from 'react';
import { getEstudiantes, createEstudiante, updateEstudiante, deleteEstudiante, exportarVisitantesCSV } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import '../../styles/EstudiantesList.css';

function EstudiantesList() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState(null);
  const [formData, setFormData] = useState({
    documento: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    dependencia: '',
    funcionario: ''
  });

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  const fetchEstudiantes = async () => {
    try {
      setLoading(true);
      const response = await getEstudiantes(false); // false = traer todos
      setEstudiantes(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los visitantes');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEstudiante) {
        await updateEstudiante(editingEstudiante.id, formData);
      } else {
        await createEstudiante(formData);
      }
      setShowModal(false);
      resetForm();
      fetchEstudiantes();
    } catch (err) {
      alert('Error al guardar el visitante: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (estudiante) => {
    setEditingEstudiante(estudiante);
    setFormData({
      documento: estudiante.documento || '',
      nombres: estudiante.nombres || '',
      apellidos: estudiante.apellidos || '',
      telefono: estudiante.telefono || '',
      correo: estudiante.correo || '',
      dependencia: estudiante.dependencia || '',
      funcionario: estudiante.funcionario || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este visitante?')) {
      try {
        await deleteEstudiante(id);
        fetchEstudiantes();
      } catch (err) {
        alert('Error al eliminar: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      documento: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      correo: '',
      dependencia: '',
      funcionario: ''
    });
    setEditingEstudiante(null);
  };

  const handleNewVisitante = () => {
    resetForm();
    setShowModal(true);
  };

  const handleExportarCSV = () => {
    exportarVisitantesCSV();
  };

  if (loading) return <div className="loading">Cargando visitantes...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <div className="estudiantes-header">
        <h2>Lista de Invitados</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleExportarCSV}
            title="Descargar lista completa en formato CSV"
          >
            📊 Exportar CSV
          </button>
          <button className="btn btn-success" onClick={handleNewVisitante}>
            ➕ Nuevo Visitante
          </button>
        </div>
      </div>
      
      <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
        📋 Total de visitantes: <strong>{estudiantes.length}</strong>
      </div>

      {estudiantes.length === 0 ? (
        <p>No hay visitantes registrados.</p>
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
            {estudiantes.map((estudiante) => (
              <tr key={estudiante.id}>
                <td>{estudiante.nombres} {estudiante.apellidos}</td>
                <td>{estudiante.documento}</td>
                <td>{estudiante.correo || <span style={{ color: '#888' }}>Sin correo</span>}</td>
                <td>{estudiante.telefono || <span style={{ color: '#888' }}>-</span>}</td>
                <td>{estudiante.dependencia || <span style={{ color: '#888' }}>-</span>}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(estudiante)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(estudiante.id)}
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
              <h3>{editingEstudiante ? 'Editar Visitante' : 'Nuevo Visitante'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Documento *</label>
                <input
                  type="text"
                  name="documento"
                  value={formData.documento}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingEstudiante}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    required
                  />
                </div>
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
              <div className="form-row">
                <div className="form-group">
                  <label>Dependencia</label>
                  <input
                    type="text"
                    name="dependencia"
                    value={formData.dependencia}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Funcionario</label>
                  <input
                    type="text"
                    name="funcionario"
                    value={formData.funcionario}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEstudiante ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EstudiantesList;

