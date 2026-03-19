from django import forms
from .models import Campaign, Character


class CampaignForm(forms.ModelForm):
    """
    Model form para crear campañas
    """
    class Meta:
        model = Campaign
        fields = ["name", "players"]
        widgets = {
            "players": forms.SelectMultiple(attrs={"class": "form-control"}),
        }
        labels = {
            "name": "Nombre de la campaña",
            "players": "Jugadores (opcional)",
        }


class CharacterForm(forms.ModelForm):
    """
    Model form para crear personajes
    """
    class Meta:
        model = Character
        fields = [
            "name",
            "campaign",
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
            "strength": forms.NumberInput(attrs={"class": "form-control"}),
            "dexterity": forms.NumberInput(attrs={"class": "form-control"}),
            "constitution": forms.NumberInput(attrs={"class": "form-control"}),
            "intelligence": forms.NumberInput(attrs={"class": "form-control"}),
            "wisdom": forms.NumberInput(attrs={"class": "form-control"}),
            "charisma": forms.NumberInput(attrs={"class": "form-control"}),
        }

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
