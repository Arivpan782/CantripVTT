from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin para User personalizado basado en AbstractUser
    """

    list_display = ("email", "display_name", "activo", "is_staff")
    search_fields = ("email", "display_name")
    list_filter = ("is_staff", "is_active")

    fieldsets = (
        ("Información de acceso", {
            "fields": ("email", "password")
        }),
        ("Datos personales", {
            "fields": ("username", "display_name")
        }),
        ("Permisos", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        ("Fechas importantes", {
            "fields": ("last_login", "date_joined"),
        }),
    )

    add_fieldsets = (
        ("Crear usuario", {
            "classes": ("wide",),
            "fields": ("email", "username", "display_name", "password1", "password2"),
        }),
    )

    readonly_fields = ("last_login", "date_joined")

    ordering = ("email",)
