/**
 * ExcelUpload.jsx - Excel Student Upload Component
 * 
 * Allows administrators to upload Excel files with active students.
 * Includes paginated table of enrolled students.
 * Uses CSS classes from ExcelUpload.css
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../services/alert';
import '../../styles/ExcelUpload.css';

const ExcelUpload = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    // State for students table
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const pageSize = 20;

    const token = sessionStorage.getItem('token');
    const authConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    // Load students on mount and when page/search changes
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

            if (res.data.results) {
                setEstudiantes(res.data.results);
                setTotalCount(res.data.count);
            } else {
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

            const fileInput = document.getElementById('excel-file-input');
            if (fileInput) fileInput.value = '';

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
        <div className="excel-upload-page">
            {/* Page Header Card */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button
                        onClick={() => navigate('/admin-dashboard')}
                        className="btn btn-secondary"
                    >
                        ← Volver
                    </button>
                    <h2 className="page-title">🎓 Estudiantes Activos</h2>
                </div>
                <div className="page-header-card__right">
                    {/* No action button for this page */}
                </div>
            </div>

            {/* Excel Upload Section */}
            <div className="excel-upload-card">
                <h3 className="excel-upload-card__title">
                    📥 Cargar Estudiantes Activos
                </h3>

                <p className="excel-upload-card__description">
                    Sube un archivo Excel (.xlsx) con los datos de estudiantes activos.
                    Las columnas requeridas son: <strong>Código, Apellidos, Nombres, Email, Programa Académico</strong>.
                </p>

                <form onSubmit={handleUpload}>
                    <div className="form-group mb-3">
                        <input
                            id="excel-file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="excel-upload-card__file-input"
                        />
                    </div>

                    {file && (
                        <p className="excel-upload-card__file-info">
                            📎 Archivo seleccionado: {file.name}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!file || uploading}
                        className="btn btn-primary excel-upload-card__submit"
                    >
                        {uploading ? '⏳ Cargando...' : '📤 Subir y Procesar'}
                    </button>
                </form>

                {/* Upload Result */}
                {result && (
                    <div className={`excel-upload-result ${result.success ? 'excel-upload-result--success' : 'excel-upload-result--error'}`}>
                        <h4 className={`excel-upload-result__title ${result.success ? 'excel-upload-result__title--success' : 'excel-upload-result__title--error'}`}>
                            {result.success ? '✅ Carga Exitosa' : '❌ Error en la Carga'}
                        </h4>

                        {result.success ? (
                            <div className="excel-upload-result__details">
                                <p>• Estudiantes nuevos: <strong>{result.creados}</strong></p>
                                <p>• Estudiantes actualizados: <strong>{result.actualizados}</strong></p>
                                {result.errores.length > 0 && (
                                    <div className="excel-upload-result__warnings">
                                        <p className="excel-upload-result__warnings-title">
                                            ⚠️ Advertencias ({result.errores.length}):
                                        </p>
                                        <ul className="excel-upload-result__warnings-list">
                                            {result.errores.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p>{result.message}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Students Table */}
            <div className="students-table-card">
                <div className="students-table-card__header">
                    <h3 className="students-table-card__title">
                        🎓 Estudiantes Matriculados ({totalCount})
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="students-table-card__search"
                    />
                </div>

                {loading ? (
                    <div className="students-table-card__loading">
                        ⏳ Cargando estudiantes...
                    </div>
                ) : estudiantes.length === 0 ? (
                    <div className="students-table-card__empty">
                        <p>No hay estudiantes matriculados.</p>
                        <p className="students-table-card__empty-hint">
                            Sube un archivo Excel para cargar estudiantes.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="students-table-card__wrapper">
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nombre</th>
                                        <th>Correo</th>
                                        <th>Programa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estudiantes.map((est, idx) => (
                                        <tr key={est.id || idx}>
                                            <td className="students-table__code">
                                                {est.codigo_estudiante}
                                            </td>
                                            <td>{est.nombre}</td>
                                            <td className="students-table__email">
                                                {est.correo || '-'}
                                            </td>
                                            <td>
                                                {est.programa_nombre || est.programa?.descripcion || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="students-pagination">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="students-pagination__btn"
                                >
                                    ⏮️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="students-pagination__btn"
                                >
                                    ◀️
                                </button>

                                <span className="students-pagination__info">
                                    Página {currentPage} de {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="students-pagination__btn"
                                >
                                    ▶️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="students-pagination__btn"
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
