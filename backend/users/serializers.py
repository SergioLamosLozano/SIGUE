from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import CustomUser

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
    """
    password = serializers.CharField(write_only=True) # La contraseña solo se escribe, no se lee

    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'password', 'role', 'dependency']

    def create(self, validated_data):
        """
        Crea un nuevo usuario usando el CustomUserManager.
        """
        user = CustomUser.objects.create_user(
            id=validated_data['id'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            email=validated_data.get('email', ''),
            role=validated_data['role'],
            dependency=validated_data.get('dependency', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para que el usuario actualice su propio perfil.
    """
    password = serializers.CharField(write_only=True, required=False) # Contraseña opcional en actualización

    class Meta:
        model = CustomUser
        # El ID y el Rol son de solo lectura por seguridad (el usuario no puede auto-promoverse o cambiar su ID)
        fields = ['id', 'full_name', 'email', 'role', 'dependency', 'password']
        read_only_fields = ['id', 'role']

    def update(self, instance, validated_data):
        """
        Actualiza los datos del usuario. Si se provee password, se actualiza de forma segura.
        """
        password = validated_data.pop('password', None)
        
        # Actualiza campos genéricos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Si hay nueva contraseña, usar set_password para encriptar
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
