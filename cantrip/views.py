from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, DetailView, UpdateView, DeleteView, TemplateView
from accounts.models import User
from .models import Campaign, Character, Board, Token
from .forms import CampaignForm, CharacterForm, DeleteConfirmForm, AddPlayerForm
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.views import View
import json
import os
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.views.decorators.http import require_POST
from django.core.files.base import ContentFile
import base64
from django.core.paginator import Paginator

import os
from django.conf import settings
from django.views.generic import TemplateView

def chunk_list(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]

class HomeView(TemplateView):
    """
    Vista home
    """
    template_name = "cantrip/home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        maps_path = os.path.join(settings.BASE_DIR, "static", "assets", "maps")
        tokens_path = os.path.join(settings.BASE_DIR, "static", "assets", "tokens")

        maps = []
        tokens = []

        if os.path.exists(maps_path):
            maps = [f"assets/maps/{f}" for f in os.listdir(maps_path) if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        if os.path.exists(tokens_path):
            tokens = [f"assets/tokens/{f}" for f in os.listdir(tokens_path) if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        context["maps_chunks"] = chunk_list(maps, 4)
        context["tokens_chunks"] = chunk_list(tokens, 4)

        return context



class CampaignListView(LoginRequiredMixin, ListView):
    """
    Vista CBV para poder ver una lista de las campañas asociadas al user
    """
    model = Campaign
    template_name = "cantrip/campaign_list.html"
    context_object_name = "campaigns"

    def get_queryset(self):
        user = self.request.user

        campaigns_as_dm = Campaign.objects.filter(dungeon_master=user)

        campaigns_as_player = Campaign.objects.filter(players=user)

        return campaigns_as_dm.union(campaigns_as_player)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["user"] = self.request.user
        return context



class CampaignCreateView(LoginRequiredMixin, CreateView):
    """
    Vista CBV para crear campañas, el usuario que la crea se asigna automaticamente como DM
    """
    model = Campaign
    form_class = CampaignForm
    template_name = "cantrip/campaign_create.html"
    success_url = reverse_lazy("campaign_list")

    def form_valid(self, form):
        form.instance.dungeon_master = self.request.user
        return super().form_valid(form)




class CampaignDetailView(LoginRequiredMixin, DetailView):
    """
    Vista CBV para ver detalles de una campaña
    """
    model = Campaign
    template_name = "cantrip/campaign_detail.html"
    context_object_name = "campaign"

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        campaign = self.get_object()
        user = request.user

        if campaign.dungeon_master != user and user not in campaign.players.all():
            raise PermissionDenied("No tienes permiso para ver esta campaña.")

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        campaign = self.get_object()
        user = self.request.user

        if campaign.dungeon_master == user:
            context["role"] = "DM"
        else:
            context["role"] = "Jugador"

        context["characters"] = campaign.characters.select_related("user")
        context["add_player_form"] = AddPlayerForm()

        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        campaign = self.object
        form = AddPlayerForm(request.POST)

        if request.user != campaign.dungeon_master:
            raise PermissionDenied("Solo el DM puede añadir jugadores.")

        if form.is_valid():
            email = form.cleaned_data["email"]
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return self.render_to_response(self.get_context_data(error="No existe un usuario con ese email."))

            if user == campaign.dungeon_master:
                return self.render_to_response(self.get_context_data(error="El DM ya pertenece a la campaña."))

            if user in campaign.players.all():
                return self.render_to_response(self.get_context_data(error="Ese jugador ya está en la campaña."))

            campaign.players.add(user)

        return redirect("campaign_detail", pk=campaign.pk)


class CampaignUpdateView(LoginRequiredMixin, UpdateView):
    """
    Vista CBV para editar una camapaña, solo el DM puede ver y acceder esta vista
    """
    model = Campaign
    form_class = CampaignForm
    template_name = "cantrip/campaign_edit.html"
    success_url = reverse_lazy("campaign_list")

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        campaign = self.get_object()

        if campaign.dungeon_master != request.user:
            raise PermissionDenied("No tienes permiso para editar esta campaña.")

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["campaign"] = self.get_object()
        return context


class CampaignDeleteView(LoginRequiredMixin, DeleteView):
    """
    Vista CBV para borrar campañas con confirmación DELETE
    """
    model = Campaign
    template_name = "cantrip/campaign_delete.html"
    success_url = reverse_lazy("campaign_list")
    form_class = DeleteConfirmForm

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        campaign = self.get_object()

        if campaign.dungeon_master != request.user:
            raise PermissionDenied("No tienes permiso para borrar esta campaña.")

        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        form = DeleteConfirmForm(request.POST)
        if form.is_valid():
            return super().post(request, *args, **kwargs)
        return self.get(request, form=form)


class CharacterCreateView(LoginRequiredMixin, CreateView):
    """
    Vista CBV para crear personajes
    """
    model = Character
    form_class = CharacterForm
    template_name = "cantrip/character_create.html"
    success_url = reverse_lazy("character_list")

    login_url = "login"
    redirect_field_name = "next"

    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        tokens_path = os.path.join(settings.BASE_DIR, "static", "assets", "tokens")
        static_tokens = []

        if os.path.exists(tokens_path):
            for f in os.listdir(tokens_path):
                if f.lower().endswith((".png", ".jpg", ".jpeg")):
                    static_tokens.append({
                        "name": os.path.splitext(f)[0],
                        "path": f"assets/tokens/{f}"
                    })

        context["static_tokens"] = static_tokens
        return context


class CharacterListView(LoginRequiredMixin, ListView):
    """
    Vista CBV para ver la lista de personajes del user
    """
    model = Character
    template_name = "cantrip/character_list.html"
    context_object_name = "characters"

    login_url = "login"
    redirect_field_name = "next"

    def get_queryset(self):
        return Character.objects.filter(user=self.request.user)


class CharacterDetailView(LoginRequiredMixin, DetailView):
    """
    Vista CBV para ver detalles de un personaje
    """
    model = Character
    template_name = "cantrip/character_detail.html"
    context_object_name = "character"

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        character = self.get_object()

        if character.user != request.user:
            raise PermissionDenied("No tienes permiso para ver este personaje.")

        return super().dispatch(request, *args, **kwargs)


class CharacterUpdateView(LoginRequiredMixin, UpdateView):
    """
    Vista CBV para editar personajes
    """
    model = Character
    form_class = CharacterForm
    template_name = "cantrip/character_edit.html"
    success_url = reverse_lazy("character_list")

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        character = self.get_object()

        if character.user != request.user:
            raise PermissionDenied("No tienes permiso para editar este personaje.")

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["character"] = self.get_object()

        tokens_path = os.path.join(settings.BASE_DIR, "static", "assets", "tokens")
        static_tokens = []

        if os.path.exists(tokens_path):
            for f in os.listdir(tokens_path):
                if f.lower().endswith((".png", ".jpg", ".jpeg")):
                    static_tokens.append({
                        "name": os.path.splitext(f)[0],
                        "path": f"assets/tokens/{f}"
                    })

        context["static_tokens"] = static_tokens

        return context


class CharacterDeleteView(LoginRequiredMixin, DeleteView):
    """
    Vista CBV para borrar personajes con confirmación DELETE
    """
    model = Character
    template_name = "cantrip/character_delete.html"
    success_url = reverse_lazy("character_list")
    form_class = DeleteConfirmForm

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        character = self.get_object()

        if character.user != request.user:
            raise PermissionDenied("No tienes permiso para borrar este personaje.")

        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        form = DeleteConfirmForm(request.POST)
        if form.is_valid():
            return super().post(request, *args, **kwargs)
        return self.get(request, form=form)



def list_static_maps():
    folder = os.path.join(settings.BASE_DIR, "static", "assets", "maps")
    return [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]




class BoardDetailView(LoginRequiredMixin, DetailView):
    """
    Vista CBV para ver el tablero de una campaña
    """
    model = Board
    template_name = "cantrip/board_detail.html"
    context_object_name = "board"

    login_url = "login"
    redirect_field_name = "next"

    def dispatch(self, request, *args, **kwargs):
        board = self.get_object()
        campaign = board.campaign
        user = request.user

        if campaign.dungeon_master != user and user not in campaign.players.all():
            raise PermissionDenied("No tienes permiso para ver este tablero.")

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        campaign = self.object.campaign
        context["role"] = "DM" if self.request.user == campaign.dungeon_master else "PLAYER"

        context["static_maps"] = list_static_maps()

        context["characters"] = campaign.characters.select_related("user")

        import os
        from django.conf import settings

        tokens_path = os.path.join(settings.BASE_DIR, "static/assets/tokens")
        files = sorted(f for f in os.listdir(tokens_path) if f.endswith(".png"))

        context["static_tokens"] = [
            {
                "path": f"assets/tokens/{f}",
                "name": os.path.splitext(f)[0],
            }
            for f in files
        ]

        return context


class BoardTokensView(LoginRequiredMixin, View):
    def get(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign
        user = request.user

        if campaign.dungeon_master != user and user not in campaign.players.all():
            raise PermissionDenied("No tienes permiso para ver este tablero.")

        tokens = board.tokens.all()

        data = []
        for token in tokens:
            data.append({
                "id": token.id,
                "x": token.x,
                "y": token.y,
                "color": token.color,
                "label": token.label or "",
            })

        return JsonResponse({"tokens": data})

class SetBoardMapView(LoginRequiredMixin, View):
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

        map_path = request.POST.get("map")

        # Si elige un mapa estático, limpiamos el mapa subido
        board.background_static = map_path
        board.background_image = None
        board.save()

        return JsonResponse({"status": "ok"})


class TokenMoveView(LoginRequiredMixin, View):
    """
    Actualiza la posición de un token
    """
    login_url = "login"
    redirect_field_name = "next"

    def post(self, request, pk):
        token = get_object_or_404(Token, pk=pk)
        board = token.board
        campaign = board.campaign
        user = request.user

        if campaign.dungeon_master != user:
            raise PermissionDenied("Solo el DM puede mover tokens.")

        try:
            data = json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)

        x = data.get("x")
        y = data.get("y")

        if x is None or y is None:
            return JsonResponse({"error": "Faltan coordenadas"}, status=400)

        token.x = x
        token.y = y
        token.save()

        return JsonResponse({"status": "ok"})



@require_POST
def add_token(request, board_id):
    board = get_object_or_404(Board, id=board_id)
    campaign = board.campaign

    if request.user != campaign.dungeon_master:
        return HttpResponseForbidden("Solo el DM puede añadir tokens.")

    token_type = request.POST.get("type")
    x = float(request.POST.get("x", 100))
    y = float(request.POST.get("y", 100))
    label = request.POST.get("label", "").strip()
    size = int(request.POST.get("size", 60))

    token = Token(board=board, x=x, y=y)

    token.size = size


    if token_type == "character":
        character_id = request.POST.get("character_id")
        character = get_object_or_404(Character, id=character_id, campaign=campaign)
        token.character = character
        token.label = character.name

    elif token_type == "static":
        static_path = request.POST.get("static_path")
        if not static_path:
            return JsonResponse({"error": "Falta static_path"}, status=400)

        from django.conf import settings

        static_full_path = os.path.join(settings.BASE_DIR, "static", static_path)
        filename = os.path.basename(static_path)

        with open(static_full_path, "rb") as f:
            token.image.save(filename, ContentFile(f.read()), save=False)

        token.label = label or os.path.splitext(filename)[0]

    elif token_type == "upload":
        if "upload" not in request.FILES:
            return JsonResponse({"error": "Falta archivo upload"}, status=400)

        file = request.FILES["upload"]
        token.image = file
        token.label = label or os.path.splitext(file.name)[0]


    else:
        return JsonResponse({"error": "Tipo de token inválido"}, status=400)

    token.save()

    return JsonResponse({
        "token": {
            "id": token.id,
            "x": token.x,
            "y": token.y,
            "label": token.label,
            "image": token.get_image(),
            "color": token.color,
            "size": token.size,
        }
    })


@require_POST
def delete_token(request, token_id):
    token = get_object_or_404(Token, id=token_id)
    board = token.board

    if request.user != board.campaign.dungeon_master:
        return HttpResponseForbidden("Solo el DM puede borrar tokens.")

    if token.image and token.image.name:
        token.image.delete(save=False)

    token.delete()

    return JsonResponse({"status": "ok"})





class ClearTokensView(LoginRequiredMixin, View):
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

        for token in board.tokens.all():
            if token.image and token.image.name:
                token.image.delete(save=False)

        board.tokens.all().delete()

        return JsonResponse({"status": "ok"})




class OpenBoardView(LoginRequiredMixin, View):
    def get(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

        if campaign.board:
            return redirect("board_detail", pk=campaign.board.id)

        board = Board.objects.create(campaign=campaign)
        campaign.board = board
        campaign.save()

        return redirect("board_detail", pk=board.id)


class JoinBoardView(LoginRequiredMixin, View):
    def get(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)

        if not campaign.board:
            return redirect("campaign_detail", pk=pk)

        return redirect("board_detail", pk=campaign.board.id)


class RollDiceView(LoginRequiredMixin, View):
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign
        user = request.user

        if user != campaign.dungeon_master and user not in campaign.players.all():
            return JsonResponse({"error": "No autorizado"}, status=403)

        try:
            data = json.loads(request.body.decode("utf-8"))
        except:
            return JsonResponse({"error": "JSON inválido"}, status=400)

        sides = int(data.get("sides", 0))
        count = int(data.get("count", 0))
        bonus = int(data.get("bonus", 0))

        if sides not in [4, 6, 8, 10, 12, 20, 100] or count < 1:
            return JsonResponse({"error": "Parámetros inválidos"}, status=400)

        import random
        rolls = [random.randint(1, sides) for _ in range(count)]
        total = sum(rolls)

        notation = f"{count}d{sides}"
        if bonus > 0:
            notation += f" + {bonus}"
        elif bonus < 0:
            notation += f" {bonus}"

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"board_{pk}",
            {
                "type": "dice_roll",
                "author": user.username,
                "notation": notation,
                "results": rolls,
                "total": total + bonus,
                "bonus": bonus,
            }
        )

        return JsonResponse({"status": "ok"})


class UploadMapView(LoginRequiredMixin, View):
    """
    Vista para subir archivos de mapa
    """
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

        if "map" not in request.FILES:
            return JsonResponse({"error": "No file"}, status=400)

        file = request.FILES["map"]

        board.background_image = file
        board.background_static = None
        board.save()

        return JsonResponse({"url": board.background_image.url})
