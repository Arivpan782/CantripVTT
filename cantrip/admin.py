from django.contrib import admin
from .models import Campaign, Character


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    """
    Admin para campañas de DnD
    """
    list_display = ("name", "dungeon_master", "created_at")
    search_fields = ("name", "dungeon_master__display_name")
    list_filter = ("created_at",)

    fieldsets = (
        ("Información general", {
            "fields": ("name",)
        }),
        ("Dungeon Master", {
            "fields": ("dungeon_master",)
        }),
        ("Jugadores", {
            "fields": ("players",)
        }),
    )

    readonly_fields = ("created_at",)

    filter_horizontal = ("players",)


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    """
    Admin para personajes de DnD
    """
    list_display = ("name", "user", "campaign")
    search_fields = ("name", "user__display_name")
    list_filter = ("campaign",)

    fieldsets = (
        ("Información del personaje", {
            "fields": ("name", "user", "campaign")
        }),
        ("Estadísticas", {
            "fields": (
                "strength",
                "dexterity",
                "constitution",
                "intelligence",
                "wisdom",
                "charisma",
            )
        }),
    )
