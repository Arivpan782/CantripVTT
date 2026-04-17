from django import forms
from .models import Campaign, Character
from django.conf import settings
import os

class CampaignForm(forms.ModelForm):
    """
    Formulario para crear campañas
    """
    class Meta:
        model = Campaign
        fields = ["name"]
        labels = {
            "name": "Nombre de la campaña",
        }


class AddPlayerForm(forms.Form):
    """
    Formulario para añadir jugadores a campaña
    """
    email = forms.EmailField(label="Email del jugador")


class CharacterForm(forms.ModelForm):
    """
    Formulario para crear personajes
    """
    image_static = forms.ChoiceField(required=False)

    class Meta:
        model = Character
        fields = [
            "name",
            "campaign",
            "image_upload",
            "image_static",
            "strength",
            "dexterity",
            "constitution",
            "intelligence",
            "wisdom",
            "charisma",
        ]
        labels = {
            "name": "Nombre del personaje",
            "campaign": "Campaña (opcional)",
            "image_upload": "Imagen subida",
            "image_static": "Imagen estática",
            "strength": "Fuerza",
            "dexterity": "Destreza",
            "constitution": "Constitución",
            "intelligence": "Inteligencia",
            "wisdom": "Sabiduría",
            "charisma": "Carisma",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "campaign": forms.Select(attrs={"class": "form-control"}),
            "image_upload": forms.ClearableFileInput(attrs={"class": "form-control"}),
            "image_static": forms.Select(attrs={"class": "form-control"}),
            "strength": forms.NumberInput(attrs={"class": "form-control"}),
            "dexterity": forms.NumberInput(attrs={"class": "form-control"}),
            "constitution": forms.NumberInput(attrs={"class": "form-control"}),
            "intelligence": forms.NumberInput(attrs={"class": "form-control"}),
            "wisdom": forms.NumberInput(attrs={"class": "form-control"}),
            "charisma": forms.NumberInput(attrs={"class": "form-control"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        tokens_path = os.path.join(settings.BASE_DIR, "static/assets/tokens")
        files = sorted(f for f in os.listdir(tokens_path) if f.endswith(".png"))

        choices = [("", "Ninguna")] + [
            (f"assets/tokens/{f}", f) for f in files
        ]

        self.fields["image_static"].choices = choices



class DeleteConfirmForm(forms.Form):
    """
    Formulario para confirmar borrado escribiendo DELETE
    """
    confirm_text = forms.CharField(label="Escribe DELETE para confirmar")

    def clean_confirm_text(self):
        text = self.cleaned_data["confirm_text"]
        if text != "DELETE":
            raise forms.ValidationError("Debes escribir DELETE exactamente.")
        return text
