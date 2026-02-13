import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Importamos tu instancia de API configurada (importante para que funcione el token)
import api from '../../services/api';

import { showSuccess, showError, showConfirm } from '../../services/alert';
import '../../styles/EventDashboard.css';

// Registrar componentes de gráficos
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const EventDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS PRINCIPALES ---
    const [evento, setEvento] = useState(null);
    const [stats, setStats] = useState(null);
    const [inscritos, setInscritos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados de botones de acción
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendingDiffusion, setSendingDiffusion] = useState(false);

    // Filtros y Paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estados de Visualización
    const [showStats, setShowStats] = useState(false);
    const [chartType, setChartType] = useState('pie');

    // --- CARGA DE DATOS ---
    const fetchAllData = async () => {
        try {
            setLoading(true);
            // Usamos Promise.all para eficiencia
            const [resEvento, resStats, resInscritos] = await Promise.all([
                api.get(`/eventos/${id}/`),
                api.get(`/eventos/${id}/estadisticas/`),
                api.get(`/eventos/${id}/inscritos/`)
            ]);

            setEvento(resEvento.data);
            setStats(resStats.data);
            setInscritos(resInscritos.data);

        } catch (error) {
            console.error("Error fetching event data", error);
            showError('Error', 'Error al cargar datos del evento');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchAllData();
    }, [id]);

    // --- ACCIONES (Lógica Original Restaurada) ---

    const handleGenerarQRs = async () => {
        const confirmed = await showConfirm('Generar QRs', '¿Estás seguro de generar códigos QR faltantes para todos los inscritos?');
        if (!confirmed) return;

        try {
            setGenerating(true);
            const res = await api.post(`/eventos/${id}/generar_qrs_masivo/`);
            showSuccess('¡Listo!', res.data.message);
            fetchAllData();
        } catch (error) {
            showError('Hubo un problema', 'Error al generar QRs: ' + (error.response?.data?.error || error.message));
        } finally {
            setGenerating(false);
        }
    };

    const handleEnviarEmails = async () => {
        const confirmed = await showConfirm('Enviar Correos', '¿Enviar emails con los códigos QR a todos los inscritos? Esto puede tomar unos segundos.');
        if (!confirmed) return;

        try {
            setSending(true);
            const res = await api.post(`/eventos/${id}/enviar_emails_evento/`);
            if (res.data.error_count > 0 && res.data.error_details) {
                showError('Atención', `${res.data.message}\n\nDetalles:\n${res.data.error_details.join('\n')}`);
            } else {
                showSuccess('¡Enviado!', res.data.message);
            }
        } catch (error) {
            showError('Error de Envío', 'Error al enviar emails: ' + (error.response?.data?.error || error.message));
        } finally {
            setSending(false);
        }
    };

    const handleExportarExcel = async () => {
        try {
            const res = await api.get(`/eventos/${id}/exportar_asistentes_excel/`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `asistentes_evento_${id}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showError('Error', 'No se pudo exportar la lista: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEnviarDifusion = async () => {
        if (!evento.programas_dirigidos || evento.programas_dirigidos.length === 0) {
            showError('Sin Programas', 'Este evento no tiene programas académicos asignados.');
            return;
        }

        const programNames = evento.programas_dirigidos.map(p => p.descripcion).join(', ');

        // Confirmación estilizada con SweetAlert2
        const confirmed = await showConfirm(
            '📣 Enviar Difusión',
            `¿Enviar correos promocionales a estudiantes de:\n\n${programNames}?`
        );
        if (!confirmed) return;

        try {
            setSendingDiffusion(true);

            const res = await api.post(`/admin/eventos/${id}/difusion/`);
            const enviados = res.data.emails_enviados || 0;

            showSuccess(
                '¡Difusión Completada!',
                `Se enviaron ${enviados} correos de difusión exitosamente.`
            );

        } catch (error) {
            showError('Error', error.response?.data?.error || 'Error al enviar la difusión.');
        } finally {
            setSendingDiffusion(false);
        }
    };

    // --- FILTRADO Y PAGINACIÓN ---

    const filteredInscritos = inscritos.filter(ins => {
        const term = searchTerm.toLowerCase();
        return (
            ins.usuario.full_name?.toLowerCase().includes(term) ||
            ins.usuario.id?.toString().includes(term) ||
            (ins.usuario.email && ins.usuario.email.toLowerCase().includes(term))
        );
    });

    const totalPages = Math.ceil(filteredInscritos.length / itemsPerPage);
    const currentInscritos = filteredInscritos.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    // --- DATOS DE GRÁFICA ---

    // --- DATOS DE GRÁFICA COMPARATIVA ---
    const chartData = stats && stats.dependencias_comparativa ? {
        labels: Object.keys(stats.dependencias_comparativa.inscritos || {}),
        datasets: [
            {
                label: 'Inscritos',
                data: Object.values(stats.dependencias_comparativa.inscritos || {}),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
            {
                label: 'Asistentes (Entrada)',
                data: Object.keys(stats.dependencias_comparativa.inscritos || {}).map(dep => stats.dependencias_comparativa.asistencia[dep] || 0),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }
        ],
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Comparativa: Inscritos vs Asistentes por Dependencia',
            },
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    if (loading) return <div className="loading">Cargando Dashboard...</div>;
    if (!evento) return <div className="alert alert-error">Evento no encontrado</div>;

    return (
        <div className="event-dashboard">



            {/* 1. BOTÓN VOLVER (Restaurado FUERA del header) */}
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => navigate('/admin-dashboard/events')} className="btn btn-secondary">
                    ← Volver a Eventos
                </button>
            </div>

            {/* EVENT HEADER CON IMAGEN CIRCULAR */}
            <div className="event-dashboard__header">
                <div className="header-content-wrapper">

                    {/* COLUMNA IZQUIERDA: INFORMACIÓN */}
                    <div className="header-info-column">
                        <h1 className="event-dashboard__title">{evento.titulo}</h1>
                        <p className="event-dashboard__info">
                            📅 {new Date(evento.fecha).toLocaleString()} | 📍 {evento.lugar_nombre || evento.lugar}
                        </p>
                        {evento.requiere_entregable && stats && (
                            <span className={`event-dashboard__badge ${stats.entregables_disponibles_total === 0 ? 'badge-danger' : ''}`}>
                                🎁 {stats.entregables_disponibles_total} Entregables Disponibles
                            </span>
                        )}

                        {evento.programas_dirigidos && evento.programas_dirigidos.length > 0 && (
                            <div className="event-dashboard__programs">
                                <strong className="event-dashboard__programs-label">🎓 Dirigido a:</strong>
                                <div className="event-dashboard__programs-list">
                                    {evento.programas_dirigidos.map(prog => (
                                        <span key={prog.id} className="event-dashboard__program-tag">
                                            {prog.descripcion}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: FLYER REDONDO */}
                    {/* COLUMNA DERECHA: FLYER REDONDO (Versión Base64) */}
                    {evento.flyer_base64 && (
                        <div className="header-image-column">
                            <img
                                /* Construimos la fuente de la imagen Base64 igual que en tu lista */
                                src={`data:${evento.flyer_content_type || 'image/png'};base64,${evento.flyer_base64}`}
                                alt={`Flyer de ${evento.titulo}`}
                                className="event-flyer-circle"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI STATS ROW */}
            <div className="event-dashboard__kpis">
                <div className="event-dashboard__kpi-card">
                    <h3 className="event-dashboard__kpi-value event-dashboard__kpi-value--primary">
                        {stats.total_inscritos}
                    </h3>
                    <p className="event-dashboard__kpi-label">Inscritos Totales</p>
                </div>
                <div className="event-dashboard__kpi-card">
                    <h3 className="event-dashboard__kpi-value event-dashboard__kpi-value--success">
                        {stats.asistentes_reales}
                    </h3>
                    <p className="event-dashboard__kpi-label">Asistieron (QR Entrada)</p>
                </div>
                <div className="event-dashboard__kpi-card">
                    <h3 className="event-dashboard__kpi-value event-dashboard__kpi-value--purple">
                        {Math.round(stats.porcentaje_asistencia)}%
                    </h3>
                    <p className="event-dashboard__kpi-label">% Asistencia</p>
                </div>
                {evento.requiere_entregable && (
                    <div className="event-dashboard__kpi-card">
                        <h3 className="event-dashboard__kpi-value event-dashboard__kpi-value--warning">
                            {stats.entregables_entregados_total}
                        </h3>
                        <p className="event-dashboard__kpi-label">Total Entregados</p>
                    </div>
                )}
            </div>



            {/* ACTION BUTTONS (Clean Grid - SIN CERTIFICADOS) */}
            <div className="event-dashboard__actions">
                <button className="event-dashboard__action-btn" onClick={handleGenerarQRs} disabled={generating}>
                    {generating ? 'Generando...' : '🎟️ Generar QRs Faltantes'}
                </button>
                <button className="event-dashboard__action-btn" onClick={handleEnviarEmails} disabled={sending}>
                    {sending ? 'Enviando...' : '📧 Enviar QRs por Email'}
                </button>
                <button className="event-dashboard__action-btn" onClick={() => setShowStats(true)}>
                    📊 Estadísticas Avanzadas
                </button>

                {evento.asistencia_qr && (
                    <button className="event-dashboard__action-btn" onClick={() => navigate(`/admin-dashboard/event/${id}/scanner`)}>
                        📸 Validar QRs (Escáner)
                    </button>
                )}

                <button className="event-dashboard__action-btn" onClick={handleExportarExcel}>
                    📊 Exportar Lista Asistentes
                </button>

                {evento.programas_dirigidos && evento.programas_dirigidos.length > 0 && (
                    <button className="event-dashboard__action-btn" onClick={handleEnviarDifusion} disabled={sendingDiffusion}>
                        {sendingDiffusion ? '✉️ Enviando...' : '📣 Enviar Difusión'}
                    </button>
                )}
            </div>

            {/* MAIN CONTENT: LIST OR CHARTS */}
            {!showStats ? (
                <>
                    <h3 className="event-dashboard__attendees-title">Lista de Asistentes</h3>

                    <input
                        type="text"
                        placeholder="🔍 Buscar por nombre, cédula o email..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="event-dashboard__search"
                    />

                    <div className="event-dashboard__table-card">
                        <div className="event-dashboard__table-wrapper">
                            <table className="event-dashboard__table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Identificación</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th>Fecha Inscripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentInscritos.length > 0 ? (
                                        currentInscritos.map((ins) => (
                                            <tr key={ins.id}>
                                                <td>{ins.usuario.full_name}</td>
                                                <td>{ins.usuario.id}</td>
                                                <td>{ins.usuario.email || <span className="event-dashboard__no-email">Sin email</span>}</td>
                                                <td>{ins.usuario.role}</td>
                                                <td>
                                                    {ins.asistio ? (
                                                        <span className="event-dashboard__status--attended">Asistió</span>
                                                    ) : (
                                                        <span className="event-dashboard__status--pending">Pendiente</span>
                                                    )}
                                                </td>
                                                <td>{new Date(ins.fecha_inscripcion).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="event-dashboard__empty-row">
                                            <td colSpan="6">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay inscritos en este evento aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="event-dashboard__pagination">
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                                Anterior
                            </button>
                            <span className="event-dashboard__pagination-info">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* STATS VIEW */
                /* STATS VIEW */
                <div className="event-dashboard__stats-card">
                    <div className="event-dashboard__stats-header">
                        <h3 className="event-dashboard__stats-title">📊 Estadísticas Avanzadas</h3>
                        <button className="btn btn-secondary" onClick={() => setShowStats(false)}>
                            ⬅ Volver a Lista
                        </button>
                    </div>

                    {/* DETALLE DE ENTREGABLES (MOVIDO AQUÍ) */}
                    {evento.requiere_entregable && stats.entregables_detalle && Object.keys(stats.entregables_detalle).length > 0 && (
                        <div className="event-dashboard__entregables-section" style={{ marginBottom: '30px', marginTop: '20px' }}>
                            <h3 className="event-dashboard__section-title" style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#555' }}>
                                📦 Detalle de Entregables
                            </h3>
                            <div className="event-dashboard__entregables-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {Object.entries(stats.entregables_detalle).map(([tipo, data]) => (
                                    <div key={tipo} className="entregable-card" style={{
                                        background: '#fff',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                        borderLeft: '4px solid #ff9800'
                                    }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#333' }}>{tipo}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#666' }}>Entregados:</span>
                                            <strong style={{ color: '#ff9800' }}>{data.entregados}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#666' }}>Disponibles:</span>
                                            <strong style={{ color: '#4caf50' }}>{data.disponibles}</strong>
                                        </div>
                                        <div style={{ marginTop: '8px', background: '#eee', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${data.generados > 0 ? (data.entregados / data.generados) * 100 : 0}%`,
                                                background: '#ff9800',
                                                height: '100%'
                                            }}></div>
                                        </div>
                                        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: '#999', margin: '5px 0 0' }}>Total: {data.generados}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="event-dashboard__chart-toggles">
                        <button className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartType('pie')}>
                            🥧 Gráfico de Pastel
                        </button>
                        <button className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartType('bar')}>
                            📊 Gráfico de Barras
                        </button>
                    </div>

                    <div className="event-dashboard__chart-container">
                        {chartData ? (
                            chartType === 'pie' ? (
                                <Pie data={chartData} options={chartOptions} />
                            ) : (
                                <Bar data={chartData} options={chartOptions} />
                            )
                        ) : (
                            <p className="event-dashboard__no-data">No hay datos suficientes para generar gráficas.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDashboard;