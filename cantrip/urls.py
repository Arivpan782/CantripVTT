from django.urls import path
from .views import *
urlpatterns = [
    path("", home, name="home"),
    path("campaigns/", CampaignListView.as_view(), name="campaign_list"),
    path("campaigns/create/", CampaignCreateView.as_view(), name="campaign_create"),
    path("campaigns/<int:pk>/", CampaignDetailView.as_view(), name="campaign_detail"),
    path("campaigns/<int:pk>/edit/", CampaignUpdateView.as_view(), name="campaign_edit"),
    path("campaigns/<int:pk>/delete/", CampaignDeleteView.as_view(), name="campaign_delete"),
    path("characters/", CharacterListView.as_view(), name="character_list"),
    path("characters/create/", CharacterCreateView.as_view(), name="character_create"),
    path("characters/<int:pk>/", CharacterDetailView.as_view(), name="character_detail"),
    path("characters/<int:pk>/edit/", CharacterUpdateView.as_view(), name="character_edit"),
    path("characters/<int:pk>/delete/", CharacterDeleteView.as_view(), name="character_delete"),
    path("boards/<int:pk>/", BoardDetailView.as_view(), name="board_detail"),
    path("boards/<int:pk>/tokens/", BoardTokensView.as_view(), name="board_tokens"),
    path("tokens/<int:pk>/move/", TokenMoveView.as_view(), name="token_move"),

]
