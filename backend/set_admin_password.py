import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_or_update_admin():
    User = get_user_model()
    admin_id = 'admin'
    admin_pass = 'admin123'
    
    try:
        if User.objects.filter(id=admin_id).exists():
            user = User.objects.get(id=admin_id)
            print(f"⚠️  El usuario '{admin_id}' ya existe. Actualizando contraseña...")
            user.set_password(admin_pass)
            user.is_superuser = True
            user.is_staff = True
            user.role = 'Administrador'
            user.save()
            print(f"✅ Contraseña actualizada para '{admin_id}'")
        else:
            print(f"creating new superuser '{admin_id}'...")
            User.objects.create_superuser(
                id=admin_id,
                password=admin_pass,
                full_name='Administrador Sistema'
            )
            print(f"✅ Usuario administrador '{admin_id}' creado exitosamente")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    create_or_update_admin()
