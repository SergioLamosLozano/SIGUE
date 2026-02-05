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
        const confirmed = await showConfirm('Enviar Difusión', `¿Enviar correos promocionales a estudiantes de:\n\n${programNames}?`);
        if (!confirmed) return;

        try {
            setSendingDiffusion(true);
            const res = await api.post(`/admin/eventos/${id}/difusion/`);

            if (res.data.errores && res.data.errores.length > 0) {
                showError('Difusión Parcial', `${res.data.message}\nErrores: ${res.data.errores.length}`);
            } else {
                showSuccess('¡Difusión Enviada!', `Se enviaron ${res.data.emails_enviados} correos.`);
            }
        } catch (error) {
            showError('Error de Difusión', 'Error al enviar emails: ' + (error.response?.data?.error || error.message));
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

    const chartData = stats && stats.asistencia_por_dependencia ? {
        labels: Object.keys(stats.asistencia_por_dependencia),
        datasets: [{
            label: '# de Asistentes',
            data: Object.values(stats.asistencia_por_dependencia),
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
                '#4caf50', '#00bcd4', '#e91e63'
            ],
            borderWidth: 1,
        }],
    } : null;

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

            {/* EVENT HEADER */}
            <div className="event-dashboard__header">
                <h1 className="event-dashboard__title">{evento.titulo}</h1>
                <p className="event-dashboard__info">
                    📅 {new Date(evento.fecha).toLocaleString()} | 📍 {evento.lugar}
                </p>
                {evento.requiere_refrigerio && (
                    <span className="event-dashboard__badge">
                        🍿 {evento.cantidad_refrigerios} Refrigerios Disponibles
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
                {evento.requiere_refrigerio && (
                    <div className="event-dashboard__kpi-card">
                        <h3 className="event-dashboard__kpi-value event-dashboard__kpi-value--warning">
                            {stats.refrigerios_entregados}
                        </h3>
                        <p className="event-dashboard__kpi-label">Refrigerios Entregados</p>
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
                <div className="event-dashboard__stats-card">
                    <div className="event-dashboard__stats-header">
                        <h3 className="event-dashboard__stats-title">📊 Estadísticas de Asistencia por Dependencia</h3>
                        <button className="btn btn-secondary" onClick={() => setShowStats(false)}>
                            ⬅ Volver a Lista
                        </button>
                    </div>

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
                                <Pie data={chartData} options={{ maintainAspectRatio: false }} />
                            ) : (
                                <Bar data={chartData} options={{ maintainAspectRatio: false }} />
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
