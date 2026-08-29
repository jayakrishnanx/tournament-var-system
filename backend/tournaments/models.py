import uuid
from django.db import models
from django.conf import settings

class Tournament(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        ONGOING = 'ONGOING', 'Ongoing'
        COMPLETED = 'COMPLETED', 'Completed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    sport = models.CharField(max_length=100, default='Soccer / Football')
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, blank=True, default='')
    logo_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'name')

    def __str__(self):
        return f"{self.name} [{self.code}]"

class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=150)
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    position = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.name} ({self.team.code})"

class Match(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        LIVE = 'LIVE', 'Live In Progress'
        PAUSED = 'PAUSED', 'Paused / Half-Time'
        ENDED = 'ENDED', 'Ended'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Period(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Not Started'
        FIRST_HALF = '1ST_HALF', '1st Half'
        HALF_TIME = 'HALF_TIME', 'Half Time'
        SECOND_HALF = '2ND_HALF', '2nd Half'
        EXTRA_TIME = 'EXTRA_TIME', 'Extra Time'
        PENALTIES = 'PENALTIES', 'Penalties'

    class Stage(models.TextChoices):
        REGULAR = 'REGULAR', 'Regular Group/League'
        QUARTER_FINAL = 'QUARTER_FINAL', 'Quarter-Final'
        SEMI_FINAL = 'SEMI_FINAL', 'Semi-Final'
        FINAL = 'FINAL', 'Final'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    home_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='home_matches', null=True, blank=True)
    away_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='away_matches', null=True, blank=True)
    
    home_score = models.PositiveIntegerField(default=0)
    away_score = models.PositiveIntegerField(default=0)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    current_period = models.CharField(max_length=20, choices=Period.choices, default=Period.NOT_STARTED)
    
    stage = models.CharField(max_length=30, choices=Stage.choices, default=Stage.REGULAR)
    bracket_code = models.CharField(max_length=20, blank=True, null=True)

    timer_seconds_elapsed = models.PositiveIntegerField(default=0)
    is_timer_running = models.BooleanField(default=False)
    timer_last_updated_at = models.DateTimeField(null=True, blank=True)
    is_next_match = models.BooleanField(default=False)
    
    match_number = models.PositiveIntegerField(null=True, blank=True)
    scheduled_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def match_code(self):
        if self.match_number:
            return f"match{self.match_number}"
        return f"match_{str(self.id).replace('-', '')[:8]}"

    def save(self, *args, **kwargs):
        if not self.match_number:
            max_num = Match.objects.aggregate(models.Max('match_number'))['match_number__max'] or 0
            self.match_number = max_num + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Match #{self.match_number}: {self.home_team.code} {self.home_score} - {self.away_score} {self.away_team.code} ({self.status})"

class MatchEvent(models.Model):
    class EventType(models.TextChoices):
        GOAL = 'GOAL', 'Goal Scored'
        YELLOW_CARD = 'YELLOW_CARD', 'Yellow Card'
        RED_CARD = 'RED_CARD', 'Red Card'
        FOUL = 'FOUL', 'Foul'
        SUBSTITUTION = 'SUBSTITUTION', 'Substitution'
        VAR_DECISION = 'VAR_DECISION', 'VAR Decision'
        PERIOD_START = 'PERIOD_START', 'Period Started'
        PERIOD_END = 'PERIOD_END', 'Period Ended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='events')
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    match_minute = models.PositiveIntegerField(default=0)
    match_second = models.PositiveIntegerField(default=0)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.match_minute}'] {self.event_type} - Match {self.match.id}"

class CameraFeed(models.Model):
    class CameraLabel(models.TextChoices):
        CAM_LEFT = 'CAM_LEFT', 'Left Side Angle'
        CAM_CENTER = 'CAM_CENTER', 'Main Center Angle'
        CAM_RIGHT = 'CAM_RIGHT', 'Right Side Angle'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='camera_feeds')
    label = models.CharField(max_length=30, choices=CameraLabel.choices)
    stream_key = models.CharField(max_length=100, unique=True, help_text="MediaMTX stream path e.g. cam1")
    ingest_protocol = models.CharField(max_length=20, default='RTMP', help_text="RTMP, RTSP, or SRT")
    hls_url = models.URLField(blank=True, help_text="HLS stream URL from MediaMTX")
    is_connected = models.BooleanField(default=False)
    last_heartbeat = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('match', 'label')

    def __str__(self):
        return f"{self.label} ({self.stream_key}) for Match {self.match.id}"

class VarIncident(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under VAR Review'
        CONFIRMED = 'CONFIRMED', 'Decision Confirmed'
        OVERTURNED = 'OVERTURNED', 'Decision Overturned'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='var_incidents')
    event_type = models.CharField(max_length=50, help_text="Goal check, Penalty check, Red card check")
    timestamp_seconds = models.PositiveIntegerField(help_text="Match time in seconds when incident occurred")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='var_reviews'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"VAR Incident [{self.event_type}] at {self.timestamp_seconds}s - {self.status}"
