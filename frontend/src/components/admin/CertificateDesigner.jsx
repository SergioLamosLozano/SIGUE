import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import api from '../../services/api';
import '../../styles/CertificateDesigner.css';

const CertificateDesigner = ({ onBack }) => {
  const [templateImage, setTemplateImage] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  
  // Refs
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null); 
  const itemsRef = useRef({}); // Store refs for draggable items (Strict Mode fix)

  // State
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // Container dimensions
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 }); // Original image size
  const [scaleFactor, setScaleFactor] = useState(1); // Ratio: current / original

  // API State
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fields, setFields] = useState([
    { id: 'nombre_estudiante', type: 'text', text: 'Nombre Estudiante', x: 20, y: 30, fontSize: 40, fontFamily: 'Helvetica, sans-serif' },
    { id: 'cedula_estudiante', type: 'text', text: 'Documento ID', x: 20, y: 40, fontSize: 25, fontFamily: 'Helvetica, sans-serif' },
  ]);

  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // --- CARGAR EVENTOS ---
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/eventos/'); 
        console.log("Respuesta API Eventos:", response.data); 

        const eventosArray = Array.isArray(response.data) 
            ? response.data 
            : (response.data.results || []);

        setEvents(eventosArray);
      } catch (error) {
        console.error("Error cargando eventos:", error);
        setEvents([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // --- RESIZE OBSERVER & SCALING SYSTEM ---
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
            
            // Recalculate scale factor if natural size is known
            if (naturalSize.width > 0) {
                setScaleFactor(width / naturalSize.width);
            }
        }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [naturalSize.width]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
      setTemplateImage(URL.createObjectURL(file));
      // Reset logic handled in onLoad
    }
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setNaturalSize({ width: natW, height: natH });
    
    // Initial dimensions set
    updateDimensions();
  };
  
  const updateDimensions = () => {
      if (containerRef.current) {
          const w = containerRef.current.offsetWidth;
          const h = containerRef.current.offsetHeight;
          setDimensions({ width: w, height: h });
          if(naturalSize.width > 0) {
              setScaleFactor(w / naturalSize.width);
          }
      }
  };

  // --- SIGNATURES ---
  const addTextSignature = () => {
    const newId = `firma_txt_${Date.now()}`;
    setFields([...fields, {
        id: newId, type: 'text', text: 'Firma Autorizada',
        x: 50, y: 50, fontSize: 30, fontFamily: 'Helvetica, sans-serif', isSignature: true
    }]);
    setSelectedFieldId(newId);
  };

  const triggerSignatureUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSignatureUpload = (e) => {
     const file = e.target.files[0];
     if (file) {
         const newId = `firma_img_${Date.now()}`;
         setFields([...fields, {
             id: newId, type: 'image', src: URL.createObjectURL(file), 
             file: file,
             x: 40, y: 40, width: 200, isSignature: true 
         }]);
         setSelectedFieldId(newId);
     }
     e.target.value = '';
  };

  // --- DRAG LOGIC (Controlled by Pixels based on %) ---
  const handleStop = (e, data, id) => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;
    
    // Convert current pixel position back to percentage relative to container
    // We must use data.x/y provided by Draggable
    // But data.x/y is relative to the offset parent.
    // Since we use position prop, data.x IS the new x.
    
    const xPercent = (data.x / width) * 100;
    const yPercent = (data.y / height) * 100;

    setFields(prev => prev.map(f => f.id === id ? { ...f, x: xPercent, y: yPercent } : f));
  };

  const updateFieldStyle = (property, value) => {
    if (!selectedFieldId) return;
    setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, [property]: value } : f));
  };

  const deleteSelectedField = () => {
      if (!selectedFieldId) return;
      setFields(prev => prev.filter(f => f.id !== selectedFieldId));
      setSelectedFieldId(null);
  };

  const handleSave = async () => {
    if (!selectedEventId) return alert("⚠️ Selecciona un evento.");
    if (!fileToUpload) return alert("⚠️ Sube una imagen.");

    const configMap = {};
    fields.forEach(f => {
        // We save the ORIGINAL font size (base), not the scaled one.
        if (f.type === 'text') {
            configMap[f.id] = { type: 'text', x: f.x, y: f.y, fontSize: f.fontSize, fontFamily: f.fontFamily, text: f.text };
        } else if (f.type === 'image') {
            configMap[f.id] = { type: 'image', x: f.x, y: f.y, width: f.width };
        }
    });

    const formData = new FormData();
    formData.append('event', selectedEventId);
    formData.append('image', fileToUpload);
    formData.append('config_data', JSON.stringify(configMap));

    try {
        setSaving(true);
        await api.post('/certificates/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("✅ Plantilla guardada exitosamente.");
        if(onBack) onBack(); 
    } catch (error) {
        console.error("Error guardando:", error);
        alert("❌ Error: " + (error.response?.data?.detail || error.message));
    } finally {
        setSaving(false);
    }
  };

  const currentField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="certificate-designer-container">
      <div className="designer-header page-header-card" style={{flexWrap: 'wrap', gap: '10px'}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexGrow: 1 }}>
          <button onClick={onBack} className="btn-back">← Volver</button>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🎨 Diseñador de Certificados</h2>
            {loading && <small style={{color: '#666'}}>Cargando eventos...</small>}
          </div>
        </div>
        <div style={{minWidth: '200px'}}>
            <select 
                className="style-input" 
                style={{width: '100%', padding: '8px', fontWeight: 'bold'}}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={loading}
            >
                <option value="">-- Seleccionar Evento --</option>
                {Array.isArray(events) && events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                        {ev.titulo || ev.nombre || "Evento sin nombre"}
                    </option>
                ))}
            </select>
        </div>
        {templateImage && (
           <div className="toolbar" style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
             <div style={{display: 'flex', gap: '5px'}}>
                <button onClick={addTextSignature} className="toolbar-btn btn-add-signature">+ Txt</button>
                <button onClick={triggerSignatureUpload} className="toolbar-btn btn-add-signature">+ Img</button>
                <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/png, image/jpeg" onChange={handleSignatureUpload} />
             </div>
             <div className="divider-vertical"></div>
             <div className="style-controls" style={{minWidth: '200px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontSize: '0.8rem', color: '#666'}}>
                    {selectedFieldId ? (currentField?.type === 'image' ? 'Img' : 'Txt') : 'Nada'}
                    </span>
                    {selectedFieldId && !['nombre_estudiante', 'cedula_estudiante'].includes(selectedFieldId) && (
                        <button onClick={deleteSelectedField} style={{border: 'none', background: 'none', color: 'red', cursor: 'pointer'}}>🗑️</button>
                    )}
                </div>
                <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                  {currentField?.type === 'text' && (
                      <>
                        <select 
                            onChange={(e) => updateFieldStyle('fontFamily', e.target.value)}
                            className="style-input" style={{width: '100px'}}
                            value={currentField.fontFamily}
                        >
                            <option value="Helvetica, sans-serif">Helvetica</option>
                            <option value="'Times New Roman', serif">Times</option>
                            <option value="'Courier New', monospace">Courier</option>
                            <option value="'Brush Script MT', cursive">Script</option>
                        </select>
                        <input 
                            type="number" min="10" max="200" placeholder="Px"
                            onChange={(e) => updateFieldStyle('fontSize', parseInt(e.target.value))}
                            className="style-input" style={{width: '60px'}}
                            value={currentField.fontSize || ''}
                        />
                      </>
                  )}
                  {currentField?.type === 'image' && (
                      <input 
                        type="range" min="50" max="600" 
                        value={currentField.width || 150}
                        onChange={(e) => updateFieldStyle('width', parseInt(e.target.value))}
                        style={{width: '100px'}}
                      />
                  )}
                </div>
             </div>
             <div className="divider-vertical"></div>
            <button onClick={handleSave} className="btn-save" disabled={saving}>
                {saving ? '...' : '💾'}
            </button>
           </div>
        )}
      </div>

      <div className="designer-workspace-wrapper">
        {!templateImage && (
          <div className="upload-zone-compact">
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <p>Sube tu plantilla (PNG/JPG)</p>
            {!selectedEventId && <p style={{color: 'orange'}}>⚠️ Selecciona un evento arriba</p>}
          </div>
        )}

        {templateImage && (
          <div className="designer-workspace-card">
            {/* CANVAS EXACT WRAPPER */}
            <div className="canvas-exact-wrapper" ref={containerRef} style={{ position: 'relative' }}>
              <img 
                ref={imageRef}
                src={templateImage} 
                alt="Plantilla" 
                onLoad={handleImageLoad}
                style={{ maxWidth: '100%', display: 'block', pointerEvents: 'none' }} 
              />
              
              {fields.map((field) => {
                  // NODE REF LOGIC FOR STRICT MODE
                  if (!itemsRef.current[field.id]) {
                      itemsRef.current[field.id] = React.createRef();
                  }
                  const nodeRef = itemsRef.current[field.id];

                  // POSITIONING
                  const pxX = (field.x * dimensions.width) / 100;
                  const pxY = (field.y * dimensions.height) / 100;
                  
                  // FONT SCALING (Visual only)
                  // If we don't have scaleFactor yet (0 or NaN), fallback to 1
                  const safeScale = scaleFactor > 0 ? scaleFactor : 1;
                  const visualFontSize = field.fontSize * safeScale;
                  const visualWidth = (field.width || 150) * safeScale; // Scale image width too!

                  return (
                    <Draggable
                      key={field.id}
                      nodeRef={nodeRef}
                      bounds="parent"
                      position={{ x: pxX, y: pxY }}
                      onStart={() => setSelectedFieldId(field.id)}
                      onStop={(e, data) => handleStop(e, data, field.id)}
                    >
                      <div 
                        ref={nodeRef}
                        className={`draggable-field ${selectedFieldId === field.id ? 'selected' : ''}`}
                        style={{
                          position: 'absolute', margin: 0,
                          top: 0, left: 0, 
                          whiteSpace: 'nowrap', // Prevent line break
                          zIndex: selectedFieldId === field.id ? 100 : 1,
                          
                          // Conditional Styles
                          ...(field.type === 'text' ? {
                              fontSize: `${visualFontSize}px`, 
                              fontFamily: field.fontFamily
                          } : {
                              padding: 0, background: 'transparent',
                              border: selectedFieldId === field.id ? '2px solid #D52B1E' : '1px dashed transparent'
                          })
                        }}
                      >
                        {field.type === 'text' ? field.text : (
                            <img src={field.src} alt="Firma" style={{width: `${visualWidth}px`, height: 'auto', display: 'block', pointerEvents: 'none'}} />
                        )}
                      </div>
                    </Draggable>
                  );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateDesigner;
