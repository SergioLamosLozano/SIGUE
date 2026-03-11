/**
 * CertificatesPanel.jsx - Certificate Management Panel
 * 
 * Centralized certificate management component, independent from individual events.
 * Uses CSS classes from Certificados.css
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Certificados.css';
import CertificateDesigner from './CertificateDesigner';
import CertificateSender from './CertificateSender';
import CertificateHistory from './CertificateHistory';

const CertificatesPanel = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [view, setView] = useState('menu'); // 'menu' | 'designer' | 'sender'
    const backUrl = user?.role === 'Coordinador' ? '/coordinador-dashboard' : '/admin-dashboard';

    return (
        <div className="certificates-panel">
            {/* Page Header Card - Standardized */}
            <div className="page-header-card">
                <div className="page-header-card__left">
                    <button 
                        onClick={() => navigate(backUrl)} 
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
                        Gestión de certificados académicos. 
                        Diseña plantillas, genera documentos masivos y consulta el historial.
                    </p>

                    {/* Features Cards */}
                    <div className="certificates-features">
                        {/* PLANTILLA CARD */}
                        <div 
                            className="certificates-feature-card certificates-feature-card--designer" 
                            onClick={() => setView('designer')}
                        >
                            <span className="certificates-feature-card__icon">🎨</span>
                            <p className="certificates-feature-card__title">Diseñador de Plantillas</p>
                            <small className="certificates-feature-card__status certificates-feature-card__status--primary">Editor Visual</small>
                        </div>

                        {/* BULK GENERATION CARD */}
                        <div 
                            className="certificates-feature-card certificates-feature-card--sender"
                            onClick={() => setView('sender')}
                        >
                            <span className="certificates-feature-card__icon">🚀</span>
                            <p className="certificates-feature-card__title">Generación Masiva</p>
                            <small className="certificates-feature-card__status certificates-feature-card__status--green">Generar y Enviar</small>
                        </div>

                        {/* HISTORY CARD */}
                        <div 
                            className="certificates-feature-card certificates-feature-card--history"
                            onClick={() => setView('history')}
                        >
                            <span className="certificates-feature-card__icon">📂</span>
                            <p className="certificates-feature-card__title">Historial y Descargas</p>
                            <small className="certificates-feature-card__status certificates-feature-card__status--gray">Consulta certificados generados</small>
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

                {/* Main Content: HISTORY */}
                {view === 'history' && (
                    <CertificateHistory onBack={() => setView('menu')} />
                )}
            </div>
        );
    };

export default CertificatesPanel;
