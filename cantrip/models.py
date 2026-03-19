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

    strength = models.IntegerField(default=10)
    dexterity = models.IntegerField(default=10)
    constitution = models.IntegerField(default=10)
    intelligence = models.IntegerField(default=10)
    wisdom = models.IntegerField(default=10)
    charisma = models.IntegerField(default=10)

    def __str__(self):
        return f"{self.name} ({self.user.email})"
