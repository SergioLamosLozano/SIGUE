from django.contrib.auth import get_user_model

User = get_user_model()

# Obtener el usuario admin
try:
    admin = User.objects.get(id='admin')
    # Establecer contraseña
    admin.set_password('admin123')  # Cambia esto por la contraseña que quieras
    admin.save()
    print(f"✅ Contraseña establecida para el usuario: {admin.id}")
    print(f"   ID: admin")
    print(f"   Contraseña: admin123")
    print(f"   Nombre: {admin.full_name}")
except User.DoesNotExist:
    print("❌ El usuario 'admin' no existe")
