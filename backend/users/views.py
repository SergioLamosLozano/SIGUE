from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework import permissions
from rest_framework import viewsets
from .serializers import RegisterSerializer, UserSerializer, UserAdminSerializer
from .models import CustomUser

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener el par de tokens (Access + Refresh).
    Usa CustomTokenObtainPairSerializer para devolver info extra del usuario.
    """
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    """
    Vista para registrar nuevos usuarios.
    Permite acceso a cualquier persona (AllowAny) para que puedan registrarse.
    """
    queryset = CustomUser.objects.all()
    # Permitir a cualquier usuario (incluso no autenticado) acceder a este endpoint
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserUpdateView(generics.RetrieveUpdateAPIView):
    """
    Vista para que el usuario autenticado lea y actualice su propio perfil.
    Solo permite acceso a usuarios autenticados.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Retorna el objeto usuario corresondiente al usuario que hace la petición (request.user).
        Esto asegura que un usuario solo pueda editar su propio perfil.
        """
        return self.request.user

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión completa (CRUD) de usuarios por parte de los administradores.
    Solo accesible por usuarios autenticados que también son Administradores (IsAdminUser).
    """
    # Consulta optimizada ordenando por nombre
    queryset = CustomUser.objects.all().order_by('full_name')
    serializer_class = UserAdminSerializer
    # Requiere autenticación y rol de administrador
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
