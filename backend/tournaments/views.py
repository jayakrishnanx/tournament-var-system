from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tournament, Team, Player, Match, MatchEvent, CameraFeed, VarIncident
from .serializers import (
    TournamentSerializer, TeamSerializer, PlayerSerializer,
    MatchSerializer, MatchEventSerializer, CameraFeedSerializer, VarIncidentSerializer
)
from .services import update_match_score, add_match_event, toggle_match_timer, broadcast_match_update

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return True

class IsScorerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return True

class IsVarOperatorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return True

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all().order_by('-created_at')
    serializer_class = TournamentSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_bracket(self, request, pk=None):
        tournament = self.get_object()
        team_ids = request.data.get('team_ids', [])
        
        if len(team_ids) not in [4, 8]:
            return Response({'error': 'Please select exactly 4 or 8 teams for the bracket.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify all team_ids belong to this tournament
        teams = list(Team.objects.filter(tournament=tournament, id__in=team_ids))
        if len(teams) != len(team_ids):
            return Response({'error': 'Some selected teams do not belong to this tournament.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We need to map team_ids list to team objects in order
        team_map = {str(t.id): t for t in teams}
        ordered_teams = [team_map[tid] for tid in team_ids]
        
        # Delete any existing bracket matches for this tournament to avoid duplicates
        Match.objects.filter(tournament=tournament).exclude(stage=Match.Stage.REGULAR).delete()
        
        from django.utils import timezone
        now = timezone.now()
        
        if len(team_ids) == 8:
            # Create Quarter Finals
            qf1 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[0],
                away_team=ordered_teams[1],
                stage=Match.Stage.QUARTER_FINAL,
                bracket_code='QF1',
                scheduled_time=now + timezone.timedelta(hours=2)
            )
            qf2 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[2],
                away_team=ordered_teams[3],
                stage=Match.Stage.QUARTER_FINAL,
                bracket_code='QF2',
                scheduled_time=now + timezone.timedelta(hours=4)
            )
            qf3 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[4],
                away_team=ordered_teams[5],
                stage=Match.Stage.QUARTER_FINAL,
                bracket_code='QF3',
                scheduled_time=now + timezone.timedelta(hours=6)
            )
            qf4 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[6],
                away_team=ordered_teams[7],
                stage=Match.Stage.QUARTER_FINAL,
                bracket_code='QF4',
                scheduled_time=now + timezone.timedelta(hours=8)
            )
            
            # Create Semi Finals (Placeholders)
            sf1 = Match.objects.create(
                tournament=tournament,
                home_team=None,
                away_team=None,
                stage=Match.Stage.SEMI_FINAL,
                bracket_code='SF1',
                scheduled_time=now + timezone.timedelta(days=1)
            )
            sf2 = Match.objects.create(
                tournament=tournament,
                home_team=None,
                away_team=None,
                stage=Match.Stage.SEMI_FINAL,
                bracket_code='SF2',
                scheduled_time=now + timezone.timedelta(days=1, hours=2)
            )
            
            # Create Final (Placeholder)
            f = Match.objects.create(
                tournament=tournament,
                home_team=None,
                away_team=None,
                stage=Match.Stage.FINAL,
                bracket_code='F',
                scheduled_time=now + timezone.timedelta(days=2)
            )
            
        elif len(team_ids) == 4:
            # Create Semi Finals
            sf1 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[0],
                away_team=ordered_teams[1],
                stage=Match.Stage.SEMI_FINAL,
                bracket_code='SF1',
                scheduled_time=now + timezone.timedelta(hours=2)
            )
            sf2 = Match.objects.create(
                tournament=tournament,
                home_team=ordered_teams[2],
                away_team=ordered_teams[3],
                stage=Match.Stage.SEMI_FINAL,
                bracket_code='SF2',
                scheduled_time=now + timezone.timedelta(hours=4)
            )
            
            # Create Final (Placeholder)
            f = Match.objects.create(
                tournament=tournament,
                home_team=None,
                away_team=None,
                stage=Match.Stage.FINAL,
                bracket_code='F',
                scheduled_time=now + timezone.timedelta(days=1)
            )
            
        return Response({'success': 'Bracket generated successfully!'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reset_standings(self, request, pk=None):
        """
        Resets all REGULAR (group/league) matches for this tournament:
        - Deletes all match events
        - Sets scores back to 0
        - Sets status back to SCHEDULED
        - Resets timer
        Points table is recomputed dynamically, so it resets automatically.
        """
        tournament = self.get_object()
        regular_matches = Match.objects.filter(tournament=tournament, stage=Match.Stage.REGULAR)
        
        count = regular_matches.count()
        
        # Delete all events for these matches
        from .models import MatchEvent
        MatchEvent.objects.filter(match__in=regular_matches).delete()
        
        # Reset all regular matches
        regular_matches.update(
            home_score=0,
            away_score=0,
            status=Match.Status.SCHEDULED,
            is_timer_running=False,
            timer_seconds_elapsed=0,
            timer_last_updated_at=None,
            is_next_match=False,
            actual_start_time=None,
            actual_end_time=None,
        )
        
        return Response({
            'success': f'Points table reset. {count} regular matches cleared back to 0-0 SCHEDULED.'
        }, status=status.HTTP_200_OK)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().order_by('name')
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        tournament_id = self.request.query_params.get('tournament')
        if tournament_id:
            queryset = queryset.filter(tournament_id=tournament_id)
        return queryset

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all().order_by('jersey_number')
    serializer_class = PlayerSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        return queryset

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().order_by('-scheduled_time')
    serializer_class = MatchSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        tournament_id = self.request.query_params.get('tournament')
        status_param = self.request.query_params.get('status')
        if tournament_id:
            queryset = queryset.filter(tournament_id=tournament_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsScorerOrAdmin])
    def score(self, request, pk=None):
        team_id = request.data.get('team_id')
        delta = request.data.get('delta', 1)
        if not team_id:
            return Response({'error': 'team_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            match = update_match_score(
                match_id=pk,
                team_id=team_id,
                delta=int(delta),
                actor=request.user,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(MatchSerializer(match).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsScorerOrAdmin])
    def event(self, request, pk=None):
        event_type = request.data.get('event_type')
        team_id = request.data.get('team_id')
        player_id = request.data.get('player_id')
        details = request.data.get('details', {})

        if not event_type:
            return Response({'error': 'event_type is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = add_match_event(
                match_id=pk,
                event_type=event_type,
                team_id=team_id,
                player_id=player_id,
                details=details,
                actor=request.user,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(MatchEventSerializer(event).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsScorerOrAdmin])
    def timer(self, request, pk=None):
        action_type = request.data.get('action') # START, PAUSE, RESET, or FINISH
        if action_type not in ['START', 'PAUSE', 'RESET', 'FINISH']:
            return Response({'error': 'action must be START, PAUSE, RESET, or FINISH'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            match = toggle_match_timer(
                match_id=pk,
                action=action_type,
                actor=request.user,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(MatchSerializer(match).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsScorerOrAdmin])
    def set_next(self, request, pk=None):
        try:
            match = Match.objects.get(pk=pk)
            if match.status != Match.Status.SCHEDULED:
                return Response({'error': 'Only scheduled matches can be set as Next Match.'}, status=status.HTTP_400_BAD_REQUEST)

            is_currently_next = match.is_next_match
            Match.objects.filter(tournament=match.tournament).update(is_next_match=False)

            if not is_currently_next:
                match.is_next_match = True
                match.save(update_fields=['is_next_match'])

            broadcast_match_update(match)
            return Response(MatchSerializer(match).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Count
        tournament_id = request.query_params.get('tournament')
        
        events_qs = MatchEvent.objects.all()
        if tournament_id:
            events_qs = events_qs.filter(match__tournament_id=tournament_id)

        # Top scorers
        goal_events = events_qs.filter(event_type=MatchEvent.EventType.GOAL).values(
            'player__id', 'player__name', 'player__jersey_number', 'team__id', 'team__name', 'team__code'
        ).annotate(count=Count('id')).order_by('-count')
        
        top_scorers = [
            {
                "player_id": item['player__id'],
                "player_name": item['player__name'] or "Unknown Player",
                "jersey_number": item['player__jersey_number'],
                "team_id": item['team__id'],
                "team_name": item['team__name'] or "Unknown Team",
                "team_code": item['team__code'] or "",
                "goals": item['count']
            }
            for item in goal_events if item['player__name'] or item['team__name']
        ]

        # Yellow cards
        yellow_events = events_qs.filter(event_type=MatchEvent.EventType.YELLOW_CARD).values(
            'player__id', 'player__name', 'player__jersey_number', 'team__id', 'team__name', 'team__code'
        ).annotate(count=Count('id')).order_by('-count')
        
        yellow_cards = [
            {
                "player_id": item['player__id'],
                "player_name": item['player__name'] or "Unknown Player",
                "jersey_number": item['player__jersey_number'],
                "team_id": item['team__id'],
                "team_name": item['team__name'] or "Unknown Team",
                "team_code": item['team__code'] or "",
                "yellow_cards": item['count']
            }
            for item in yellow_events if item['player__name'] or item['team__name']
        ]

        # Red cards
        red_events = events_qs.filter(event_type=MatchEvent.EventType.RED_CARD).values(
            'player__id', 'player__name', 'player__jersey_number', 'team__id', 'team__name', 'team__code'
        ).annotate(count=Count('id')).order_by('-count')
        
        red_cards = [
            {
                "player_id": item['player__id'],
                "player_name": item['player__name'] or "Unknown Player",
                "jersey_number": item['player__jersey_number'],
                "team_id": item['team__id'],
                "team_name": item['team__name'] or "Unknown Team",
                "team_code": item['team__code'] or "",
                "red_cards": item['count']
            }
            for item in red_events if item['player__name'] or item['team__name']
        ]

        return Response({
            "top_scorers": top_scorers,
            "yellow_cards": yellow_cards,
            "red_cards": red_cards
        })

    @action(detail=False, methods=['get'])
    def standings(self, request):
        tournament_id = request.query_params.get('tournament')
        tournaments = Tournament.objects.all()
        if tournament_id:
            tournaments = tournaments.filter(id=tournament_id)

        target_t = tournaments.first()
        if not target_t:
            return Response([])

        teams = target_t.teams.all()
        matches = target_t.matches.all()

        table = []
        for team in teams:
            played = 0
            won = 0
            drawn = 0
            lost = 0
            gf = 0
            ga = 0

            for m in matches:
                if m.status == Match.Status.ENDED:
                    if m.home_team_id == team.id:
                        played += 1
                        gf += m.home_score
                        ga += m.away_score
                        if m.home_score > m.away_score:
                            won += 1
                        elif m.home_score == m.away_score:
                            drawn += 1
                        else:
                            lost += 1
                    elif m.away_team_id == team.id:
                        played += 1
                        gf += m.away_score
                        ga += m.home_score
                        if m.away_score > m.home_score:
                            won += 1
                        elif m.away_score == m.home_score:
                            drawn += 1
                        else:
                            lost += 1

            gd = gf - ga
            pts = (won * 3) + (drawn * 1)
            table.append({
                "team_id": str(team.id),
                "team_name": team.name,
                "team_code": team.code,
                "played": played,
                "won": won,
                "drawn": drawn,
                "lost": lost,
                "goals_for": gf,
                "goals_against": ga,
                "goal_difference": gd,
                "points": pts
            })

        table.sort(key=lambda x: (x['points'], x['goal_difference'], x['goals_for']), reverse=True)
        return Response(table)

    @action(detail=False, methods=['get'])
    def recordings(self, request):
        import os
        from django.conf import settings
        match_id = request.query_params.get('match')
        recordings_base = os.path.abspath(os.path.join(settings.BASE_DIR, '../recordings'))
        
        files_list = []
        if os.path.exists(recordings_base):
            match_keywords = []
            if match_id:
                match_keywords.append(str(match_id).lower())
                try:
                    m_obj = Match.objects.get(id=match_id)
                    if m_obj.match_number:
                        match_keywords.append(f"match{m_obj.match_number}")
                        match_keywords.append(f"match_{m_obj.match_number}")
                    if m_obj.match_code:
                        match_keywords.append(m_obj.match_code.lower())
                except Exception:
                    pass

            for root, dirs, files in os.walk(recordings_base):
                for f in sorted(files, reverse=True):
                    if f.endswith('.mp4'):
                        rel_path = os.path.relpath(os.path.join(root, f), recordings_base).replace('\\', '/')
                        if match_keywords:
                            rel_lower = rel_path.lower()
                            if any(kw in rel_lower for kw in match_keywords):
                                files_list.append({
                                    "name": f,
                                    "rel_path": rel_path,
                                    "url": request.build_absolute_uri(f"/recordings/{rel_path}")
                                })
                        else:
                            files_list.append({
                                "name": f,
                                "rel_path": rel_path,
                                "url": request.build_absolute_uri(f"/recordings/{rel_path}")
                            })

            if match_id and not files_list:
                for root, dirs, files in os.walk(recordings_base):
                    for f in sorted(files, reverse=True):
                        if f.endswith('.mp4'):
                            rel_path = os.path.relpath(os.path.join(root, f), recordings_base).replace('\\', '/')
                            files_list.append({
                                "name": f,
                                "rel_path": rel_path,
                                "url": request.build_absolute_uri(f"/recordings/{rel_path}")
                            })

        return Response({"recordings": files_list})

import os, re
from django.http import StreamingHttpResponse, Http404
from django.conf import settings

def stream_video_file(request, path):
    video_path = os.path.abspath(os.path.join(settings.BASE_DIR, '../recordings', path))
    if not os.path.exists(video_path):
        raise Http404("Recording file not found")

    file_size = os.path.getsize(video_path)
    range_header = request.META.get('HTTP_RANGE', '').strip()

    range_match = re.match(r'bytes=(\d+)-(\d+)?', range_header)
    if range_match:
        first_byte, last_byte = range_match.groups()
        first_byte = int(first_byte)
        last_byte = int(last_byte) if last_byte else file_size - 1
        if last_byte >= file_size:
            last_byte = file_size - 1
        length = last_byte - first_byte + 1

        def file_iterator(file_name, chunk_size=65536, offset=0, length=None):
            with open(file_name, 'rb') as f:
                f.seek(offset)
                remaining = length
                while remaining > 0:
                    read_length = min(chunk_size, remaining)
                    data = f.read(read_length)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        response = StreamingHttpResponse(
            file_iterator(video_path, offset=first_byte, length=length),
            status=206,
            content_type='video/mp4'
        )
        response['Content-Range'] = f'bytes {first_byte}-{last_byte}/{file_size}'
        response['Accept-Ranges'] = 'bytes'
        response['Content-Length'] = str(length)
        return response
    else:
        def file_iterator(file_name, chunk_size=65536):
            with open(file_name, 'rb') as f:
                while True:
                    data = f.read(chunk_size)
                    if not data:
                        break
                    yield data

        response = StreamingHttpResponse(
            file_iterator(video_path),
            status=200,
            content_type='video/mp4'
        )
        response['Accept-Ranges'] = 'bytes'
        response['Content-Length'] = str(file_size)
        return response

class CameraFeedViewSet(viewsets.ModelViewSet):
    queryset = CameraFeed.objects.all()
    serializer_class = CameraFeedSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        match_id = self.request.query_params.get('match')
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        return queryset

class VarIncidentViewSet(viewsets.ModelViewSet):
    queryset = VarIncident.objects.all().order_by('-created_at')
    serializer_class = VarIncidentSerializer
    permission_classes = [IsVarOperatorOrAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        match_id = self.request.query_params.get('match')
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        return queryset

def recalculate_match_scores(match):
    home_goals = MatchEvent.objects.filter(match=match, event_type=MatchEvent.EventType.GOAL, team=match.home_team).count()
    away_goals = MatchEvent.objects.filter(match=match, event_type=MatchEvent.EventType.GOAL, team=match.away_team).count()
    match.home_score = home_goals
    match.away_score = away_goals
    match.save(update_fields=['home_score', 'away_score'])
    try:
        broadcast_match_update(match)
    except Exception as e:
        print(f"Warning: broadcast_match_update failed: {e}")

class MatchEventViewSet(viewsets.ModelViewSet):
    queryset = MatchEvent.objects.all()
    serializer_class = MatchEventSerializer
    permission_classes = [IsScorerOrAdmin]

    def perform_create(self, serializer):
        event = serializer.save()
        recalculate_match_scores(event.match)

    def perform_update(self, serializer):
        event = serializer.save()
        recalculate_match_scores(event.match)

    def perform_destroy(self, instance):
        match = instance.match
        instance.delete()
        recalculate_match_scores(match)
