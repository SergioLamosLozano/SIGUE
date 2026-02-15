import React from 'react';
import '../styles/UnivalleCube.css';

const UnivalleCube = () => {
    
    const handleClick = () => {
        window.open('https://caicedonia.univalle.edu.co/', '_blank');
    };

    return (
        /* Wrapper invisible que cubre toda la pantalla pero permite clics (pointer-events: none) */
        <div className="univalle-cube-wrapper">
            {/* Elemento que se mueve por la pantalla y SÍ recibe clics */}
            <div className="univalle-cube-motion" onClick={handleClick} title="Ir a Univalle Caicedonia">
                {/* El cubo que gira 3D */}
                <div className="univalle-cube">
                    <div className="univalle-cube-face face-front">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                    <div className="univalle-cube-face face-back">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                    <div className="univalle-cube-face face-right">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                    <div className="univalle-cube-face face-left">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                    <div className="univalle-cube-face face-top">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                    <div className="univalle-cube-face face-bottom">
                        <img src="/univallelogo.png" alt="Univalle Logo" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnivalleCube;
