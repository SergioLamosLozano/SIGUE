/**
 * EventDashboard.jsx - Individual Event Management Dashboard
 * 
 * Displays event details, KPIs, action buttons, and attendee list.
 * Uses CSS classes from EventDashboard.css
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { showSuccess, showError, showConfirm, showToast } from '../../services/alert';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import '../../styles/EventDashboard.css';

// Register chart components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const EventDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Main states
    const [evento, setEvento] = useState(null);
    const [stats, setStats] = useState(null);
    const [inscritos, setInscritos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Action button states
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendingDiffusion, setSendingDiffusion] = useState(false);

    // Filter and pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Modal states
    const [showCertModal, setShowCertModal] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [chartType, setChartType] = useState('pie');
    const [certTemplate, setCertTemplate] = useState(null);
    const [generatingCerts, setGeneratingCerts] = useState(false);

    // Auth config
    const token = localStorage.getItem('token');
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    // --- DATA LOADING ---

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const resEvento = await axios.get(`http://localhost:8000/api/eventos/${id}/`, authConfig);
            setEvento(resEvento.data);

            const resStats = await axios.get(`http://localhost:8000/api/eventos/${id}/estadisticas/`, authConfig);
            setStats(resStats.data);

            const resInscritos = await axios.get(`http://localhost:8000/api/eventos/${id}/inscritos/`, authConfig);
            setInscritos(resInscritos.data);

        } catch (error) {
            console.error("Error fetching event data", error);
            alert("Error al cargar datos del evento");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchAllData();
    }, [id]);

    // --- MAIN ACTIONS ---

    const handleGenerarQRs = async () => {
        const confirmed = await showConfirm('Generar QRs', '¿Estás seguro de generar códigos QR faltantes para todos los inscritos?');
        if (!confirmed) return;

        try {
            setGenerating(true);
            const res = await axios.post(`http://localhost:8000/api/eventos/${id}/generar_qrs_masivo/`, {}, authConfig);
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
            const res = await axios.post(`http://localhost:8000/api/eventos/${id}/enviar_emails_evento/`, {}, authConfig);
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
            const res = await axios.get(`http://localhost:8000/api/eventos/${id}/exportar_asistentes_excel/`, {
                headers: { Authorization: `Bearer ${token}` },
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
            showError('Sin Programas', 'Este evento no tiene programas académicos asignados. Edita el evento para seleccionar "A quién va dirigido".');
            return;
        }

        const programNames = evento.programas_dirigidos.map(p => p.descripcion).join(', ');
        const confirmed = await showConfirm('Enviar Difusión', `¿Enviar correos promocionales a todos los estudiantes activos de los siguientes programas?\n\n${programNames}\n\nEsto puede tomar varios segundos.`);
        if (!confirmed) return;

        try {
            setSendingDiffusion(true);
            const res = await axios.post(`http://localhost:8000/api/admin/eventos/${id}/difusion/`, {}, authConfig);

            if (res.data.errores && res.data.errores.length > 0) {
                showError('Difusión Parcial', `${res.data.message}\n\nEmails enviados: ${res.data.emails_enviados}/${res.data.total_estudiantes}\n\nErrores:\n${res.data.errores.slice(0, 5).join('\n')}`);
            } else {
                showSuccess('¡Difusión Enviada!', `Se enviaron ${res.data.emails_enviados} correos a estudiantes de ${res.data.programas.length} programa(s).`);
            }
        } catch (error) {
            showError('Error de Difusión', 'Error al enviar emails: ' + (error.response?.data?.error || error.message));
        } finally {
            setSendingDiffusion(false);
        }
    };

    // --- CERTIFICATES ---

    const handleGenerarCertificados = async (e) => {
        e.preventDefault();
        const confirmed = await showConfirm('Generar Certificados', 'Esto generará certificados para todos los asistentes que marcaron asistencia y los enviará por correo. ¿Continuar?');
        if (!confirmed) return;

        try {
            setGeneratingCerts(true);
            const formData = new FormData();
            if (certTemplate) formData.append('plantilla', certTemplate);

            const res = await axios.post(`http://localhost:8000/api/eventos/${id}/generar_certificados_masivo/`, formData, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.errors && res.data.errors.length > 0) {
                showError('Proceso Finalizado con Errores', `${res.data.message}\n\nErrores:\n${res.data.errors.join('\n')}`);
            } else {
                showSuccess('¡Éxito!', res.data.message);
                setShowCertModal(false);
                setCertTemplate(null);
            }
        } catch (error) {
            showError('Error', 'Error al generar certificados: ' + (error.response?.data?.error || error.message));
        } finally {
            setGeneratingCerts(false);
        }
    };

    const handlePreviewCertificado = async () => {
        try {
            const formData = new FormData();
            if (certTemplate) formData.append('plantilla', certTemplate);

            const res = await axios.post(`http://localhost:8000/api/eventos/${id}/ver_previsualizacion_certificado/`, formData, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const file = new Blob([res.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } catch (error) {
            console.error(error);
            showError('Error', 'No se pudo generar la vista previa. Asegúrate de haber subido una plantilla.');
        }
    };

    // --- FILTERING & PAGINATION ---

    const filteredInscritos = inscritos.filter(ins => {
        const term = searchTerm.toLowerCase();
        return (
            ins.usuario.full_name.toLowerCase().includes(term) ||
            ins.usuario.id.toLowerCase().includes(term) ||
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

    // --- CHART DATA ---

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

    if (loading) return <div className="loading">Cargando Dashboard del Evento...</div>;
    if (!evento) return <div className="alert alert-error">Evento no encontrado</div>;

    return (
        <div className="event-dashboard">
            <button onClick={() => navigate('/admin-dashboard/events')} className="btn btn-secondary mb-3">
                ← Volver a Eventos
            </button>

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

            {/* ACTION BUTTONS (4 columns) */}
            <div className="event-dashboard__actions">
                <button className="btn btn-primary event-dashboard__action-btn" onClick={handleGenerarQRs} disabled={generating}>
                    {generating ? 'Generando...' : '🎟️ Generar QRs Faltantes'}
                </button>
                <button className="btn btn-success event-dashboard__action-btn" onClick={handleEnviarEmails} disabled={sending}>
                    {sending ? 'Enviando...' : '📧 Enviar QRs por Email'}
                </button>
                <button className="btn event-dashboard__action-btn event-dashboard__action-btn--stats" onClick={() => setShowStats(true)}>
                    📊 Estadísticas Avanzadas
                </button>
                <button className="btn event-dashboard__action-btn event-dashboard__action-btn--certs" onClick={() => setShowCertModal(true)}>
                    🎓 Generar Certificados
                </button>

                {evento.asistencia_qr && (
                    <button className="btn event-dashboard__action-btn event-dashboard__action-btn--scanner" onClick={() => navigate(`/admin-dashboard/event/${id}/scanner`)}>
                        📸 Validar QRs (Escáner)
                    </button>
                )}
                <button className="btn btn-secondary event-dashboard__action-btn" onClick={handleExportarExcel}>
                    📊 Exportar Lista Asistentes
                </button>

                {evento.programas_dirigidos && evento.programas_dirigidos.length > 0 && (
                    <button className="btn event-dashboard__action-btn event-dashboard__action-btn--diffusion" onClick={handleEnviarDifusion} disabled={sendingDiffusion}>
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

            {/* CERTIFICATES MODAL */}
            {showCertModal && (
                <div className="modal-overlay" onClick={() => !generatingCerts && setShowCertModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generar Certificados de Asistencia</h3>
                            {!generatingCerts && <button className="modal-close" onClick={() => setShowCertModal(false)}>✕</button>}
                        </div>
                        <form onSubmit={handleGenerarCertificados}>
                            <div className="event-dashboard__modal-info">
                                <p><strong>ℹ️ Instrucciones:</strong></p>
                                <ul>
                                    <li>Se generarán certificados <strong>solo para los asistentes marcados como "Asistió"</strong>.</li>
                                    <li>Los certificados se enviarán automáticamente por correo.</li>
                                    <li>Puedes subir una plantilla PDF personalizada o usar la anterior.</li>
                                </ul>
                            </div>

                            <div className="form-group">
                                <label>Plantilla PDF (Opcional si ya existe una)</label>
                                <input type="file" accept=".pdf" onChange={(e) => setCertTemplate(e.target.files[0])} disabled={generatingCerts} />
                                <small>Sube un PDF donde quieras que se sobreponga el Nombre y Documento.</small>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn event-dashboard__preview-btn" onClick={() => handlePreviewCertificado()} disabled={generatingCerts}>
                                    👁️ Vista Previa
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCertModal(false)} disabled={generatingCerts}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={generatingCerts}>
                                    {generatingCerts ? 'Generando y Enviando...' : '🚀 Generar y Enviar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDashboard;
