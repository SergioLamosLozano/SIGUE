from rest_framework import permissions
from .models import EventoStaff, Evento

class IsAdminOrCoordinatorOrEventStaff(permissions.BasePermission):
    """
    Permite acceso si el usuario es Administrador, o Coordinador (creador) 
    o Staff asignado al evento en particular.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'Administrador':
            return True
        if hasattr(obj, 'creado_por') and obj.creado_por == request.user:
            return True
        if isinstance(obj, Evento):
            return EventoStaff.objects.filter(evento=obj, usuario=request.user).exists()
        return False
