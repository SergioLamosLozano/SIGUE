import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getEstadisticas } from '../services/api';
import '../styles/global.css';

// Registrar componentes necesarios de Chart.js para que funcionen las gráficas
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Componente de Estadísticas Generales (Legacy).
 * Muestra métricas de asistencia total y por sedes.
 * NOTA: Este componente usa 'getEstadisticas', que debe mapear al nuevo backend.
 */
function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchStats();
  }, []);

  /**
   * Obtiene las estadísticas desde el backend.
   */
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getEstadisticas();
      setStats(response.data);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      setError('Error al cargar los datos de estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // Renderizado condicional para estados de carga y error
  if (loading) return <div className="text-center p-4">Cargando estadísticas...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return null;

  // --- Configuración de la Gráfica de Barras ---
  
  // Extraer etiquetas (sedes) y datos
  const labels = stats.por_sede.map(item => item.sede);
  
  const data = {
    labels,
    datasets: [
      {
        label: 'Total Registrados',
        data: stats.por_sede.map(item => item.total),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
      {
        label: 'Ingresados (QR Escaneado)',
        data: stats.por_sede.map(item => item.ingresados),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff' // Texto blanco para modo oscuro
        }
      },
      title: {
        display: true,
        text: 'Asistencia por Sede',
        color: '#fff',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#ccc' },
        grid: { color: '#444' }
      },
      x: {
        ticks: { color: '#ccc' },
        grid: { color: '#444' }
      }
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>📊 Estadísticas del Evento</h2>
        <button className="btn btn-secondary" onClick={fetchStats}>🔄 Actualizar</button>
      </div>

      {/* --- Tarjetas de Resumen (KPIs) --- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {/* Total Registrados */}
        <div className="card" style={{ textAlign: 'center', backgroundColor: '#2a2a2a', border: '1px solid #3b82f6' }}>
          <h3 style={{ color: '#aaa', fontSize: '1rem' }}>Total Asistentes</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', margin: '0.5rem 0' }}>
            {stats.total_asistentes}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>Registrados en plataforma</p>
        </div>

        {/* Total Ingresados */}
        <div className="card" style={{ textAlign: 'center', backgroundColor: '#2a2a2a', border: '1px solid #10b981' }}>
          <h3 style={{ color: '#aaa', fontSize: '1rem' }}>Total Ingresos</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', margin: '0.5rem 0' }}>
            {stats.total_ingresados}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>Han escaneado su QR</p>
        </div>

        {/* Porcentaje de Asistencia */}
        <div className="card" style={{ textAlign: 'center', backgroundColor: '#2a2a2a', border: '1px solid #f59e0b' }}>
          <h3 style={{ color: '#aaa', fontSize: '1rem' }}>Porcentaje Asistencia</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', margin: '0.5rem 0' }}>
            {stats.total_asistentes > 0 
              ? Math.round((stats.total_ingresados / stats.total_asistentes) * 100) 
              : 0}%
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>Del total registrado</p>
        </div>
      </div>

      {/* --- Gráfica Visual --- */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: '#222' }}>
        <Bar options={options} data={data} />
      </div>

      {/* --- Tabla Detallada por Sede --- */}
      <div style={{ marginTop: '3rem' }}>
        <h3>Detalle por Sede</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#333', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Sede</th>
                <th style={{ padding: '1rem' }}>Registrados</th>
                <th style={{ padding: '1rem' }}>Ingresados</th>
                <th style={{ padding: '1rem' }}>% Avance</th>
              </tr>
            </thead>
            <tbody>
              {stats.por_sede.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '1rem' }}>{item.sede}</td>
                  <td style={{ padding: '1rem' }}>{item.total}</td>
                  <td style={{ padding: '1rem' }}>{item.ingresados}</td>
                  <td style={{ padding: '1rem' }}>
                    {item.total > 0 ? Math.round((item.ingresados / item.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
