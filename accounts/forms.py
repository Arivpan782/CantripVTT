from django import forms
from accounts.models import User


class RegisterForm(forms.ModelForm):
    """
    Modelo form para registrar usuario
    """
    password1 = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={
            "class": "form-control",
            "placeholder": "Introduce tu contraseña"
        })
    )
    password2 = forms.CharField(
        label="Repetir contraseña",
        widget=forms.PasswordInput(attrs={
            "class": "form-control",
            "placeholder": "Repite tu contraseña"
        })
    )

    class Meta:
        model = User
        fields = ["email", "username", "display_name"]
        widgets = {
            "email": forms.EmailInput(attrs={
                "class": "form-control",
                "placeholder": "Correo electrónico"
            }),
            "username": forms.TextInput(attrs={
                "class": "form-control",
                "placeholder": "Nombre de usuario"
            }),
            "display_name": forms.TextInput(attrs={
                "class": "form-control",
                "placeholder": "Nombre visible"
            }),
        }

    def clean(self):
        """
        Validación de coincidencia de contraseñas
        """
        cleaned = super().clean()
        if cleaned.get("password1") != cleaned.get("password2"):
            raise forms.ValidationError("No coinciden las contraseñas")
        return cleaned

    def save(self, commit=True):
        """
        Funcion para hashear la contraseña
        """
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class LoginForm(forms.Form):
    """
    Modelo form para login de usuario
    """
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            "class": "form-control",
            "placeholder": "Correo electrónico"
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "form-control",
            "placeholder": "Contraseña"
        })
    )