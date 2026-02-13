import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { validarCodigoQR } from '../../services/api';
import '../../styles/QRScanner.css';

/**
 * Componente de Escáner QR.
 * Permite escanear códigos usando la cámara del dispositivo o ingresar manualmente la identificación.
 * Valida los códigos contra el backend y muestra el resultado (Éxito/Error/Ya usado).
 */
function QRScanner() {
  const { id } = useParams();
  // Estados de UI y Datos
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const isProcessing = useRef(false); // Lock to prevent double-scanning

  // Referencias para control de librería y foco
  const [scanner, setScanner] = useState(null);
  const inputRef = useRef(null);

  // Auto-foco al montar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Recurperar foco tras validar
  useEffect(() => {
    if (result || error) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [result, error]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error('Error clearing scanner:', err));
      }
    };
  }, [scanner]);

  /**
   * Inicia el escáner de cámara usando Html5QrcodeScanner.
   */
  const startScanning = () => {
    setScanning(true);
    setResult(null);
    setError(null);
    isProcessing.current = false; // Reset lock

    const qrScanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    qrScanner.render(onScanSuccess, onScanError);
    setScanner(qrScanner);
  };

  /**
   * Detiene el escáner y libera la cámara.
   */
  const stopScanning = () => {
    if (scanner) {
      scanner.clear().then(() => {
        setScanning(false);
        setScanner(null);
      }).catch(err => {
        console.error('Error al detener el escáner:', err);
      });
    }
  };

  /**
   * Callback ejecutado cuando se detecta un QR válido por cámara.
   */
  const onScanSuccess = async (decodedText) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    console.log('QR escaneado:', decodedText);
    stopScanning(); // Detener cámara tras lectura exitosa

    try {
      const response = await validarCodigoQR(decodedText);
      setResult({
        success: true,
        mensaje: response.data.mensaje,
        asistente: response.data.asistente,
        tipo_comida: response.data.tipo_comida,
        fecha_uso: response.data.fecha_uso
      });
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al validar el código QR';
      const asistenteInfo = err.response?.data?.asistente || null;
      setError({
        mensaje: errorMsg,
        asistente: asistenteInfo,
        tipo_comida: err.response?.data?.tipo_comida,
        fecha_uso: err.response?.data?.fecha_uso
      });
      setResult(null);
    } finally {
      // Optional: unlock after delay if needed, but since we stopped scanning, it's fine.
      isProcessing.current = false;
    }
  };

  const onScanError = (err) => {
    // Ignorar errores de "No QR Found" que ocurren en cada frame
    if (err.includes('NotFoundException')) {
      return;
    }
    console.warn('Error de escaneo:', err);
  };

  /**
   * Maneja la entrada manual de códigos (teclado o lector físico USB).
   */
  const handleManualInput = async (e) => {
    e.preventDefault();
    const codigo = e.target.codigo.value.trim();

    if (!codigo) return;

    try {
      const response = await validarCodigoQR(codigo);
      setResult({
        success: true,
        mensaje: response.data.mensaje,
        asistente: response.data.asistente,
        tipo_comida: response.data.tipo_comida,
        fecha_uso: response.data.fecha_uso
      });
      setError(null);

      e.target.reset(); // Limpiar campo

      // Auto-ocultar éxito tras 5 segundos
      setTimeout(() => {
        setResult(null);
      }, 5000);

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al validar el código QR';
      const asistenteInfo = err.response?.data?.asistente || null;
      setError({
        mensaje: errorMsg,
        asistente: asistenteInfo,
        tipo_comida: err.response?.data?.tipo_comida,
        fecha_uso: err.response?.data?.fecha_uso
      });
      setResult(null);

      e.target.reset();

      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  return (
    <>
      <nav className="navbar" style={{ marginBottom: '1rem', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="scanner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>📸 Escáner de Evento</h1>
          <Link to={`/admin-dashboard/event/${id}`} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', border: 'none' }}>
            ⬅ Volver al Evento
          </Link>
        </div>
      </nav>

      <div className="card">
        <h2>Escanear Código QR</h2>

        {/* --- MENSAJES DE ERROR / RESULTADO --- */}
        {error && (
          <div className="alert alert-error" style={{
            fontSize: '1.2rem',
            padding: '1.5rem',
            animation: 'shake 0.5s'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#ff4444' }}>
              ❌ {typeof error === 'string' ? error : error.mensaje}
            </h3>
            {typeof error === 'object' && error.asistente && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  fontSize: '1rem'
                }}>
                  <div>
                    <strong>👤 Asistente:</strong><br />
                    {error.asistente.nombre_completo}
                  </div>
                  <div>
                    <strong>📄 Identificación:</strong><br />
                    {error.asistente.identificacion}
                  </div>
                  <div>
                    <strong>🏢 Dependencia:</strong><br />
                    {error.asistente.sede || 'N/A'}
                  </div>
                  <div>
                    <strong>🍽️ Tipo de Entregable:</strong><br />
                    {error.tipo_comida}
                  </div>
                </div>
                {error.fecha_uso && (
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                    <strong>⏰ Usado el:</strong> {new Date(error.fecha_uso).toLocaleString('es-CO')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="alert alert-success" style={{
            fontSize: '1.2rem',
            padding: '1.5rem',
            animation: 'fadeIn 0.3s'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#4CAF50' }}>
              ✅ ¡Código Válido!
            </h3>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '1rem',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                fontSize: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <strong>👤 Asistente:</strong><br />
                  <span style={{ fontSize: '1.2rem' }}>{result.asistente.nombre_completo}</span>
                </div>
                <div>
                  <strong>📄 Identificación:</strong><br />
                  {result.asistente.identificacion}
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                fontSize: '1rem'
              }}>
                <div>
                  <strong>🏢 Dependencia:</strong><br />
                  {result.asistente.sede || 'N/A'}
                </div>
                <div>
                  <strong>🍽️ Tipo de Entregable:</strong><br />
                  <span style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginTop: '0.25rem'
                  }}>
                    {result.tipo_comida}
                  </span>
                </div>
              </div>
              <div style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                opacity: 0.8
              }}>
                <strong>⏰ Registrado:</strong><br />
                {new Date(result.fecha_uso).toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        )}

        {/* --- CONTROLES DE CÁMARA --- */}
        <div style={{ marginBottom: '2rem' }}>
          {!scanning ? (
            <button className="btn btn-primary" onClick={startScanning}>
              Iniciar Escáner de Cámara
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopScanning}>
              Detener Escáner
            </button>
          )}
        </div>

        <div id="qr-reader" style={{ marginBottom: '2rem' }}></div>

        {/* --- ENTRADA MANUAL --- */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>📝 Escaneo Rápido Manual</h3>
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>
            Escanea el código QR (Identificación) con el lector y presiona Enter.
          </p>
          <form onSubmit={handleManualInput}>
            <div className="form-group">
              <label htmlFor="codigo">Identificación / Código QR</label>
              <input
                ref={inputRef}
                type="text"
                id="codigo"
                name="codigo"
                placeholder="Escanea o pega la identificación aquí..."
                autoFocus
                autoComplete="off"
                style={{
                  fontSize: '1.1rem',
                  padding: '0.8rem',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              ✅ Validar Código (o presiona Enter)
            </button>
          </form>
          <div style={{
            marginTop: '1rem',
            padding: '0.8rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#888'
          }}>
            💡 <strong>Tip:</strong> Mantén el cursor en el campo de entrada. Después de cada escaneo,
            el campo se limpiará automáticamente y estará listo para el siguiente código.
          </div>
        </div>
      </div>
    </>
  );
}

export default QRScanner;
