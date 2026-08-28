from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TournamentViewSet, TeamViewSet, PlayerViewSet,
    MatchViewSet, CameraFeedViewSet, VarIncidentViewSet, MatchEventViewSet
)

router = DefaultRouter()
router.register(r'tournaments', TournamentViewSet, basename='tournament')
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'players', PlayerViewSet, basename='player')
router.register(r'matches', MatchViewSet, basename='match')
router.register(r'events', MatchEventViewSet, basename='match-event')
router.register(r'cameras', CameraFeedViewSet, basename='camera')
router.register(r'var-incidents', VarIncidentViewSet, basename='var-incident')

urlpatterns = [
    path('', include(router.urls)),
]
