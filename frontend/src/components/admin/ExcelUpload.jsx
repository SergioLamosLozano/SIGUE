import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../services/alert';

/**
 * Componente para cargar estudiantes activos desde archivo Excel.
 * Incluye tabla paginada de estudiantes matriculados.
 * Solo accesible por administradores.
 */
const ExcelUpload = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    // Estado para la tabla de estudiantes
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const pageSize = 20;

    const token = localStorage.getItem('token');
    const authConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    // Cargar estudiantes al montar y cuando cambia página o búsqueda
    useEffect(() => {
        fetchEstudiantes();
    }, [currentPage, searchTerm]);

    const fetchEstudiantes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('page_size', pageSize);
            if (searchTerm) params.append('search', searchTerm);

            const res = await axios.get(
                `http://localhost:8000/api/estudiantes-activos/?${params.toString()}`,
                authConfig
            );

            // Handle paginated or non-paginated response
            if (res.data.results) {
                setEstudiantes(res.data.results);
                setTotalCount(res.data.count);
            } else {
                // Non-paginated - handle client-side pagination
                const allData = res.data;
                setTotalCount(allData.length);
                const start = (currentPage - 1) * pageSize;
                setEstudiantes(allData.slice(start, start + pageSize));
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!file) {
            showError('Por favor selecciona un archivo Excel');
            return;
        }

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const res = await axios.post(
                'http://localhost:8000/api/admin/cargar-estudiantes/',
                formData,
                {
                    headers: {
                        ...authConfig.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setResult({
                success: true,
                message: res.data.message,
                creados: res.data.estudiantes_creados,
                actualizados: res.data.estudiantes_actualizados,
                errores: res.data.errores || []
            });

            showSuccess(`Carga completada: ${res.data.estudiantes_creados} nuevos, ${res.data.estudiantes_actualizados} actualizados`);
            setFile(null);

            // Reset file input
            const fileInput = document.getElementById('excel-file-input');
            if (fileInput) fileInput.value = '';

            // Recargar tabla de estudiantes
            setCurrentPage(1);
            fetchEstudiantes();

        } catch (error) {
            console.error('Error uploading file:', error);
            const errorMsg = error.response?.data?.error || error.message;
            setResult({
                success: false,
                message: errorMsg
            });
            showError('Error al cargar archivo: ' + errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div style={{ maxWidth: '1200px' }}>
            {/* Botón Volver */}
            <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary mb-3">
                ← Volver
            </button>

            {/* Sección de Carga de Excel */}
            <div className="excel-upload-container" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px'
            }}>
                <h3 style={{ margin: '0 0 16px', color: '#333' }}>
                    📥 Cargar Estudiantes Activos
                </h3>

                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Sube un archivo Excel (.xlsx) con los datos de estudiantes activos.
                    Las columnas requeridas son: <strong>Código, Apellidos, Nombres, Email, Programa Académico</strong>.
                </p>

                <form onSubmit={handleUpload}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <input
                            id="excel-file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px dashed #ddd',
                                borderRadius: '8px',
                                background: '#fafafa',
                                cursor: 'pointer'
                            }}
                        />
                    </div>

                    {file && (
                        <p style={{ color: '#2196f3', fontSize: '0.9rem', margin: '0 0 16px' }}>
                            📎 Archivo seleccionado: {file.name}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!file || uploading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '12px 24px',
                            fontSize: '1rem',
                            opacity: (!file || uploading) ? 0.6 : 1,
                            cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {uploading ? '⏳ Cargando...' : '📤 Subir y Procesar'}
                    </button>
                </form>

                {/* Resultado de la carga */}
                {result && (
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        borderRadius: '8px',
                        background: result.success ? '#e8f5e9' : '#ffebee',
                        border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`
                    }}>
                        <h4 style={{
                            margin: '0 0 8px',
                            color: result.success ? '#2e7d32' : '#c62828'
                        }}>
                            {result.success ? '✅ Carga Exitosa' : '❌ Error en la Carga'}
                        </h4>

                        {result.success ? (
                            <div style={{ fontSize: '0.9rem' }}>
                                <p style={{ margin: '4px 0' }}>
                                    • Estudiantes nuevos: <strong>{result.creados}</strong>
                                </p>
                                <p style={{ margin: '4px 0' }}>
                                    • Estudiantes actualizados: <strong>{result.actualizados}</strong>
                                </p>
                                {result.errores.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                        <p style={{ color: '#f57c00', margin: '0 0 4px' }}>
                                            ⚠️ Advertencias ({result.errores.length}):
                                        </p>
                                        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.85rem' }}>
                                            {result.errores.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p style={{ margin: '0', fontSize: '0.9rem' }}>{result.message}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Tabla de Estudiantes Matriculados */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>
                        🎓 Estudiantes Matriculados ({totalCount})
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={handleSearch}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            width: '280px',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        ⏳ Cargando estudiantes...
                    </div>
                ) : estudiantes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <p>No hay estudiantes matriculados.</p>
                        <p style={{ fontSize: '0.9rem' }}>Sube un archivo Excel para cargar estudiantes.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Código</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Correo</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Programa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estudiantes.map((est, idx) => (
                                        <tr key={est.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px', fontWeight: '500' }}>{est.codigo_estudiante}</td>
                                            <td style={{ padding: '12px' }}>{est.nombre}</td>
                                            <td style={{ padding: '12px', color: '#2196f3' }}>{est.correo || '-'}</td>
                                            <td style={{ padding: '12px' }}>
                                                {est.programa_nombre || est.programa?.descripcion || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '20px',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: currentPage === 1 ? '#f5f5f5' : 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ⏮️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: currentPage === 1 ? '#f5f5f5' : 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ◀️
                                </button>

                                <span style={{ padding: '8px 16px', fontWeight: '500' }}>
                                    Página {currentPage} de {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: currentPage === totalPages ? '#f5f5f5' : 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ▶️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: currentPage === totalPages ? '#f5f5f5' : 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ⏭️
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ExcelUpload;
