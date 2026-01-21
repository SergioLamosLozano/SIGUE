from django.contrib import admin
from .models import Asistente, CodigoQR, Evento, Inscripcion

# -----------------------------------------------------------------------------
# CONFIGURACIÓN DEL PANEL DE ADMINISTRACIÓN
# -----------------------------------------------------------------------------

@admin.register(Asistente)
class AsistenteAdmin(admin.ModelAdmin):
    """Admin para gestionar asistentes legacy"""
    list_display = ['identificacion', 'nombre_completo', 'correo', 'telefono', 'sede', 'fecha_registro']
    list_filter = ['fecha_registro', 'sede']
    search_fields = ['identificacion', 'nombre_completo', 'correo', 'telefono']
    ordering = ['nombre_completo']


@admin.register(CodigoQR)
class CodigoQRAdmin(admin.ModelAdmin):
    """Admin para visualizar y gestionar códigos QR"""
    list_display = ['asistente', 'usuario', 'tipo_comida', 'codigo', 'usado', 'fecha_creacion', 'fecha_uso']
    list_filter = ['tipo_comida', 'usado', 'fecha_creacion']
    search_fields = ['asistente__nombre_completo', 'asistente__identificacion', 'usuario__full_name', 'usuario__id', 'codigo']
    readonly_fields = ['codigo', 'fecha_creacion', 'fecha_uso']
    ordering = ['-fecha_creacion']
    
    def has_add_permission(self, request):
        # Los códigos QR se crean automáticamente mediante lógica de negocio, no manualmente aquí.
        return False

@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    """Admin para gestionar Eventos"""
    list_display = ['titulo', 'fecha', 'lugar', 'creado_por', 'requiere_refrigerio']
    list_filter = ['fecha', 'requiere_refrigerio']
    search_fields = ['titulo', 'descripcion']

@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    """Admin para ver inscripciones"""
    list_display = ['evento', 'usuario', 'fecha_inscripcion', 'asistio']
    list_filter = ['asistio', 'fecha_inscripcion', 'evento']
    search_fields = ['usuario__full_name', 'evento__titulo']
