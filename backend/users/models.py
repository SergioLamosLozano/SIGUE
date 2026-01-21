from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.translation import gettext_lazy as _

class CustomUserManager(BaseUserManager):
    """
    Gestor de usuarios personalizado para manejar la creación de usuarios y superusuarios.
    Reemplaza el comportamiento por defecto para usar 'id' en lugar de 'username'.
    """
    def create_user(self, id, password=None, **extra_fields):
        """
        Crea y guarda un usuario con el ID y contraseña dados.
        """
        if not id:
            raise ValueError(_('El ID es obligatorio'))
        
        # Crea una instancia del modelo de usuario
        user = self.model(id=id, **extra_fields)
        # Encripta la contraseña
        user.set_password(password)
        # Guarda el usuario en la base de datos
        user.save(using=self._db)
        return user

    def create_superuser(self, id, password=None, **extra_fields):
        """
        Crea y guarda un superusuario con los permisos necesarios.
        """
        # Establece los permisos por defecto para superusuario
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'Administrador')

        # Validaciones de seguridad para asegurar que los permisos sean correctos
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('El superusuario debe tener is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('El superusuario debe tener is_superuser=True.'))

        return self.create_user(id, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuario personalizado que extiende AbstractBaseUser y PermissionsMixin.
    Usa 'id' (Documento de Identidad) como identificador principal en lugar de 'username'.
    """
    
    # Opciones para el rol del usuario en el sistema
    ROLE_CHOICES = (
        ('Estudiante', 'Estudiante'),
        ('Asistente', 'Asistente'),
        ('Docente', 'Docente'),
        ('Administrador', 'Administrador'),
    )

    # Campos del modelo
    id = models.CharField(max_length=20, primary_key=True, unique=True, verbose_name='Identificación')
    full_name = models.CharField(max_length=255, verbose_name='Nombre Completo')
    # Campo de correo electrónico (opcional pero único si se provee)
    email = models.EmailField(max_length=255, unique=True, verbose_name='Correo Electrónico', null=True, blank=True)
    
    # Rol del usuario para control de acceso (RBAC)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Estudiante')
    
    # Dependencia o área a la que pertenece (útil si es funcionario o docente)
    dependency = models.CharField(max_length=100, blank=True, null=True, verbose_name='Dependencia')
    
    # Campos de estado y permisos requeridos por Django
    is_active = models.BooleanField(default=True, verbose_name='Activo') # Para desactivar cuentas sin borrarlas
    is_staff = models.BooleanField(default=False, verbose_name='Es Staff') # Para acceder al admin de Django

    # Asigna el gestor de usuarios personalizado
    objects = CustomUserManager()

    # Define el campo que se usará como identificador único (username)
    USERNAME_FIELD = 'id'
    # Campos adicionales requeridos al crear un superusuario por consola
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        """
        Representación en cadena del usuario (para logs y admin).
        """
        return f"{self.full_name} ({self.id}) - {self.role}"
