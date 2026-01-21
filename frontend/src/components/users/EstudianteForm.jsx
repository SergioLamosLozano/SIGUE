import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../../styles/EstudianteForm.css';

function EstudianteForm() {
  const navigate = useNavigate();

  return (
    <div className="card">
      <h2>Gestión de Visitantes</h2>

      <div className="alert" style={{ 
        backgroundColor: '#2a2a2a', 
        border: '2px solid #FFA726',
        padding: '2rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#FFA726' }}>
          ℹ️ Gestión Centralizada en RICA
        </h3>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#ccc', marginBottom: '1.5rem' }}>
          Los visitantes se gestionan desde el <strong>Sistema RICA</strong> (puerto 8000).
          <br />
          Este sistema de refrigerios <strong>solo consulta</strong> la información.
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginTop: '1.5rem',
          textAlign: 'left'
        }}>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#1a1a1a', 
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>
              ✅ Puedes hacer aquí:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#aaa' }}>
              <li>Ver lista de visitantes</li>
              <li>Generar códigos QR</li>
              <li>Validar códigos QR</li>
              <li>Enviar códigos por email</li>
            </ul>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#1a1a1a', 
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#FFA726' }}>
              📋 Debes ir a RICA para:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#aaa' }}>
              <li>Crear nuevos visitantes</li>
              <li>Modificar datos</li>
              <li>Cambiar estado (activo/inactivo)</li>
              <li>Eliminar visitantes</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <a 
            href="http://localhost:8000" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ 
              display: 'inline-block',
              padding: '0.8rem 2rem',
              fontSize: '1.1rem'
            }}
          >
            🔗 Abrir Sistema RICA (Puerto 8000)
          </a>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-success"
          style={{ fontSize: '1rem' }}
        >
          ← Volver a la Lista
        </button>
      </div>
    </div>
  );
}

export default EstudianteForm;
