import uuid
from django.db import migrations
from django.utils import timezone

def seed_data(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    Team = apps.get_model('tournaments', 'Team')
    Match = apps.get_model('tournaments', 'Match')
    Player = apps.get_model('tournaments', 'Player')

    if Tournament.objects.filter(name='Kakkikalam').exists():
        return

    t = Tournament.objects.create(
        id=uuid.UUID('3900288b-42ef-4640-a9b9-90c88cfbff8e'),
        name='Kakkikalam',
        sport='Soccer / Football',
        location='Kallikalam Arena',
        start_date='2026-08-29',
        end_date='2026-08-30',
        status='UPCOMING'
    )

    team_data = [
        ('SRFC', 'SRFC'),
        ('MALAYIL FC', 'MAL'),
        ('EFC ALUVA', 'EFC'),
        ('ELMERA FC', 'ELM'),
        ('HEAVENS FC (A)', 'HEA'),
        ('SNFC EROOR', 'SNFC'),
        ('SEVENSEES', 'SEV'),
        ('K.TOWN SOCCERS', 'K.T'),
        ('EXPO FC', 'EXP'),
        ('HEAVENS FC (B)', 'HEB'),
        ('UFC', 'UFC'),
        ('YASC', 'YAS'),
        ('BRITISH EMPIRE FC', 'BRI'),
        ('CLASSIC POLO', 'CLA'),
        ('FC PORTO', 'FC '),
        ('SHAJAN FC', 'SHA')
    ]

    teams = {}
    for name, code in team_data:
        team = Team.objects.create(
            tournament=t,
            name=name,
            code=code
        )
        teams[code] = team

    if 'SRFC' in teams:
        Player.objects.create(
            team=teams['SRFC'],
            name='ARJUN JR',
            jersey_number=10,
            position='Forward'
        )

    matches_data = [
        ('K.T', 'MAL', 1),
        ('EFC', 'ELM', 2),
        ('HEA', 'SNFC', 3),
        ('SEV', 'EXP', 4),
        ('YAS', 'BRI', 5),
        ('CLA', 'FC ', 6),
        ('SHA', 'SRFC', 7),
        ('HEB', 'UFC', 8),
    ]

    now = timezone.now()
    for home_code, away_code, match_num in matches_data:
        if home_code in teams and away_code in teams:
            Match.objects.create(
                tournament=t,
                home_team=teams[home_code],
                away_team=teams[away_code],
                home_score=0,
                away_score=0,
                status='SCHEDULED',
                current_period='NOT_STARTED',
                match_number=match_num,
                scheduled_time=now
            )

def reverse_seed(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    Tournament.objects.filter(name='Kakkikalam').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('tournaments', '0003_match_match_number'),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_seed),
    ]
