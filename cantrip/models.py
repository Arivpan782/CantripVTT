from django.db import models
from django.conf import settings

class Campaign(models.Model):
    """
    Modelo Campaign con nombre, fecha automatica, DM y jugadores
    """
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    dungeon_master = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaigns_as_dm"
    )

    players = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="campaigns_as_player",
        blank=True
    )

    board = models.OneToOneField(
        "Board",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="campaign_board"
    )

    def __str__(self):
        return self.name


class Character(models.Model):
    """
    Modelo personaje con nombre, campaign y user asociados y atributos
     """
    name = models.CharField(max_length=100)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="characters"
    )

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="characters",
        null=True,
        blank=True
    )

    image_upload = models.ImageField(
        upload_to="characters/",
        null=True,
        blank=True
    )

    image_static = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    strength = models.IntegerField(default=10)
    dexterity = models.IntegerField(default=10)
    constitution = models.IntegerField(default=10)
    intelligence = models.IntegerField(default=10)
    wisdom = models.IntegerField(default=10)
    charisma = models.IntegerField(default=10)

    def __str__(self):
        return f"{self.name} ({self.user.email})"

    def get_image(self):
        if self.image_upload:
            return self.image_upload.url
        if self.image_static:
            return f"/static/{self.image_static}"
        return None


class Board(models.Model):
    """
    Modelo tablero asociado a una campaña
    """
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="boards"
    )

    name = models.CharField(max_length=100)
    background_image = models.ImageField(
        upload_to="boards/",
        null=True,
        blank=True)

    background_static = models.CharField(
        max_length=255,
        null=True,
        blank=True)

    config = models.JSONField(
        blank=True,
        null=True,
        help_text="Configuración del tablero (zoom, grid, etc.)",
    )

    def __str__(self):
        return f"Tablero de {self.campaign.name}"


class Token(models.Model):
    """
    Modelo token en un tablero
    """
    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="tokens",
    )
    character = models.ForeignKey(
        Character,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="tokens",
        help_text="Personaje asociado a este token (opcional)",
    )
    label = models.CharField(
        max_length=100,
        help_text="Nombre visible del token (si no hay personaje)",
        blank=True,
    )
    image = models.ImageField(
        upload_to="tokens/",
        blank=True,
        null=True,
        help_text="Imagen del token (si no es un personaje)"
    )
    size = models.IntegerField(default=60, help_text="Tamaño base del token en píxeles")
    x = models.FloatField(help_text="Posición X en el tablero")
    y = models.FloatField(help_text="Posición Y en el tablero")
    color = models.CharField(
        max_length=20,
        default="#ff0000",
        help_text="Color del token si no hay imagen",
    )

    def __str__(self):
        if self.character:
            return f"Token de {self.character.name} en {self.board}"
        return f"Token {self.label or 'sin nombre'} en {self.board}"

    def get_image(self):
        if self.character:
            return self.character.get_image()
        if self.image:
            return self.image.url
        return None
