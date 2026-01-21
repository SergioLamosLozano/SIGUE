
import os
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PyPDF2 import PdfWriter, PdfReader
from django.conf import settings
from django.core.files.base import ContentFile
import textwrap

def generar_certificado_pdf(nombre_asistente, documento_asistente, ruta_plantilla_pdf):
    """
    Genera un certificado PDF superponiendo el nombre y documento sobre una plantilla PDF existente.
    
    Args:
        nombre_asistente (str): Nombre completo del asistente.
        documento_asistente (str): Documento de identidad.
        ruta_plantilla_pdf (str): Ruta absoluta al archivo PDF plantilla en el servidor.
        
    Returns:
        BytesIO: El contenido del PDF generado en memoria (listo para enviar o guardar).
    """
    
    # -------------------------------------------------------------------------
    # CONFIGURACIÓN DE COORDENADAS (AJUSTAR AQUÍ MANUALMENTE SI CAMBIA LA PLANTILLA)
    # -------------------------------------------------------------------------
    # Las coordenadas están en puntos (1 punto = 1/72 pulgada).
    # (0,0) es la esquina inferior izquierda.
    
    # Coordenadas para el NOMBRE DEL ASISTENTE
    X_NOMBRE = 400   # Posición horizontal (centro aproximado)
    Y_NOMBRE = 300   # Posición vertical
    FONT_SIZE_NOMBRE = 24
    
    # Coordenadas para el DOCUMENTO (si se desea mostrar)
    MOSTRAR_DOCUMENTO = True
    X_DOC = 400
    Y_DOC = 260
    FONT_SIZE_DOC = 14
    PREFIX_DOC = "Identificación: "
    
    # COLORES RGB (0-1)
    COLOR_TEXTO = (0, 0, 0) # Negro
    
    # -------------------------------------------------------------------------
    
    packet = io.BytesIO()
    
    # 1. Crear un canvas temporal para "dibujar" el texto dinámico
    # Usamos landscape(letter) como base, pero el tamaño final depende de la plantilla
    c = canvas.Canvas(packet, pagesize=landscape(letter))
    
    # Configuración de fuente 
    # (usamos Helvetica-Bold por defecto, se podría cargar una fuente externa si fuera necesario)
    c.setFont("Helvetica-Bold", FONT_SIZE_NOMBRE)
    c.setFillColorRGB(*COLOR_TEXTO)
    
    # Dibujar Nombre centrado en las coordenadas dadas
    c.drawCentredString(X_NOMBRE, Y_NOMBRE, nombre_asistente.upper())
    
    # Dibujar Documento debajo del nombre
    if MOSTRAR_DOCUMENTO:
        c.setFont("Helvetica", FONT_SIZE_DOC)
        c.drawCentredString(X_DOC, Y_DOC, f"{PREFIX_DOC}{documento_asistente}")
    
    c.save()
    packet.seek(0)
    
    # 2. Leer el PDF que acabamos de generar (que solo tiene el texto)
    new_pdf = PdfReader(packet)
    
    # 3. Leer la plantilla original
    try:
        existing_pdf = PdfReader(open(ruta_plantilla_pdf, "rb"))
        output = PdfWriter()
        
        # Asumimos que la plantilla tiene 1 sola página relevante (la primera)
        page = existing_pdf.pages[0]
        
        # 4. Fusionar: plantilla + texto
        # merge_page superpone el contenido de 'new_pdf' sobre 'page'
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        
        # 5. Guardar el resultado en un nuevo buffer de memoria
        output_stream = io.BytesIO()
        output.write(output_stream)
        output_stream.seek(0)
        
        return output_stream
        
    except Exception as e:
        print(f"Error al procesar plantilla PDF: {e}")
        return None
