from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Asistente, CodigoQR, Evento, Inscripcion
from .serializers import AsistenteSerializer, CodigoQRSerializer, EventoSerializer, InscripcionSerializer
import pandas as pd
from django.utils import timezone
from .email_utils import enviar_codigos_qr_email
import uuid
from django.core.files.base import ContentFile
import qrcode
from io import BytesIO
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.conf import settings

# -----------------------------------------------------------------------------
# EVENTO VIEWSET
# -----------------------------------------------------------------------------

class EventoViewSet(viewsets.ModelViewSet):
    """
    Controlador principal para la gestión de Eventos.
    Permite CRUD de eventos y acciones extra como inscripciones, generación de QRs y reportes.
    """
    queryset = Evento.objects.all().order_by('-fecha')
    serializer_class = EventoSerializer
    # Requiere autenticación para cualquier operación
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtra los eventos según el rol del usuario:
        - Administrador: Ve todos los eventos.
        - Docente: Ve eventos aprobados + sus propios eventos (pendientes o aprobados).
        - Estudiante/Otros: Solo ven eventos aprobados.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Evento.objects.none()

        if user.role == 'Administrador':
            return Evento.objects.all().order_by('-fecha')
        
        # Base query: Eventos aprobados
        queryset = Evento.objects.filter(estado='APROBADO')

        if user.role == 'Docente':
            # Docentes también ven sus propios eventos
            mis_eventos = Evento.objects.filter(creado_por=user)
            queryset = queryset | mis_eventos
        
        return queryset.distinct().order_by('-fecha')
    
    # Imports locales para exportación CSV
    import csv
    from django.http import HttpResponse

    def perform_create(self, serializer):
        """
        Asigna el creador.
        Si es Admin, el evento se aprueba automáticamente.
        Si es Docente, queda en PENDIENTE.
        """
        user = self.request.user
        estado = 'APROBADO' if user.role == 'Administrador' else 'PENDIENTE'
        serializer.save(creado_por=user, estado=estado)

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Permite a un administrador aprobar un evento pendiente."""
        if request.user.role != 'Administrador':
            return Response({'error': 'No tienes permisos para realizar esta acción'}, status=status.HTTP_403_FORBIDDEN)
        
        evento = self.get_object()
        evento.estado = 'APROBADO'
        evento.save()
        return Response({'message': 'Evento aprobado exitosamente'})

    @action(detail=True, methods=['post'])
    def unirse(self, request, pk=None):
        """
        Permite a un usuario inscribirse a un evento específico.
        Verifica que no esté ya inscrito.
        """
        evento = self.get_object()
        usuario = request.user
        
        if Inscripcion.objects.filter(evento=evento, usuario=usuario).exists():
            return Response({'message': 'Ya estás inscrito en este evento.'}, status=status.HTTP_400_BAD_REQUEST)
        
        Inscripcion.objects.create(evento=evento, usuario=usuario)
        return Response({'message': 'Inscripción exitosa.'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def mis_eventos(self, request):
        """Devuelve la lista de eventos en los que el usuario actual está inscrito."""
        inscripciones = Inscripcion.objects.filter(usuario=request.user)
        eventos = [ins.evento for ins in inscripciones]
        serializer = EventoSerializer(eventos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def inscritos(self, request, pk=None):
        """Devuelve la lista de personas inscritas a un evento específico."""
        evento = self.get_object()
        inscripciones = evento.inscripciones.all().select_related('usuario')
        serializer = InscripcionSerializer(inscripciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """
        Calcula estadísticas del evento:
        - Total inscritos
        - Asistencia real (basada en QRs de entrada usados)
        - Refrigerios entregados
        - Desglose por dependencia
        """
        evento = self.get_object()
        total_inscritos = evento.inscripciones.count()
        
        # Estadísticas de QRs
        qrs = CodigoQR.objects.filter(evento=evento)
        qrs_entregados = qrs.count()
        qrs_usados = qrs.filter(usado=True).count()
        
        # Asistencia Real = Códigos de tipo 'ENTRADA' que han sido usados
        asistentes_reales = qrs.filter(tipo_comida='ENTRADA', usado=True).count()
        
        # Estadísticas de Refrigerios
        refrigerios_entregados = qrs.filter(tipo_comida='REFRIGERIO', usado=True).count()
        
        # Desglose por Dependencia (solo de los que asistieron)
        asistencia_qrs = qrs.filter(tipo_comida='ENTRADA', usado=True).select_related('usuario', 'asistente')
        
        dependencias_stats = {}
        
        for qr in asistencia_qrs:
            dep = "Sin Definir"
            if qr.usuario and qr.usuario.dependency:
                dep = qr.usuario.dependency
            elif qr.asistente and qr.asistente.sede:
                dep = qr.asistente.sede
            
            # Normalizar texto (Title Case)
            dep = dep.strip().title() if dep else "Sin Definir"
            
            dependencias_stats[dep] = dependencias_stats.get(dep, 0) + 1

        return Response({
            'total_inscritos': total_inscritos,
            'asistentes_reales': asistentes_reales,
            'porcentaje_asistencia': (asistentes_reales / total_inscritos * 100) if total_inscritos > 0 else 0,
            'refrigerios_entregados': refrigerios_entregados,
            'total_refrigerios_disponibles': evento.cantidad_refrigerios,
            'asistencia_por_dependencia': dependencias_stats
        })

    @action(detail=True, methods=['post'])
    def generar_qrs_masivo(self, request, pk=None):
        """
        Genera códigos QR para todos los inscritos en el evento.
        Crea QRs de Entrada y de los tipos de comida configurados.
        """
        evento = self.get_object()
        inscripciones = evento.inscripciones.all()
        generated_count = 0
        
        types = ['ENTRADA']
        
        # Verificar configuración de refrigerios
        detalles = evento.detalles_refrigerios or {}
        items = detalles.get('items', [])
        
        # Si hay items personalizados, usarlos
        if isinstance(items, list) and len(items) > 0:
            types.extend([item for item in items if isinstance(item, str) and item.strip()])
        # Si no, usar lógica simple por defecto
        elif evento.requiere_refrigerio:
            types.append('REFRIGERIO')
            
        for inscripcion in inscripciones:
            user = inscripcion.usuario
            for tipo in types:
                _, created = CodigoQR.objects.get_or_create(
                    evento=evento,
                    usuario=user,
                    tipo_comida=tipo,
                    defaults={'asistente': None}
                )
                if created:
                    generated_count += 1
                    
        return Response({'message': f'Se generaron {generated_count} códigos QR nuevos.'})

    @action(detail=True, methods=['post'])
    def enviar_emails_evento(self, request, pk=None):
        """
        Envía los códigos QR por correo electrónico a todos los inscritos que tengan email.
        """
        evento = self.get_object()
        
        count = 0
        errors = 0
        error_details = []
        
        try:
             inscripciones = evento.inscripciones.all()
             for inscripcion in inscripciones:
                 user = inscripcion.usuario
                 
                 if not user.email:
                     continue

                 # Obtener QRs para este evento y usuario
                 qrs = CodigoQR.objects.filter(evento=evento, usuario=user)
                 
                 if qrs.exists():
                     # Clase adaptadora para que la función de envío de email funcione con el modelo User
                     # (Originalmente estaba hecha solo para Asistente legacy)
                     class AsistenteAdapter:
                         def __init__(self, u):
                             self.nombre_completo = u.full_name
                             self.correo = u.email
                             self.identificacion = u.id
                     
                     adapter = AsistenteAdapter(user)
                     
                     result = enviar_codigos_qr_email(adapter, evento, qrs)
                     if result is True:
                         count += 1
                     else:
                         errors += 1
                         error_details.append(f"{user.email}: {result}")
             
             return Response({
                 'message': f'Proceso finalizado. Emails enviados: {count}. Errores: {errors}',
                 'sent_count': count,
                 'error_count': errors,
                 'error_details': error_details
             })
        except Exception as e:
            print(f"CRITICAL ERROR in enviar_emails_evento: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def generar_certificados_masivo(self, request, pk=None):
        """
        Genera y envía certificados PDF a los asistentes que marcaron asistencia (asistio=True).
        Requiere que el evento tenga una plantilla PDF cargada.
        """
        evento = self.get_object()
        
        # 1. Actualizar plantilla si se envía una nueva en la petición
        plantilla = request.FILES.get('plantilla')
        if plantilla:
            evento.plantilla_certificado = plantilla
            evento.save()
            
        if not evento.plantilla_certificado:
            return Response({'error': 'No hay plantilla de certificado configurada para este evento.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Filtrar solo los que asistieron
        inscripciones = evento.inscripciones.filter(asistio=True)
        
        generated_count = 0
        email_sent_count = 0
        errors = []
        
        from .utils import generar_certificado_pdf
        from django.core.mail import EmailMessage
        
        ruta_plantilla = evento.plantilla_certificado.path

        for inscripcion in inscripciones:
            user = inscripcion.usuario
            if not user.email:
                continue
                
            try:
                # Generar PDF en memoria usando la utilidad
                pdf_stream = generar_certificado_pdf(
                    user.full_name, 
                    user.id,
                    ruta_plantilla
                )
                
                if pdf_stream:
                    generated_count += 1
                    
                    # Preparar Email con adjunto
                    subject = f"Certificado de Asistencia - {evento.titulo}"
                    body = f"Hola {user.full_name},\n\nAdjunto encontrarás tu certificado de asistencia al evento '{evento.titulo}'.\n\n¡Gracias por participar!"
                    
                    from django.conf import settings
                    email = EmailMessage(
                        subject,
                        body,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                    )
                    
                    # Adjuntar PDF
                    filename = f"Certificado_{user.full_name.replace(' ', '_')}.pdf"
                    email.attach(filename, pdf_stream.read(), 'application/pdf')
                    
                    # Enviar
                    email.send()
                    email_sent_count += 1
                    
            except Exception as e:
                errors.append(f"{user.email}: {str(e)}")
                
        return Response({
            'message': f'Proceso finalizado. Certificados generados: {generated_count}. Emails enviados: {email_sent_count}.',
            'errors': errors
        })

    @action(detail=True, methods=['post'])
    def ver_previsualizacion_certificado(self, request, pk=None):
        """
        Genera una vista previa del certificado con datos dummy para verificar alineación.
        """
        evento = self.get_object()
        from django.http import HttpResponse
        from .utils import generar_certificado_pdf
        
        # Guardar plantilla temporal si se envía
        plantilla_file = request.FILES.get('plantilla')
        if plantilla_file:
            evento.plantilla_certificado = plantilla_file
            evento.save()
            
        if not evento.plantilla_certificado:
            return Response({'error': 'No hay plantilla configurada.'}, status=status.HTTP_400_BAD_REQUEST)
        
        ruta_plantilla = evento.plantilla_certificado.path

        # Datos de prueba
        nombre_preview = "JUAN PEREZ (VISTA PREVIA)"
        doc_preview = "123456789"
        
        try:
            pdf_stream = generar_certificado_pdf(nombre_preview, doc_preview, ruta_plantilla)
            
            if pdf_stream:
                response = HttpResponse(pdf_stream.read(), content_type='application/pdf')
                response['Content-Disposition'] = 'inline; filename="certificado_preview.pdf"'
                return response
            else:
                return Response({'error': 'Error al generar PDF (stream vacío)'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def exportar_asistentes_excel(self, request, pk=None):
        """
        Genera un archivo CSV descargable con la lista de asistentes confirmados.
        """
        import csv
        from django.http import HttpResponse

        evento = self.get_object()
        
        # Filtrar inscripciones con asistencia confirmada
        inscripciones = evento.inscripciones.filter(asistio=True).select_related('usuario')

        response = HttpResponse(
            content_type='text/csv',
            headers={'Content-Disposition': f'attachment; filename="asistentes_{evento.id}.csv"'},
        )
        
        # BOM para que Excel reconozca UTF-8 automáticamente
        response.write(u'\ufeff'.encode('utf8'))

        writer = csv.writer(response)
        writer.writerow(['Identificación', 'Nombre Completo', 'Email', 'Rol', 'Dependencia/Sede', 'Fecha Inscripción'])

        for ins in inscripciones:
            user = ins.usuario
            writer.writerow([
                user.id,
                user.full_name,
                user.email,
                user.role,
                user.dependency or 'N/A',
                ins.fecha_inscripcion.strftime("%Y-%m-%d %H:%M")
            ])

        return Response(response)

# -----------------------------------------------------------------------------
# ASISTENTE LEGACY VIEWSET
# -----------------------------------------------------------------------------

class AsistenteViewSet(viewsets.ModelViewSet):
    """
    CRUD para asistentes externos (Legacy).
    Permite importar masivamente desde Excel.
    """
    queryset = Asistente.objects.all()
    serializer_class = AsistenteSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def importar_excel(self, request):
        """
        Importa asistentes desde un archivo Excel (.xlsx).
        Crea automáticamente un QR de Entrada para los nuevos asistentes.
        """
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({'error': 'No se proporcionó ningún archivo'}, status=status.HTTP_400_BAD_REQUEST)

            df = pd.read_excel(file)
            
            # Verificar columnas requeridas en el Excel
            required_columns = ['Nombre completo', 'Identificacion']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return Response(
                    {'error': f'Faltan columnas requeridas: {", ".join(missing_columns)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            created_count = 0
            updated_count = 0
            errors = []

            for index, row in df.iterrows():
                try:
                    data = {
                        'identificacion': str(row['Identificacion']),
                        'nombre_completo': row['Nombre completo'],
                        'correo': row.get('Correo', ''),
                        'telefono': str(row.get('telefono', '')),
                        'sede': row.get('Sede', '')
                    }
                    
                    # Limpiar datos nulos (NaN)
                    data = {k: v if pd.notna(v) else '' for k, v in data.items()}

                    asistente, created = Asistente.objects.update_or_create(
                        identificacion=data['identificacion'],
                        defaults=data
                    )

                    if created:
                        created_count += 1
                        # Crear código QR de entrada
                        CodigoQR.objects.create(
                            asistente=asistente,
                            tipo_comida='ENTRADA'
                        )
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f"Fila {index + 2}: {str(e)}")

            return Response({
                'message': 'Proceso completado',
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def generar_qr(self, request, pk=None):
        """Genera un QR manual para un asistente."""
        asistente = self.get_object()
        tipo_comida = request.data.get('tipo_comida')
        
        if not tipo_comida:
            return Response({'error': 'Tipo de comida requerido'}, status=status.HTTP_400_BAD_REQUEST)

        qr_obj, created = CodigoQR.objects.get_or_create(
            asistente=asistente,
            tipo_comida=tipo_comida
        )

        return Response(CodigoQRSerializer(qr_obj).data)
    
    @action(detail=True, methods=['post'])
    def enviar_qr_correo(self, request, pk=None):
        """Reenvía los códigos QR por correo a un asistente específico."""
        asistente = self.get_object()
        
        qrs = CodigoQR.objects.filter(asistente=asistente)
        
        if not qrs.exists():
            return Response({'error': 'El asistente no tiene códigos QR generados'}, status=status.HTTP_404_NOT_FOUND)
            
        if not asistente.correo:
            return Response({'error': 'El asistente no tiene correo registrado'}, status=status.HTTP_400_BAD_REQUEST)
            
        evento = qrs.first().evento
        if not evento:
             return Response({'error': 'No se encontró un evento asociado a estos códigos QR'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enviar_codigos_qr_email(asistente, evento, qrs)
            return Response({'message': f'Códigos QR enviados a {asistente.correo}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# CODIGO QR VIEWSET
# -----------------------------------------------------------------------------

class CodigoQRViewSet(viewsets.ModelViewSet):
    """
    CRUD para códigos QR y endpoint principal de ESCANEO.
    """
    queryset = CodigoQR.objects.all()
    serializer_class = CodigoQRSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def escanear(self, request):
        """
        Endpoint crítico para validar códigos QR.
        Recibe un 'codigo' que puede ser un UUID o una Cédula (entrada manual).
        """
        codigo = request.data.get('codigo')
        if not codigo:
            return Response({'error': 'Código requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qr_obj = None
            # 1. Intentar buscar por UUID (QR estándar del sistema)
            try:
                qr_obj = CodigoQR.objects.select_related('usuario', 'asistente', 'evento').get(codigo=codigo)
            except (ValidationError, ValueError, CodigoQR.DoesNotExist):
                # 2. Si falla (ej. entrada manual de cédula), buscar por ID de Usuario o Asistente
                # Priorizamos encontrar un QR disponible (no usado) de tipo ENTRADA
                qr_obj = CodigoQR.objects.filter(
                    (Q(usuario__id=codigo) | Q(asistente__identificacion=codigo))
                ).select_related('usuario', 'asistente', 'evento').order_by('usado', 'fecha_creacion').first()

            if not qr_obj:
                 return Response({'error': 'Código o Identificación no válida'}, status=status.HTTP_404_NOT_FOUND)
            
            # Construir información de respuesta normalizada
            attendant_info = {}
            if qr_obj.usuario:
                attendant_info = {
                    'nombre_completo': qr_obj.usuario.full_name,
                    'identificacion': qr_obj.usuario.id,
                    'sede': qr_obj.usuario.dependency or 'N/A',
                    'email': qr_obj.usuario.email
                }
            elif qr_obj.asistente:
                attendant_info = {
                    'nombre_completo': qr_obj.asistente.nombre_completo,
                    'identificacion': qr_obj.asistente.identificacion,
                    'sede': qr_obj.asistente.sede or 'N/A',
                    'email': qr_obj.asistente.correo
                }
            else:
                attendant_info = {
                    'nombre_completo': 'Desconocido',
                    'identificacion': 'N/A',
                    'sede': 'N/A'
                }

            # Validar si ya fue usado
            if qr_obj.usado:
                return Response({
                    'status': 'error',
                    'message': f'Este código ya fue usado el {qr_obj.fecha_uso.strftime("%d/%m/%Y %H:%M") if qr_obj.fecha_uso else "previamente"}',
                    'asistente': attendant_info,
                    'tipo': qr_obj.tipo_comida,
                    'evento': qr_obj.evento.titulo if qr_obj.evento else None
                }, status=status.HTTP_400_BAD_REQUEST)

            # MARCAR COMO USADO (Redimir)
            qr_obj.marcar_como_usado()
            
            return Response({
                'status': 'success',
                'message': 'Código validado exitosamente',
                'asistente': attendant_info,
                'tipo': qr_obj.tipo_comida,
                'fecha_uso': qr_obj.fecha_uso,
                'evento': qr_obj.evento.titulo if qr_obj.evento else None
            })

        except Exception as e:
            print(f"ERROR CRÍTICO en escanear: {str(e)}")
            return Response({'error': f'Error interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
