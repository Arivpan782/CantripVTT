from django.contrib import admin
from accounts.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """
    Modelo admin para User personalizado
    """
    list_display = ("email", "display_name", "activo", "is_staff")
    search_fields = ("email", "display_name")
    list_filter = ("is_staff", "is_active")


    fieldsets = (
        ("Información de acceso", {
            "fields": ("email",
                       "password")
        }),
        ("Datos personales", {
            "fields": ("username",
                       "display_name")
        }),
        ("Permisos", {
            "fields": ("is_active",
                       "is_staff",
                       "is_superuser",
                       "groups",
                       "user_permissions"),
        }),
        ("Fechas importantes", {
            "fields": ("last_login",
                       "date_joined"),
        }),
    )

    readonly_fields = ("last_login", "date_joined")

