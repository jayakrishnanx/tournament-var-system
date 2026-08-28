import uuid
from django.db import migrations
from django.utils import timezone

def seed_match_heavens_b_vs_ufc(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    Team = apps.get_model('tournaments', 'Team')
    Match = apps.get_model('tournaments', 'Match')

    for t in Tournament.objects.all():
        heb = Team.objects.filter(tournament=t, name__icontains='HEAVENS FC (B)').first()
        if heb and heb.code != 'HEB':
            heb.code = 'HEB'
            heb.save(update_fields=['code'])

        home_team = heb or Team.objects.filter(tournament=t, code='HEB').first()
        away_team = Team.objects.filter(tournament=t, name__icontains='UFC').first() or Team.objects.filter(tournament=t, code='UFC').first()

        if home_team and away_team:
            # Check if this match already exists
            match_exists = Match.objects.filter(
                tournament=t,
                home_team=home_team,
                away_team=away_team,
                stage='REGULAR'
            ).exists()

            if not match_exists:
                now = timezone.now()
                Match.objects.create(
                    tournament=t,
                    home_team=home_team,
                    away_team=away_team,
                    home_score=0,
                    away_score=0,
                    status='SCHEDULED',
                    current_period='NOT_STARTED',
                    stage='REGULAR',
                    match_number=8,
                    scheduled_time=now + timezone.timedelta(hours=8)
                )

def reverse_seed(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('tournaments', '0006_match_bracket_code_match_stage_alter_match_away_team_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_match_heavens_b_vs_ufc, reverse_seed),
    ]
