from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Match, MatchEvent, VarIncident, Team, Player
from audit.utils import log_action

def broadcast_match_update(match):
    """
    Broadcasts real-time match state to WebSocket group match_{match.id}
    """
    current_elapsed = match.timer_seconds_elapsed
    if match.is_timer_running and match.timer_last_updated_at:
        delta = (timezone.now() - match.timer_last_updated_at).total_seconds()
        current_elapsed += int(max(0, delta))

    current_period = match.current_period
    if current_elapsed >= 300 and current_period == '1ST_HALF':
        current_period = '2ND_HALF'
        match.current_period = Match.Period.SECOND_HALF
        match.save(update_fields=['current_period'])

    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"match_{match.id}",
                {
                    "type": "match_update",
                    "match": {
                        "id": str(match.id),
                        "home_score": match.home_score,
                        "away_score": match.away_score,
                        "status": match.status,
                        "current_period": match.current_period,
                        "timer_seconds_elapsed": current_elapsed,
                        "computed_elapsed_seconds": current_elapsed,
                        "is_timer_running": match.is_timer_running,
                        "timer_last_updated_at": match.timer_last_updated_at.isoformat() if match.timer_last_updated_at else None,
                    }
                }
            )
        except Exception as e:
            print(f"Warning: WebSocket broadcast failed (Redis/Channels down): {e}")

@transaction.atomic
def update_match_score(match_id, team_id, delta, actor=None, ip_address=None):
    """
    Transactional score modification using database select_for_update locking.
    Creates audit log entry and broadcasts to WebSockets.
    Automatically manages Goal events based on delta.
    """
    match = Match.objects.select_for_update().get(id=match_id)
    team = Team.objects.get(id=team_id)

    before_state = {
        "home_score": match.home_score,
        "away_score": match.away_score
    }

    if team != match.home_team and team != match.away_team:
        raise ValueError("Team is not part of this match")

    # If increasing goal, create GOAL event
    if delta > 0:
        for _ in range(delta):
            match_minute = match.timer_seconds_elapsed // 60
            MatchEvent.objects.create(
                match=match,
                team=team,
                event_type=MatchEvent.EventType.GOAL,
                match_minute=match_minute,
                match_second=match.timer_seconds_elapsed % 60,
                details={"logged_by": "Rapid Score Adjust"}
            )
    # If decreasing goal, delete latest GOAL events
    elif delta < 0:
        for _ in range(abs(delta)):
            latest_goal = MatchEvent.objects.filter(
                match=match,
                team=team,
                event_type=MatchEvent.EventType.GOAL
            ).order_by('-created_at').first()
            if latest_goal:
                latest_goal.delete()

    # Recalculate scores from match events to keep database completely in sync
    home_goals = MatchEvent.objects.filter(match=match, event_type=MatchEvent.EventType.GOAL, team=match.home_team).count()
    away_goals = MatchEvent.objects.filter(match=match, event_type=MatchEvent.EventType.GOAL, team=match.away_team).count()
    match.home_score = home_goals
    match.away_score = away_goals
    match.save()

    after_state = {
        "home_score": match.home_score,
        "away_score": match.away_score
    }

    # Log audit entry
    log_action(
        actor=actor,
        action="UPDATE_SCORE",
        target_type="Match",
        target_id=str(match.id),
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address
    )

    # Broadcast real-time update
    broadcast_match_update(match)

    return match

@transaction.atomic
def add_match_event(match_id, event_type, team_id=None, player_id=None, details=None, actor=None, ip_address=None):
    """
    Records a match event inside a transaction and updates match stats if appropriate.
    """
    match = Match.objects.select_for_update().get(id=match_id)
    team = Team.objects.get(id=team_id) if team_id else None
    player = Player.objects.get(id=player_id) if player_id else None

    # Calculate match minute
    match_minute = match.timer_seconds_elapsed // 60

    event = MatchEvent.objects.create(
        match=match,
        team=team,
        player=player,
        event_type=event_type,
        match_minute=match_minute,
        match_second=match.timer_seconds_elapsed % 60,
        details=details or {}
    )

    # Auto increment score if GOAL event
    if event_type == MatchEvent.EventType.GOAL and team:
        if team == match.home_team:
            match.home_score += 1
        elif team == match.away_team:
            match.away_score += 1
        match.save()

    log_action(
        actor=actor,
        action=f"MATCH_EVENT_{event_type}",
        target_type="MatchEvent",
        target_id=str(event.id),
        before_state={},
        after_state={
            "match_id": str(match.id),
            "event_type": event_type,
            "team": team.name if team else None,
            "player": player.name if player else None
        },
        ip_address=ip_address
    )

    broadcast_match_update(match)
    return event

