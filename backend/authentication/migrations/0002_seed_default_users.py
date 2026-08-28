from django.db import migrations
from django.contrib.auth.hashers import make_password
from datetime import date

def create_default_users_and_data(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    Tournament = apps.get_model('tournaments', 'Tournament')
    Team = apps.get_model('tournaments', 'Team')
    Match = apps.get_model('tournaments', 'Match')

    hashed_pwd = make_password('admin123')
    
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@kallikalam.com',
            'password': hashed_pwd,
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if not created or not admin.password.startswith('pbkdf2_'):
        admin.password = hashed_pwd
        admin.role = 'ADMIN'
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        
    scorer, created = User.objects.get_or_create(
        username='scorer',
        defaults={
            'email': 'scorer@kallikalam.com',
            'password': hashed_pwd,
            'role': 'SCORER',
        }
    )
    if not created or not scorer.password.startswith('pbkdf2_'):
        scorer.password = hashed_pwd
        scorer.role = 'SCORER'
        scorer.save()
        
    var_op, created = User.objects.get_or_create(
        username='var',
        defaults={
            'email': 'var@kallikalam.com',
            'password': hashed_pwd,
            'role': 'VAR_OPERATOR',
        }
    )
    if not created or not var_op.password.startswith('pbkdf2_'):
        var_op.password = hashed_pwd
        var_op.role = 'VAR_OPERATOR'
        var_op.save()

    # Seed Default Tournament & Matches
    tournament, _ = Tournament.objects.get_or_create(
        name='KALLIKALAM CHAMPIONSHIP 2026',
        defaults={
            'sport_type': 'Soccer / Football',
            'location': 'Kallikalam Arena',
            'start_date': date.today(),
            'end_date': date.today(),
            'status': 'ONGOING'
        }
    )

    team_alpha, _ = Team.objects.get_or_create(
        name='Team Alpha',
        defaults={'tournament': tournament, 'coach_name': 'Coach Alpha', 'contact_number': '1234567890'}
    )

    team_beta, _ = Team.objects.get_or_create(
        name='Team Beta',
        defaults={'tournament': tournament, 'coach_name': 'Coach Beta', 'contact_number': '0987654321'}
    )

    Match.objects.get_or_create(
        match_code='match1',
        defaults={
            'tournament': tournament,
            'home_team': team_alpha,
            'away_team': team_beta,
            'home_score': 0,
            'away_score': 0,
            'status': 'LIVE',
            'current_period': '1st Half',
            'timer_seconds_elapsed': 0
        }
    )

def reverse_func(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    User.objects.filter(username__in=['admin', 'scorer', 'var']).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
        ('tournaments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_users_and_data, reverse_func),
    ]
