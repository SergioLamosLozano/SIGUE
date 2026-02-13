import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/SystemOptions.css';
import ProgramasManagement from './ProgramasManagement';
import LugaresManagement from './LugaresManagement';

const SystemOptions = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('programas');

    return (
        <div className="system-options-container">
            {/* Main Header */}
            <div className="system-header">
                <button onClick={() => navigate('/admin-dashboard')} className="btn-volver">
                    ← Volver
                </button>
                <h1 className="system-title">⚙️ Opciones del Sistema</h1>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'programas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('programas')}
                >
                    📚 Programas Académicos
                </button>
                <button
                    className={`tab-button ${activeTab === 'lugares' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lugares')}
                >
                    📍 Ubicaciones (Lugares)
                </button>
            </div>

            {/* Content */}
            <div className="tab-content">
                {activeTab === 'programas' && (
                    <ProgramasManagement hideHeader={true} />
                )}
                {activeTab === 'lugares' && (
                    <LugaresManagement hideHeader={true} />
                )}
            </div>
        </div>
    );
};

export default SystemOptions;
