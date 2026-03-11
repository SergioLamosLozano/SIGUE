from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import CustomUser, Asistente, CodigoQR, Evento, Inscripcion, Programa, EstudianteActivoUnivalle, GeneratedCertificate, LugarEvento, EventoStaff
import random
from django.core.mail import send_mail
from django.conf import settings

# ================================================================================
# USER SERIALIZERS
# ================================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializador personalizado para la obtención de tokens JWT.
    Añade información adicional del usuario al payload de la respuesta del login.
    """
    def validate(self, attrs):
        # Ejecuta la validación estándar de JWT (verifica credenciales)
        data = super().validate(attrs)
        
        # Añade datos extra a la respuesta JSON, permitiendo que el frontend
        # tenga acceso inmediato a la información del usuario logueado.
        data['id'] = self.user.id
        data['full_name'] = self.user.full_name
        data['role'] = self.user.role
        data['dependency'] = self.user.dependency if self.user.dependency else ""
        
        return data

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializador para el registro de nuevos usuarios.
    Maneja la creación del usuario y el hasheo de la contraseña.
    Permite sobreescribir usuarios inactivos (is_active=False) si vuelven a registrarse.
    """
    # Redefinimos id y email explícitamente sin UniqueValidator para poder
    # interceptar la validación y permitir actualizar usuarios is_active=False
    id = serializers.CharField(max_length=20)
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True) # La contraseña solo se escribe, no se lee

    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'password', 'role', 'dependency']

    def validate(self, attrs):
        id_user = attrs.get('id')
        email = attrs.get('email')
        
        # Validación personalizada de unicidad: solo bloquea si el usuario está ACTIVO.
        # Si existe pero está inactivo (is_active=False), permitimos que continúe 
        # para actualizarlo en el método create().
        
        # Validar ID
        existing_user_by_id = CustomUser.objects.filter(id=id_user).first()
        if existing_user_by_id and existing_user_by_id.is_active:
            raise serializers.ValidationError({"id": "Este documento de identidad ya está registrado y activo."})
            
        # Validar Email
        existing_user_by_email = CustomUser.objects.filter(email=email).first()
        if existing_user_by_email:
            # Si el email existe, debemos revisar si es activo o pertenece a otro usuario activo
            if existing_user_by_email.is_active:
                 raise serializers.ValidationError({"email": "Este correo electrónico ya está en uso por una cuenta activa."})
            elif existing_user_by_id and existing_user_by_id != existing_user_by_email:
                 # El ID existe (inactivo) y el EMAIL existe en otro usuario (inactivo). 
                 # Un caso extremo pero posible. Bloquearemos para evitar mezcla de identidades.
                 raise serializers.ValidationError({"email": "Este correo electrónico ya está registrado en otra cuenta inactiva. Usa otro correo o tu documento original."})
            
        return attrs

    def create(self, validated_data):
        """
        Crea un nuevo usuario o actualiza uno inactivo.
        """
        id_user = validated_data['id']
        email = validated_data['email']
        
        # Revisamos si ya existe un registro inactivo con este id o email
        user = CustomUser.objects.filter(id=id_user).first()
        if not user:
             user = CustomUser.objects.filter(email=email).first()

        # Generar nuevo código de 4 dígitos
        code = str(random.randint(1000, 9999))

        if user and not user.is_active:
            # REUTILIZAR EL USUARIO INACTIVO
            user.id = id_user
            user.email = email
            user.full_name = validated_data['full_name']
            user.role = validated_data['role']
            user.dependency = validated_data.get('dependency', '')
            user.set_password(validated_data['password'])
            user.verification_code = code
            user.save()
        else:
            # CREAR UNO NUEVO
            user = CustomUser.objects.create_user(
                id=id_user,
                password=validated_data['password'],
                full_name=validated_data['full_name'],
                email=email,
                role=validated_data['role'],
                dependency=validated_data.get('dependency', ''),
                is_active=False, # Inactivo hasta verificar
                verification_code=code
            )

        # Enviar correo
        try:
             print(f"DEBUG CODE for {user.email}: {code}") # Para facilitar pruebas locales
             send_mail(
                'Confirma tu cuenta - SIGUE',
                f'Hola {user.full_name}, Tu nuevo código de verificación es: {code}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Error enviando correo: {e}")

        return user

class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para que el usuario actualice su propio perfil.
    Ahora requiere current_password para cambiar la contraseña.
    """
    password = serializers.CharField(write_only=True, required=False)
    current_password = serializers.CharField(write_only=True, required=False) # Nuevo campo

    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'role', 'dependency', 'password', 'current_password']
        read_only_fields = ['id', 'role']

    def validate(self, attrs):
        # Si se envía una nueva contraseña, es OBLIGATORIO enviar la actual
        if attrs.get('password'):
            current_password = attrs.get('current_password')
            if not current_password:
                raise serializers.ValidationError({"current_password": "Debes ingresar tu contraseña actual para cambiarla."})
            
            # Verificar que la contraseña actual sea correcta
            user = self.instance
            if not user.check_password(current_password):
                raise serializers.ValidationError({"current_password": "La contraseña actual es incorrecta."})
        
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('current_password', None) # Quitar current_password si existe
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

class UserAdminSerializer(serializers.ModelSerializer):
    """
    Serializador para operaciones CRUD administrativas sobre usuarios.
    Permite modificar todos los campos, incluido activar/desactivar usuarios.
    """
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'role', 'dependency', 'password', 'is_active']
    
    def create(self, validated_data):
        # Lógica de creación segura (encriptando password)
        password = validated_data.pop('password', None)
        user = CustomUser.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        # Lógica de actualización segura
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


# ================================================================================
# EVENT MANAGEMENT SERIALIZERS
# ================================================================================

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


# ================================================================================
# PROGRAM & STUDENT SERIALIZERS
# ================================================================================

class ProgramaSerializer(serializers.ModelSerializer):
    """Serializador para Programas Académicos."""
    class Meta:
        model = Programa
        fields = ['id', 'descripcion']


class EstudianteActivoSerializer(serializers.ModelSerializer):
    """Serializador para Estudiantes Activos de Univalle."""
    programa_nombre = serializers.CharField(source='programa.descripcion', read_only=True)
    
    class Meta:
        model = EstudianteActivoUnivalle
        fields = ['codigo_estudiante', 'nombre', 'correo', 'programa', 'programa_nombre']


class LugarEventoSerializer(serializers.ModelSerializer):
    """Serializador para Lugares de Evento."""
    class Meta:
        model = LugarEvento
        fields = ['id', 'descripcion']

class EventoSerializer(serializers.ModelSerializer):
    """
    Serializador para Eventos.
    Incluye lógica para saber si el usuario actual ya está inscrito ('ya_inscrito').
    El flyer se almacena como BLOB en la BD y se expone como base64 en la API.
    """
    creado_por_nombre = serializers.CharField(source='creado_por.full_name', read_only=True)
    ya_inscrito = serializers.SerializerMethodField()
    lugar_nombre = serializers.CharField(source='lugar.descripcion', read_only=True)
    
    # Campos para programas dirigidos
    programas_dirigidos = ProgramaSerializer(many=True, read_only=True)
    programas_dirigidos_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Programa.objects.all(),
        write_only=True,
        source='programas_dirigidos',
        required=False
    )
    
    # Campo para recibir archivo de flyer en el request
    flyer = serializers.FileField(write_only=True, required=False, allow_null=True)
    
    # Campo para exponer el flyer como base64 en el response  
    flyer_base64 = serializers.SerializerMethodField(read_only=True)
    has_flyer = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Evento
        fields = ['id', 'titulo', 'descripcion', 'fecha', 'fecha_fin', 'lugar', 'lugar_nombre', 'creado_por', 'creado_por_nombre', 'fecha_creacion', 'ya_inscrito',
                 'flyer', 'flyer_base64', 'has_flyer', 'flyer_filename', 'flyer_content_type',
                 'requiere_entregable', 'cantidad_entregables', 'detalles_entregables', 'asistencia_qr', 'estado',
                 'enviar_difusion', 'programas_dirigidos', 'programas_dirigidos_ids']
        read_only_fields = ['creado_por', 'fecha_creacion', 'estado', 'flyer_filename', 'flyer_content_type']

    def get_ya_inscrito(self, obj):
        """Verifica si el usuario que hace la petición está inscrito en este evento."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Inscripcion.objects.filter(evento=obj, usuario=request.user).exists()
        return False
    
    def get_flyer_base64(self, obj):
        """Devuelve el flyer como cadena base64 para mostrar en frontend."""
        if obj.flyer_data:
            import base64
            return base64.b64encode(obj.flyer_data).decode('utf-8')
        return None
    
    def get_has_flyer(self, obj):
        """Indica si el evento tiene un flyer adjunto."""
        return obj.flyer_data is not None and len(obj.flyer_data) > 0
    
    def create(self, validated_data):
        """Procesa el archivo flyer y lo guarda como BLOB."""
        flyer_file = validated_data.pop('flyer', None)
        instance = super().create(validated_data)
        
        if flyer_file:
            instance.flyer_data = flyer_file.read()
            instance.flyer_filename = flyer_file.name
            instance.flyer_content_type = flyer_file.content_type
            instance.save()
        
        return instance
    
    def update(self, instance, validated_data):
        """Actualiza el evento, incluyendo el flyer si se proporciona."""
        flyer_file = validated_data.pop('flyer', None)
        instance = super().update(instance, validated_data)
        
        if flyer_file:
            instance.flyer_data = flyer_file.read()
            instance.flyer_filename = flyer_file.name
            instance.flyer_content_type = flyer_file.content_type
            instance.save()
        
        return instance

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


class GeneratedCertificateSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.CharField(source='usuario.full_name', read_only=True)
    estudiante_documento = serializers.CharField(source='usuario.id', read_only=True)
    estudiante_email = serializers.CharField(source='usuario.email', read_only=True)
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)
    
    class Meta:
        model = GeneratedCertificate
        fields = ['id', 'estudiante_nombre', 'estudiante_documento', 'estudiante_email', 'evento_titulo', 'filename', 'created_at']

class EventoStaffSerializer(serializers.ModelSerializer):
    """
    Serializador para asignaciones de Staff a eventos.
    Expone datos completos del usuario asignado y quién lo asignó.
    """
    usuario_nombre = serializers.CharField(source='usuario.full_name', read_only=True)
    usuario_id = serializers.CharField(source='usuario.id', read_only=True)
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_role = serializers.CharField(source='usuario.role', read_only=True)
    asignado_por_nombre = serializers.CharField(source='asignado_por.full_name', read_only=True)

    class Meta:
        model = EventoStaff
        fields = ['id', 'evento', 'usuario', 'usuario_id', 'usuario_nombre', 'usuario_email', 'usuario_role',
                  'asignado_por', 'asignado_por_nombre', 'fecha_asignacion']
        read_only_fields = ['fecha_asignacion', 'asignado_por']


class UserSearchSerializer(serializers.ModelSerializer):
    """
    Serializador ligero para búsqueda de usuarios (Estudiante/Docente).
    """
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'role', 'dependency']