@transaction.atomic
def toggle_match_timer(match_id, action, actor=None, ip_address=None):
    """
    Starts or pauses the match timer cleanly.
    action: 'START' or 'PAUSE'
    """
    match = Match.objects.select_for_update().get(id=match_id)
    before_state = {
        "status": match.status,
        "is_timer_running": match.is_timer_running,
        "timer_seconds_elapsed": match.timer_seconds_elapsed
    }

    now = timezone.now()

    if action == 'START':
        if not match.is_timer_running:
            match.is_timer_running = True
            match.timer_last_updated_at = now
            if match.status == Match.Status.SCHEDULED:
                match.status = Match.Status.LIVE
                match.actual_start_time = now
                match.is_next_match = False
                if match.current_period == Match.Period.NOT_STARTED:
                    match.current_period = Match.Period.FIRST_HALF
    elif action == 'PAUSE':
        if match.is_timer_running:
            if match.timer_last_updated_at:
                delta = (now - match.timer_last_updated_at).total_seconds()
                match.timer_seconds_elapsed += int(delta)
            match.is_timer_running = False
            match.timer_last_updated_at = None
    elif action == 'RESET':
        match.is_timer_running = False
        match.timer_seconds_elapsed = 0
        match.timer_last_updated_at = None
        match.home_score = 0
        match.away_score = 0
        match.is_next_match = False
        match.status = Match.Status.SCHEDULED
        match.current_period = Match.Period.NOT_STARTED
        MatchEvent.objects.filter(match=match).delete()
    elif action == 'FINISH':
        if match.timer_last_updated_at and match.is_timer_running:
            delta = (now - match.timer_last_updated_at).total_seconds()
            match.timer_seconds_elapsed += int(delta)
        match.is_timer_running = False
        match.timer_last_updated_at = None
        match.is_next_match = False
        match.status = Match.Status.ENDED
        match.actual_end_time = now
        
        # Automatic advancement logic for single elimination bracket matches
        if match.stage != Match.Stage.REGULAR and match.bracket_code:
            winner = None
            if match.home_score > match.away_score:
                winner = match.home_team
            elif match.away_score > match.home_score:
                winner = match.away_team
            
            if winner:
                next_code = None
                is_home = True
                
                if match.bracket_code in ['QF1', 'QF2']:
                    next_code = 'SF1'
                    is_home = (match.bracket_code == 'QF1')
                elif match.bracket_code in ['QF3', 'QF4']:
                    next_code = 'SF2'
                    is_home = (match.bracket_code == 'QF3')
                elif match.bracket_code in ['SF1', 'SF2']:
                    next_code = 'F'
                    is_home = (match.bracket_code == 'SF1')
                
                if next_code:
                    try:
                        next_match = Match.objects.filter(tournament=match.tournament, bracket_code=next_code).first()
                        if next_match:
                            if is_home:
                                next_match.home_team = winner
                            else:
                                next_match.away_team = winner
                            next_match.save()
                            broadcast_match_update(next_match)
                    except Exception as e:
                        print(f"Error advancing winner of {match.bracket_code} to {next_code}: {e}")

    match.save()

    log_action(
        actor=actor,
        action=f"TIMER_{action}",
        target_type="Match",
        target_id=str(match.id),
        before_state=before_state,
        after_state={
            "status": match.status,
            "is_timer_running": match.is_timer_running,
            "timer_seconds_elapsed": match.timer_seconds_elapsed
        },
        ip_address=ip_address
    )

    broadcast_match_update(match)
    return match
