from django.contrib import admin
from .models import Campaign, Character, Board, Token


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



@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("id", "campaign", "name")
    search_fields = ("name", "campaign__name")
    list_filter = ("campaign",)


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ("id", "board", "label", "character", "x", "y")
    search_fields = ("label", "character__name", "board__name")
    list_filter = ("board",)

