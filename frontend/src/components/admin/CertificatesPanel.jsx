/**
 * CertificatesPanel.jsx - Certificate Management Panel
 * 
 * Centralized certificate management component, independent from individual events.
 * Uses CSS classes from Certificados.css
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Certificados.css';
import CertificateDesigner from './CertificateDesigner';
import CertificateSender from './CertificateSender';

const CertificatesPanel = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('menu'); // 'menu' | 'designer' | 'sender'

    return (
        <div className="certificates-panel">
            {/* Page Header Card - Standardized */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button 
                        onClick={() => navigate('/admin-dashboard')} 
                        className="btn btn-secondary"
                    >
                        ← Volver
                    </button>
                    <h2 className="page-title">📜 Gestión de Certificados</h2>
                </div>
            </div>

            {/* Main Content: MENU */}
            {view === 'menu' && (
                <div className="certificates-content">
                    <div className="certificates-content__icon">📜</div>
                    
                    <h3 className="certificates-content__title">
                        Módulo de Certificados
                    </h3>
                    
                    <p className="certificates-content__description">
                        Gestión end-to-end de certificados académicos. 
                        Diseña plantillas, genera documentos masivos y consulta el historial.
                    </p>

                    {/* Features Cards */}
                    <div className="certificates-features">
                        {/* PLANTILLA CARD */}
                        <div 
                            className="certificates-feature-card" 
                            onClick={() => setView('designer')}
                            style={{ cursor: 'pointer', border: '1px solid var(--primary-color)' }}
                        >
                            <span className="certificates-feature-card__icon">🎨</span>
                            <p className="certificates-feature-card__title">Diseñador de Plantillas</p>
                            <small className="certificates-feature-card__status" style={{color: 'var(--primary-color)'}}>Editor Visual</small>
                        </div>

                        {/* BULK GENERATION CARD */}
                        <div 
                            className="certificates-feature-card"
                            onClick={() => setView('sender')}
                            style={{ cursor: 'pointer', border: '1px solid #1a5f2a', backgroundColor: '#f0f9f0' }}
                        >
                            <span className="certificates-feature-card__icon">🚀</span>
                            <p className="certificates-feature-card__title">Generación Masiva</p>
                            <small className="certificates-feature-card__status" style={{color: '#1a5f2a'}}>Generar y Enviar</small>
                        </div>

                        <div className="certificates-feature-card certificates-feature-card--placeholder">
                            <span className="certificates-feature-card__icon">⚙️</span>
                            <p className="certificates-feature-card__title">Configuración</p>
                            <small className="certificates-feature-card__status">Próximamente</small>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content: DESIGNER */}
            {view === 'designer' && (
                <CertificateDesigner onBack={() => setView('menu')} />
            )}

            {/* Main Content: SENDER */}
            {view === 'sender' && (
                <CertificateSender onBack={() => setView('menu')} />
            )}
        </div>
    );
};

export default CertificatesPanel;
