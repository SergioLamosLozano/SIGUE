import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from io import BytesIO
import qrcode
from email.mime.image import MIMEImage

logger = logging.getLogger(__name__)


def generar_imagen_qr(data):
    """Genera una imagen QR y la retorna como bytes"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(str(data))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def enviar_codigos_qr_email(asistente, evento, codigos_qr):
    """
    Envía los códigos QR por email al asistente con detalles del evento.
    
    Args:
        asistente: Objeto Asistente (o adaptador)
        evento: Objeto Evento
        codigos_qr: Lista de objetos CodigoQR
    
    Returns:
        bool: True si se envió correctamente, False en caso contrario
    """
    try:
        logger.info(f"Intentando enviar email a {asistente.correo}")
        
        # Validar datos del asistente
        if not asistente.correo:
            logger.error(f"El asistente {asistente.nombre_completo} no tiene correo registrado.")
            return False
            
        if not asistente.identificacion:
            logger.error(f"El asistente {asistente.nombre_completo} no tiene identificación.")
            return False

        # Asunto del email
        subject = f'🎟️ Entrada y QRs: {evento.titulo} - {asistente.nombre_completo}'
        
        # Fecha formateada
        fecha_str = evento.fecha.strftime('%d/%m/%Y %H:%M')
        
        # Contenido HTML del email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f0f2f5;
                }}
                .header {{
                    background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }}
                .event-details {{
                    background-color: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #b91c1c;
                }}
                .qr-section {{
                    background-color: #ffffff;
                    margin: 20px 0;
                    padding: 20px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    text-align: center;
                }}
                .qr-title {{
                    color: #1f2937;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                .qr-image {{
                    max-width: 250px;
                    height: auto;
                    margin: 10px auto;
                    display: block;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 12px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0; font-size: 24px;">{evento.titulo}</h1>
            </div>
            
            <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">¡Hola {asistente.nombre_completo}!</h2>
                <p>Estás confirmado/a para el evento. Aquí tienes los detalles y tus códigos de acceso.</p>
                
                <div class="event-details">
                    <p><strong>📅 Fecha:</strong> {fecha_str}</p>
                    <p><strong>📍 Lugar:</strong> {evento.lugar}</p>
                    <p><strong>📝 Descripción:</strong> {evento.descripcion}</p>
                </div>
                
                <p>A continuación encontrarás tus <strong>Códigos QR personales</strong>. Por favor preséntalos al personal encargado para:</p>
                <ul>
                    <li>El ingreso al evento</li>
                    <li>Reclamar tus comidas/refrigerios (si aplica)</li>
                </ul>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <h3 style="text-align: center; color: #b91c1c;">Tus Códigos QR</h3>
        """
        
        # Crear el email
        email = EmailMultiAlternatives(
            subject=subject,
            body=f'Hola {asistente.nombre_completo}, adjuntamos tus códigos QR para el evento {evento.titulo}.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[asistente.correo]
        )
        
        # Agregar cada código QR
        for idx, codigo in enumerate(codigos_qr):
            try:
                # Generar imagen QR con el código único (UUID)
                img_data = generar_imagen_qr(str(codigo.codigo))
                
                # Crear clave única para CID para evitar conflictos
                cid_key = f"qr_{str(codigo.codigo)[:8]}" 
                
                # Crear el MIMEImage
                img = MIMEImage(img_data)
                img.add_header('Content-ID', f'<{cid_key}>')
                img.add_header('Content-Disposition', 'inline', 
                              filename=f'QR_{codigo.tipo_comida}.png')
                email.attach(img)
                
                # Agregar sección HTML para este código
                # Si el tipo es custom, lo mostramos tal cual
                tipo_display = 'Entrada al Evento' if codigo.tipo_comida == 'ENTRADA' else codigo.tipo_comida
                
                html_content += f"""
                    <div class="qr-section">
                        <div class="qr-title">🎫 {tipo_display}</div>
                        <img src="cid:{cid_key}" class="qr-image" alt="QR {tipo_display}">
                        <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">ID: {asistente.identificacion}</p>
                    </div>
                """
            except Exception as e:
                logger.error(f"Error generando QR individual: {e}")
                continue
        
        # Cerrar el HTML
        html_content += """
                <div class="footer">
                    <p>Este es un correo automático del Sistema de Gestión de Eventos.</p>
                    <p>Por favor, no compartas estos códigos con nadie más.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email.attach_alternative(html_content, "text/html")
        
        logger.info(f"Enviando email de evento '{evento.titulo}' a {asistente.correo}")
        email.send()
        logger.info(f"✅ Email enviado exitosamente a {asistente.correo}")
        return True

    except Exception as e:
        error_msg = f"Error al enviar email: {str(e)}"
        logger.exception(f"Error al enviar email al asistente {asistente.correo}: {e}")
        return error_msg


def enviar_notificacion_error(asistente, error_msg):
    """
    Envía un email notificando que hubo un error
    """
    try:
        subject = f'⚠️ Error al generar códigos QR - {asistente.nombre_completo}'
        message = f"""
        Hola {asistente.nombre_completo},
        
        Hubo un problema al generar tus códigos QR:
        {error_msg}
        
        Por favor contacta al administrador del evento.
        
        Saludos,
        Sistema de Gestión
        """
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[asistente.correo]
        )
        email.send()
        return True

    except Exception as e:
        logger.exception(f"Error al enviar notificación de error al asistente {asistente.correo}: {e}")
        return False
