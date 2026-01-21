from rest_framework import serializers
from .models import Asistente, CodigoQR, Evento, Inscripcion
from users.serializers import UserSerializer

class AsistenteSerializer(serializers.ModelSerializer):
    """Serializador para el modelo legacy Asistente (crud básico)."""
    class Meta:
        model = Asistente
        fields = '__all__'

class CodigoQRSerializer(serializers.ModelSerializer):
    """
    Serializador para visualizar códigos QR.
    Incluye campos calculados para mostrar nombres legibles en lugar de solo IDs.
    """
    asistente_nombre = serializers.SerializerMethodField()
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)
    
    class Meta:
        model = CodigoQR
        fields = ['id', 'codigo', 'tipo_comida', 'usado', 'fecha_uso', 'asistente_nombre', 'evento_titulo']

    def get_asistente_nombre(self, obj):
        """Devuelve el nombre del dueño del QR, sea Usuario o Asistente legacy."""
        if obj.usuario:
            return obj.usuario.full_name
        if obj.asistente:
            return obj.asistente.nombre_completo
        return "Desconocido"

class EventoSerializer(serializers.ModelSerializer):
    """
    Serializador para Eventos.
    Incluye lógica para saber si el usuario actual ya está inscrito ('ya_inscrito').
    """
    creado_por_nombre = serializers.CharField(source='creado_por.full_name', read_only=True)
    ya_inscrito = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = ['id', 'titulo', 'descripcion', 'fecha', 'fecha_fin', 'lugar', 'creado_por', 'creado_por_nombre', 'fecha_creacion', 'ya_inscrito',
                 'flyer', 'requiere_refrigerio', 'cantidad_refrigerios', 'detalles_refrigerios', 'asistencia_qr']
        read_only_fields = ['creado_por', 'fecha_creacion']

    def get_ya_inscrito(self, obj):
        """Verifica si el usuario que hace la petición está inscrito en este evento."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Inscripcion.objects.filter(evento=obj, usuario=request.user).exists()
        return False

class InscripcionSerializer(serializers.ModelSerializer):
    """
    Serializador para las Inscripciones.
    Anida el serializador de usuario para mostrar detalles completos de quien se inscribió.
    """
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)
    usuario = UserSerializer(read_only=True) # Datos completos del usuario

    class Meta:
        model = Inscripcion
        fields = ['id', 'evento', 'evento_titulo', 'usuario', 'fecha_inscripcion', 'asistio']
