from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Se registra el modelo CustomUser en el panel de administración
# Usamos una clase decorada o admin.site.register

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    """
    Configuración del panel de administración para el modelo de Usuario.
    Define qué columnas se ven en la lista, filtros y campos de búsqueda.
    """
    # Campos a mostrar en la lista de usuarios
    list_display = ('id', 'full_name', 'email', 'role', 'dependency', 'is_active', 'is_staff')
    
    # Filtros laterales
    list_filter = ('role', 'is_active', 'is_staff', 'dependency')
    
    # Campos por los que se puede buscar
    search_fields = ('id', 'full_name', 'email')
    
    # Ordenamiento por defecto
    ordering = ('full_name',)
    
    # Organización de os campos en el formulario de edición
    fieldsets = (
        (None, {'fields': ('id', 'password')}),
        ('Información Personal', {'fields': ('full_name', 'email', 'dependency')}),
        ('Permisos', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    # Campos de solo lectura al ver un detalle (opcional, en este caso ninguno específico)
    readonly_fields = []

