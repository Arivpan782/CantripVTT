from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, DetailView, UpdateView, DeleteView
from .models import Campaign, Character, Board, Token
from .forms import CampaignForm, CharacterForm, DeleteConfirmForm
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views import View
import json
import os
from django.conf import settings




def home(request):
    return render(request, "cantrip/home.html")


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


from django.views.generic import DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import Campaign


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

        return context


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


class AddTokenView(LoginRequiredMixin, View):
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

        token = Token.objects.create(
            board=board,
            x=200,
            y=200,
            color="#ff0000",
            label="Nuevo"
        )

        return JsonResponse({
            "token": {
                "id": token.id,
                "x": token.x,
                "y": token.y,
                "label": token.label,
                "color": token.color,
            }
        })




class ClearTokensView(LoginRequiredMixin, View):
    def post(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        campaign = board.campaign

        if request.user != campaign.dungeon_master:
            raise PermissionDenied()

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
