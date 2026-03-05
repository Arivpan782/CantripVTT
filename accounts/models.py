from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    display_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(unique=True)
    activo = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.display_name or self.email