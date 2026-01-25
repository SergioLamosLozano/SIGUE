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

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class VerifyEmailView(APIView):
    """
    Endpoint para verificar el correo electrónico mediante código de 4 dígitos.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        id_usuario = request.data.get('id')
        code = request.data.get('code')

        if not id_usuario or not code:
            return Response({'error': 'ID y Código son obligatorios'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = CustomUser.objects.get(id=id_usuario)
        except CustomUser.DoesNotExist:
             return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.is_active:
             return Response({'message': 'El usuario ya está activo'}, status=status.HTTP_200_OK)

        if user.verification_code == code:
            user.is_active = True
            user.verification_code = None # Limpiar código
            user.save()
            return Response({'message': 'Cuenta verificada exitosamente'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Código incorrecto'}, status=status.HTTP_400_BAD_REQUEST)
