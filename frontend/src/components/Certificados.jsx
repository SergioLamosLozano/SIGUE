import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { enviarCertificados } from '../services/api';
import '../styles/Certificados.css';

/**
 * Componente para gestionar el envío masivo de certificados por correo electrónico.
 * Muestra el estado del proceso y un resumen final de los resultados.
 */
const Certificados = () => {
    // Estados para controlar la interfaz
    const [loading, setLoading] = useState(false); // Indica si el proceso está en curso
    const [resultados, setResultados] = useState(null); // Almacena la respuesta del backend
    const [error, setError] = useState(null); // Muestra errores generales de la petición

    /**
     * Maneja el clic en el botón de enviar.
     * Solicita confirmación y llama al servicio de envío de certificados.
     */
    const handleEnviar = async () => {
        if (!window.confirm('¿Estás seguro de que deseas enviar los certificados? Esto enviará correos a todos los asistentes con un archivo PDF coincidente.')) {
            return;
        }

        setLoading(true);
        setError(null);
        setResultados(null);

        try {
            // Llama a la API (ver services/api.js)
            const response = await enviarCertificados();
            setResultados(response.data);
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al intentar enviar los certificados. Por favor revisa la consola o intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="certificados-container">
            <h1>Envío de Certificados</h1>
            
            {/* Sección de Acciones */}
            <div className="actions">
                <p>Asegúrate de que los archivos PDF estén en la carpeta <code>backend/media/certificados</code> y que el nombre del archivo coincida con el número de identificación del asistente.</p>
                <button 
                    onClick={handleEnviar} 
                    disabled={loading}
                    className="btn-enviar"
                >
                    {loading ? 'Enviando...' : 'Enviar Certificados'}
                </button>
            </div>

            {/* Mensajes de Error */}
            {error && <div className="error-message">{error}</div>}

            {/* Resultados del proceso (solo si hay datos) */}
            {resultados && (
                <div className="resultados">
                    <h2>Resultados del Envío</h2>
                    
                    {/* Resumen numérico */}
                    <div className="resumen">
                        <p><strong>Enviados:</strong> {resultados.enviados.length}</p>
                        <p><strong>No encontrados (PDF sin asistente):</strong> {resultados.no_encontrados.length}</p>
                        <p><strong>Sin correo:</strong> {resultados.sin_correo.length}</p>
                        <p><strong>Errores:</strong> {resultados.errores.length}</p>
                    </div>

                    {/* Lista detallada de Exitosos */}
                    {resultados.enviados.length > 0 && (
                        <div className="lista-resultados success">
                            <h3>Enviados Exitosamente</h3>
                            <ul>
                                {resultados.enviados.map((item, index) => (
                                    <li key={index}>{item.nombre} ({item.identificacion}) - {item.correo}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Lista de PDFs huérfanos */}
                    {resultados.no_encontrados.length > 0 && (
                        <div className="lista-resultados warning">
                            <h3>No Encontrados en Base de Datos</h3>
                            <p>Archivos PDF que no coinciden con ningún asistente:</p>
                            <ul>
                                {resultados.no_encontrados.map((id, index) => (
                                    <li key={index}>{id}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Asistentes sin email configurado */}
                    {resultados.sin_correo.length > 0 && (
                        <div className="lista-resultados warning">
                            <h3>Asistentes Sin Correo</h3>
                            <ul>
                                {resultados.sin_correo.map((id, index) => (
                                    <li key={index}>{id}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Errores técnicos específicos */}
                    {resultados.errores.length > 0 && (
                        <div className="lista-resultados error">
                            <h3>Errores de Envío</h3>
                            <ul>
                                {resultados.errores.map((item, index) => (
                                    <li key={index}>{item.identificacion}: {item.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Certificados;
