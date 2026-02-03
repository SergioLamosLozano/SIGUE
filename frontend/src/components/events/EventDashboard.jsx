import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { showSuccess, showError, showConfirm, showToast } from '../../services/alert';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registrar componentes de gráficos
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const EventDashboard = () => {
    const { id } = useParams(); // ID del evento desde la URL
    const navigate = useNavigate();

    // Estados principales
    const [evento, setEvento] = useState(null);
    const [stats, setStats] = useState(null);
    const [inscritos, setInscritos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados de botones de acción
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendingDiffusion, setSendingDiffusion] = useState(false);

    // Estados de filtrado y paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estados para Modales (Certificados, estadísticas avanzadas)
    const [showCertModal, setShowCertModal] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [chartType, setChartType] = useState('pie'); // 'pie' o 'bar'
    const [certTemplate, setCertTemplate] = useState(null);
    const [generatingCerts, setGeneratingCerts] = useState(false);

    // Configuración de Auth
    const token = localStorage.getItem('token');
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    // --- CARGA DE DATOS ---

    const fetchAllData = async () => {
        try {
            setLoading(true);
            // 1. Detalles del Evento
            const resEvento = await axios.get(`http://localhost:8000/api/eventos/${id}/`, authConfig);
            setEvento(resEvento.data);

            // 2. Estadísticas
            const resStats = await axios.get(`http://localhost:8000/api/eventos/${id}/estadisticas/`, authConfig);
            setStats(resStats.data);

            // 3. Lista de Inscritos
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

    // --- ACCIONES PRINCIPALES ---

    /**
     * Genera QRs para todos los inscritos que aún no lo tengan.
     */
    const handleGenerarQRs = async () => {
        const confirmed = await showConfirm(
            'Generar QRs',
            '¿Estás seguro de generar códigos QR faltantes para todos los inscritos?'
        );
        if (!confirmed) return;

        try {
            setGenerating(true);
            const res = await axios.post(`http://localhost:8000/api/eventos/${id}/generar_qrs_masivo/`, {}, authConfig);
            showSuccess('¡Listo!', res.data.message);
            fetchAllData(); // Refrescar stats
        } catch (error) {
            showError('Hubo un problema', 'Error al generar QRs: ' + (error.response?.data?.error || error.message));
        } finally {
            setGenerating(false);
        }
    };

    /**
     * Envía correos electrónicos masivos con los QRs a todos los inscritos.
     */
    const handleEnviarEmails = async () => {
        const confirmed = await showConfirm(
            'Enviar Correos',
            '¿Enviar emails con los códigos QR a todos los inscritos? Esto puede tomar unos segundos.'
        );
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

    /**
     * Exporta la lista de asistentes a un archivo CSV.
     */
    const handleExportarExcel = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/eventos/${id}/exportar_asistentes_excel/`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Crear enlace de descarga temporal
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

    /**
     * Envía correos de difusión a estudiantes de los programas seleccionados.
     */
    const handleEnviarDifusion = async () => {
        if (!evento.programas_dirigidos || evento.programas_dirigidos.length === 0) {
            showError('Sin Programas', 'Este evento no tiene programas acédmicos asignados. Edita el evento para seleccionar "A quién va dirigido".');
            return;
        }

        const programNames = evento.programas_dirigidos.map(p => p.descripcion).join(', ');
        const confirmed = await showConfirm(
            'Enviar Difusión',
            `¿Enviar correos promocionales a todos los estudiantes activos de los siguientes programas?\n\n${programNames}\n\nEsto puede tomar varios segundos.`
        );
        if (!confirmed) return;

        try {
            setSendingDiffusion(true);
            const res = await axios.post(`http://localhost:8000/api/admin/eventos/${id}/difusion/`, {}, authConfig);

            if (res.data.errores && res.data.errores.length > 0) {
                showError(
                    'Difusión Parcial',
                    `${res.data.message}\n\nEmails enviados: ${res.data.emails_enviados}/${res.data.total_estudiantes}\n\nErrores:\n${res.data.errores.slice(0, 5).join('\n')}`
                );
            } else {
                showSuccess(
                    '¡Difusión Enviada!',
                    `Se enviaron ${res.data.emails_enviados} correos a estudiantes de ${res.data.programas.length} programa(s).`
                );
            }
        } catch (error) {
            showError('Error de Difusión', 'Error al enviar emails: ' + (error.response?.data?.error || error.message));
        } finally {
            setSendingDiffusion(false);
        }
    };

    // --- CERTIFICADOS ---

    const handleGenerarCertificados = async (e) => {
        e.preventDefault();

        const confirmed = await showConfirm(
            'Generar Certificados',
            'Esto generará certificados para todos los asistentes que marcaron asistencia y los enviará por correo. ¿Continuar?'
        );
        if (!confirmed) return;

        try {
            setGeneratingCerts(true);
            const formData = new FormData();
            if (certTemplate) {
                formData.append('plantilla', certTemplate);
            }

            const res = await axios.post(
                `http://localhost:8000/api/eventos/${id}/generar_certificados_masivo/`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

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
            if (certTemplate) {
                formData.append('plantilla', certTemplate);
            }

            const res = await axios.post(
                `http://localhost:8000/api/eventos/${id}/ver_previsualizacion_certificado/`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                    responseType: 'blob'
                }
            );

            const file = new Blob([res.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');

        } catch (error) {
            console.error(error);
            showError('Error', 'No se pudo generar la vista previa. Asegúrate de haber subido una plantilla.');
        }
    };

    // --- FILTRADO Y PAGINACIÓN ---

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
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // --- PREPARACIÓN DE DATOS PARA GRÁFICOS ---

    const chartData = stats && stats.asistencia_por_dependencia ? {
        labels: Object.keys(stats.asistencia_por_dependencia),
        datasets: [
            {
                label: '# de Asistentes',
                data: Object.values(stats.asistencia_por_dependencia),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    '#4caf50',
                    '#00bcd4',
                    '#e91e63'
                ],
                borderWidth: 1,
            },
        ],
    } : null;

    if (loading) return <div className="loading">Cargando Dashboard del Evento...</div>;
    if (!evento) return <div className="alert alert-error">Evento no encontrado</div>;

    return (
        <div style={{ paddingBottom: '40px' }}>
            <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary mb-3">
                ← Volver a Eventos
            </button>

            {/* HEADER DEL EVENTO */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)', color: 'white', border: 'none' }}>
                <h1 style={{ color: 'white', margin: 0 }}>{evento.titulo}</h1>
                <p style={{ opacity: 0.9, marginTop: '10px' }}>
                    📅 {new Date(evento.fecha).toLocaleString()} | 📍 {evento.lugar}
                </p>
                {evento.requiere_refrigerio && (
                    <div style={{ marginTop: '10px' }}>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '15px' }}>
                            🍿 {evento.cantidad_refrigerios} Refrigerios Disponibles
                        </span>
                    </div>
                )}

                {/* A quién va dirigido - Programas */}
                {evento.programas_dirigidos && evento.programas_dirigidos.length > 0 && (
                    <div style={{ marginTop: '15px', padding: '10px 15px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>🎓 Dirigido a:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {evento.programas_dirigidos.map(prog => (
                                <span
                                    key={prog.id}
                                    style={{
                                        background: 'rgba(255,255,255,0.25)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {prog.descripcion}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FILA DE ESTADÍSTICAS RÁPIDAS (KPIs) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="card text-center">
                    <h3 style={{ fontSize: '2.5rem', margin: '0 0 10px', color: 'var(--primary-color)' }}>{stats.total_inscritos}</h3>
                    <p style={{ color: '#666', margin: 0 }}>Inscritos Totales</p>
                </div>
                <div className="card text-center">
                    <h3 style={{ fontSize: '2.5rem', margin: '0 0 10px', color: 'var(--success-color)' }}>{stats.asistentes_reales}</h3>
                    <p style={{ color: '#666', margin: 0 }}>Asistieron (QR Entrada)</p>
                </div>
                <div className="card text-center">
                    <h3 style={{ fontSize: '2.5rem', margin: '0 0 10px', color: '#7b1fa2' }}>{Math.round(stats.porcentaje_asistencia)}%</h3>
                    <p style={{ color: '#666', margin: 0 }}>% Asistencia</p>
                </div>

                {evento.requiere_refrigerio && (
                    <div className="card text-center">
                        <h3 style={{ fontSize: '2.5rem', margin: '0 0 10px', color: 'var(--warning-color)' }}>{stats.refrigerios_entregados}</h3>
                        <p style={{ color: '#666', margin: 0 }}>Refrigerios Entregados</p>
                    </div>
                )}
            </div>

            {/* FILA DE ACCIONES */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '15px',
                marginBottom: '30px'
            }}>
                <button
                    className="btn btn-primary"
                    onClick={handleGenerarQRs}
                    disabled={generating}
                    style={{ width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}
                >
                    {generating ? 'Generando...' : '🎟️ Generar QRs Faltantes'}
                </button>
                <button
                    className="btn btn-success"
                    onClick={handleEnviarEmails}
                    disabled={sending}
                    style={{ width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}
                >
                    {sending ? 'Enviando...' : '📧 Enviar QRs por Email'}
                </button>

                <button
                    className="btn"
                    style={{ background: '#f57c00', color: 'white', width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowStats(true)}
                >
                    📊 Estadísticas Avanzadas
                </button>

                <button
                    className="btn"
                    style={{ background: '#0288d1', color: 'white', width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowCertModal(true)}
                >
                    🎓 Generar Certificados
                </button>

                {evento.asistencia_qr && (
                    <button
                        className="btn"
                        style={{ background: '#7b1fa2', color: 'white', width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}
                        onClick={() => navigate(`/admin-dashboard/event/${id}/scanner`)}
                    >
                        📸 Validar QRs (Escáner)
                    </button>
                )}

                <button className="btn btn-secondary" onClick={handleExportarExcel} style={{ width: '100%', justifyContent: 'center', height: '100%', display: 'flex', alignItems: 'center' }}>
                    📊 Exportar Lista Asistentes
                </button>

                {/* Botón de Difusión - solo si hay programas dirigidos */}
                {evento.programas_dirigidos && evento.programas_dirigidos.length > 0 && (
                    <button
                        className="btn"
                        style={{
                            background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
                            color: 'white',
                            width: '100%',
                            justifyContent: 'center',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        onClick={handleEnviarDifusion}
                        disabled={sendingDiffusion}
                    >
                        {sendingDiffusion ? '✉️ Enviando...' : '📣 Enviar Difusión'}
                    </button>
                )}
            </div>

            {/* CONTENIDO PRINCIPAL: LISTA O GRÁFICOS */}
            {!showStats ? (
                <>
                    <h3>Lista de Asistentes</h3>

                    {/* Barra de Búsqueda */}
                    <div className="mb-3">
                        <input
                            type="text"
                            placeholder="🔍 Buscar por nombre, cédula o email..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ margin: 0 }}>
                                <thead style={{ background: '#f8f9fa' }}>
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
                                                <td>{ins.usuario.email || <span style={{ color: '#999' }}>Sin email</span>}</td>
                                                <td>{ins.usuario.role}</td>
                                                <td>
                                                    {ins.asistio ? (
                                                        <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Asistió</span>
                                                    ) : (
                                                        <span style={{ color: '#666' }}>Pendiente</span>
                                                    )}
                                                </td>
                                                <td>{new Date(ins.fecha_inscripcion).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center" style={{ padding: '30px' }}>
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay inscritos en este evento aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Controles de Paginación */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                            <span style={{ fontWeight: 'bold' }}>
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* VISTA DE ESTADÍSTICAS AVANZADAS */
                <div className="card" style={{ marginTop: '20px', padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>📊 Estadísticas de Asistencia por Dependencia</h3>
                        <button className="btn btn-secondary" onClick={() => setShowStats(false)}>
                            ⬅ Volver a Lista
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '10px' }}>
                        <button
                            className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChartType('pie')}
                        >
                            🥧 Gráfico de Pastel
                        </button>
                        <button
                            className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChartType('bar')}
                        >
                            📊 Gráfico de Barras
                        </button>
                    </div>

                    <div style={{ height: '500px', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        {chartData ? (
                            chartType === 'pie' ? (
                                <Pie data={chartData} options={{ maintainAspectRatio: false }} />
                            ) : (
                                <Bar data={chartData} options={{ maintainAspectRatio: false }} />
                            )
                        ) : (
                            <p style={{ marginTop: '50px', fontSize: '1.2rem' }}>No hay datos suficientes para generar gráficas.</p>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE CERTIFICADOS */}
            {showCertModal && (
                <div className="modal-overlay" onClick={() => !generatingCerts && setShowCertModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generar Certificados de Asistencia</h3>
                            {!generatingCerts && <button className="modal-close" onClick={() => setShowCertModal(false)}>✕</button>}
                        </div>
                        <form onSubmit={handleGenerarCertificados}>
                            {/* ...Contenido del formulario... */}
                            {/* (Se mantiene igual que el original, solo comentado en la cabecera del bloque) */}
                            <div className="alert alert-info" style={{ background: '#e3f2fd', color: '#0d47a1' }}>
                                <p style={{ margin: 0 }}>ℹ️ <strong>Instrucciones:</strong></p>
                                <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
                                    <li>Se generarán certificados <strong>solo para los asistentes marcados como "Asistió"</strong>.</li>
                                    <li>Los certificados se enviarán automáticamente por correo.</li>
                                    <li>Puedes subir una plantilla PDF personalizada o usar la anterior.</li>
                                </ul>
                            </div>

                            <div className="form-group">
                                <label>Plantilla PDF (Opcional si ya existe una)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setCertTemplate(e.target.files[0])}
                                    disabled={generatingCerts}
                                />
                                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                                    Sube un PDF donde quieras que se sobreponga el Nombre y Documento.
                                </small>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handlePreviewCertificado()}
                                    disabled={generatingCerts}
                                    style={{ marginRight: 'auto', background: '#e0f7fa', color: '#006064', borderColor: '#b2ebf2' }}
                                >
                                    👁️ Vista Previa
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCertModal(false)}
                                    disabled={generatingCerts}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={generatingCerts}
                                >
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
