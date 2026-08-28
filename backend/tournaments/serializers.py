from rest_framework import serializers
from .models import Tournament, Team, Player, Match, MatchEvent, CameraFeed, VarIncident

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = '__all__'

class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = '__all__'
        extra_kwargs = {'code': {'required': False}}

    def create(self, validated_data):
        if not validated_data.get('code'):
            name = validated_data.get('name', 'TM')
            validated_data['code'] = name[:3].upper()
        return super().create(validated_data)

class CameraFeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraFeed
        fields = '__all__'

class MatchEventSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    player_name = serializers.CharField(source='player.name', read_only=True)

    class Meta:
        model = MatchEvent
        fields = '__all__'

class VarIncidentSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = VarIncident
        fields = '__all__'

class MatchSerializer(serializers.ModelSerializer):
    tournament_name = serializers.CharField(source='tournament.name', read_only=True)
    home_team_details = TeamSerializer(source='home_team', read_only=True)
    away_team_details = TeamSerializer(source='away_team', read_only=True)
    camera_feeds = CameraFeedSerializer(many=True, read_only=True)
    match_code = serializers.ReadOnlyField()
    recent_events = serializers.SerializerMethodField()
    computed_elapsed_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = '__all__'

    def get_computed_elapsed_seconds(self, obj):
        from django.utils import timezone
        seconds = obj.timer_seconds_elapsed
        if obj.is_timer_running and obj.timer_last_updated_at:
            delta = (timezone.now() - obj.timer_last_updated_at).total_seconds()
            seconds += int(max(0, delta))
        return seconds

    def get_recent_events(self, obj):
        events = obj.events.all()[:10]
        return MatchEventSerializer(events, many=True).data

class TournamentSerializer(serializers.ModelSerializer):
    teams = TeamSerializer(many=True, read_only=True)
    matches_count = serializers.IntegerField(source='matches.count', read_only=True)

    class Meta:
        model = Tournament
        fields = '__all__'
