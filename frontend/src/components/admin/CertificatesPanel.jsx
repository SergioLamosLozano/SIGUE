/**
 * CertificatesPanel.jsx - Certificate Management Panel
 * 
 * Centralized certificate management component, independent from individual events.
 * Uses CSS classes from Certificados.css
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Certificados.css';

const CertificatesPanel = () => {
    const navigate = useNavigate();

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
                <div className="page-header-card__right">
                    {/* Future: Add action button here */}
                </div>
            </div>

            {/* Main Content */}
            <div className="certificates-content">
                <div className="certificates-content__icon">📜</div>
                
                <h3 className="certificates-content__title">
                    Módulo de Certificados
                </h3>
                
                <p className="certificates-content__description">
                    Desde aquí podrás gestionar plantillas de certificados, 
                    visualizar certificados emitidos y generar certificados masivos 
                    para los eventos que requieran.
                </p>

                {/* Placeholder Cards for Future Features */}
                <div className="certificates-features">
                    <div className="certificates-feature-card certificates-feature-card--placeholder">
                        <span className="certificates-feature-card__icon">📋</span>
                        <p className="certificates-feature-card__title">Plantillas</p>
                        <small className="certificates-feature-card__status">Próximamente</small>
                    </div>

                    <div className="certificates-feature-card certificates-feature-card--placeholder">
                        <span className="certificates-feature-card__icon">📊</span>
                        <p className="certificates-feature-card__title">Historial</p>
                        <small className="certificates-feature-card__status">Próximamente</small>
                    </div>

                    <div className="certificates-feature-card certificates-feature-card--placeholder">
                        <span className="certificates-feature-card__icon">⚙️</span>
                        <p className="certificates-feature-card__title">Configuración</p>
                        <small className="certificates-feature-card__status">Próximamente</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificatesPanel;
