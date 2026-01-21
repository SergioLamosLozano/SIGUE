from django.db import models
import uuid
from django.utils import timezone
from users.models import CustomUser

class Asistente(models.Model):
    """
    Modelo Legacy para gestionar asistentes externos o importados desde Excel.
    Se mantiene para compatibilidad con cargas masivas de personas sin cuenta de usuario.
    """
    identificacion = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="Identificación",
        help_text="Número de identificación del asistente"
    )
    nombre_completo = models.CharField(
        max_length=200, 
        verbose_name="Nombre Completo",
        help_text="Nombre completo del asistente"
    )
    correo = models.EmailField(
        max_length=100,
        verbose_name="Correo Electrónico",
        help_text="Correo electrónico del asistente",
        blank=True,
        null=True
    )
    telefono = models.CharField(
        max_length=20, 
        verbose_name="Teléfono",
        help_text="Número de teléfono del asistente",
        blank=True,
        null=True
    )
    sede = models.CharField(
        max_length=100, 
        verbose_name="Sede",
        help_text="Sede a la que pertenece el asistente",
        blank=True,
        null=True
    )
    
    fecha_registro = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Fecha de Registro"
    )
    
    class Meta:
        verbose_name = "Asistente"
        verbose_name_plural = "Asistentes"
        ordering = ['nombre_completo']
        db_table = 'asistentes'

    def __str__(self):
        return f"{self.nombre_completo} - {self.identificacion}"


class Evento(models.Model):
    """
    Modelo principal que representa un Evento.
    Gestiona la configuración, fechas, lugar y reglas del evento (refrigerios, certificados).
    """
    titulo = models.CharField(max_length=200, verbose_name="Título del Evento")
    descripcion = models.TextField(verbose_name="Descripción", blank=True)
    fecha = models.DateTimeField(verbose_name="Fecha y Hora de Inicio")
    lugar = models.CharField(max_length=200, verbose_name="Lugar")
    
    # Usuario que creó el evento (Staff/Admin)
    creado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='eventos_creados')
    
    # Imagen promocional
    flyer = models.ImageField(upload_to='eventos/', blank=True, null=True, verbose_name='Flyer del Evento')
    
    # Configuración de refrigerios
    requiere_refrigerio = models.BooleanField(default=False, verbose_name='¿Requiere Refrigerio?')
    cantidad_refrigerios = models.PositiveIntegerField(default=0, verbose_name='Cantidad de Refrigerios (Total)')
    
    # ¿Se controla asistencia mediante escaneo de QR en la entrada?
    asistencia_qr = models.BooleanField(default=False, verbose_name='¿Asistencia por QR?')
    
    # Campos nuevos para gestión avanzada
    fecha_fin = models.DateTimeField(null=True, blank=True, verbose_name="Fecha Fin")
    
    # JSON para configurar tipos de refrigerios personalizados (ej: ['Desayuno', 'Almuerzo'])
    detalles_refrigerios = models.JSONField(default=dict, blank=True, verbose_name="Detalles de Refrigerios")
    
    # Plantilla PDF para generar certificados automáticos
    plantilla_certificado = models.FileField(upload_to='plantillas_certificados/', blank=True, null=True, verbose_name='Plantilla de Certificado (PDF)')
    
    # Workflow de Aprobación
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente de Aprobación'),
        ('APROBADO', 'Aprobado'),
        ('RECHAZADO', 'Rechazado'),
    ]
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE', verbose_name='Estado del Evento')

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo

class Inscripcion(models.Model):
    """
    Tabla intermedia que registra la inscripción de un Usuario a un Evento.
    """
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name='inscripciones')
    usuario = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='inscripciones')
    fecha_inscripcion = models.DateTimeField(auto_now_add=True)
    
    # Campo clave para la certificación: marca si la persona realmente fue al evento
    asistio = models.BooleanField(default=False, verbose_name="¿Asistió?")

    class Meta:
        # Evita que un usuario se inscriba dos veces al mismo evento
        unique_together = ('evento', 'usuario')
        verbose_name = "Inscripción"
        verbose_name_plural = "Inscripciones"

    def __str__(self):
        return f"{self.usuario.full_name} - {self.evento.titulo}"


class CodigoQR(models.Model):
    """
    Modelo para los códigos QR generados.
    Un QR puede servir para 'Entrada' o para un tipo específico de comida ('Desayuno', etc).
    Puede estar asociado a un Usuario (sistema nuevo) o a un Asistente (sistema antiguo).
    """
    
    TIPO_COMIDA_CHOICES = [
        ('ENTRADA', 'Entrada al Evento'),
        ('DESAYUNO', 'Desayuno'),
        ('ALMUERZO', 'Almuerzo'),
        ('REFRIGERIO', 'Refrigerio'),
    ]
    
    # EVENTO al que pertenece este QR
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name='codigos_qr',
        verbose_name="Evento",
        null=True, # Puede ser nulo si es un QR huérfano (legacy)
        blank=True
    )
    
    # USUARIO asociado (Sistema principal)
    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='codigos_qr',
        verbose_name="Usuario",
        null=True,
        blank=True
    )

    # ASISTENTE asociado (Sistema legacy/importación excel)
    asistente = models.ForeignKey(
        Asistente,
        on_delete=models.CASCADE,
        related_name='codigos_qr',
        verbose_name="Asistente Legacy",
        null=True,
        blank=True
    )
    
    # Tipo de uso de este QR (Entrada o Comida)
    tipo_comida = models.CharField(
        max_length=100, 
        verbose_name="Tipo de Comida"
    )
    
    # El código único en sí
    codigo = models.UUIDField(
        default=uuid.uuid4, 
        editable=False, 
        unique=True,
        verbose_name="Código QR"
    )
    
    # Estado del QR
    usado = models.BooleanField(
        default=False, 
        verbose_name="Usado"
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Fecha de Creación"
    )
    fecha_uso = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Fecha de Uso"
    )
    
    class Meta:
        verbose_name = "Código QR"
        verbose_name_plural = "Códigos QR"
        ordering = ['fecha_creacion']

    def __str__(self):
        estado = "Usado" if self.usado else "Disponible"
        nombre = "Desconocido"
        if self.usuario:
            nombre = self.usuario.full_name
        elif self.asistente:
            nombre = self.asistente.nombre_completo
            
        return f"{nombre} - {self.tipo_comida} ({estado})"

    def marcar_como_usado(self):
        """
        Lógica para redimir el QR.
        Marca 'usado' = True y registra la fecha.
        Si es un QR de 'ENTRADA', actualiza automáticamente la inscripción a 'asistio=True'.
        """
        if not self.usado:
            self.usado = True
            self.fecha_uso = timezone.now()
            self.save()
            
            # Si es Entrada y está vinculado a un usuario, marcar asistencia en la inscripción
            if self.tipo_comida == 'ENTRADA' and self.evento and self.usuario:
                 try:
                     inscripcion = Inscripcion.objects.get(evento=self.evento, usuario=self.usuario)
                     if not inscripcion.asistio:
                         inscripcion.asistio = True
                         inscripcion.save()
                 except Inscripcion.DoesNotExist:
                     pass # No debería pasar si la integridad de datos es correcta
            
            return True
        return False
