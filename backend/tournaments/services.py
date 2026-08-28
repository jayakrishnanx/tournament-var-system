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
    channel_layer = get_channel_layer()
    if channel_layer:
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
                    "timer_seconds_elapsed": match.timer_seconds_elapsed,
                    "is_timer_running": match.is_timer_running,
                    "timer_last_updated_at": match.timer_last_updated_at.isoformat() if match.timer_last_updated_at else None,
                }
            }
        )

@transaction.atomic
def update_match_score(match_id, team_id, delta, actor=None, ip_address=None):
    """
    Transactional score modification using database select_for_update locking.
    Creates audit log entry and broadcasts to WebSockets.
    """
    match = Match.objects.select_for_update().get(id=match_id)
    team = Team.objects.get(id=team_id)

    before_state = {
        "home_score": match.home_score,
        "away_score": match.away_score
    }

    if team == match.home_team:
        new_score = max(0, match.home_score + delta)
        match.home_score = new_score
    elif team == match.away_team:
        new_score = max(0, match.away_score + delta)
        match.away_score = new_score
    else:
        raise ValueError("Team is not part of this match")

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
        match.status = Match.Status.SCHEDULED
        match.current_period = Match.Period.NOT_STARTED
    elif action == 'FINISH':
        if match.timer_last_updated_at and match.is_timer_running:
            delta = (now - match.timer_last_updated_at).total_seconds()
            match.timer_seconds_elapsed += int(delta)
        match.is_timer_running = False
        match.timer_last_updated_at = None
        match.status = Match.Status.ENDED
        match.actual_end_time = now

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
