from django.contrib.auth import get_user_model

User = get_user_model()

# Verificar usuarios existentes
users = User.objects.all()
print(f"Total de usuarios: {users.count()}\n")

for user in users:
    print(f"ID: {user.id}")
    print(f"Nombre: {user.full_name}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"Is superuser: {user.is_superuser}")
    print(f"Is staff: {user.is_staff}")
    print(f"Has usable password: {user.has_usable_password()}")
    print("-" * 50)
