from django.db import migrations

def cleanup_legacy_data(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    Team = apps.get_model('tournaments', 'Team')
    Match = apps.get_model('tournaments', 'Match')
    Player = apps.get_model('tournaments', 'Player')

    # Find and delete legacy seeded 'Kakkikalam' tournament
    legacy_tournaments = Tournament.objects.filter(name__iexact='Kakkikalam')
    for t in legacy_tournaments:
        Match.objects.filter(tournament=t).delete()
        Player.objects.filter(team__tournament=t).delete()
        Team.objects.filter(tournament=t).delete()
        t.delete()

def reverse_cleanup(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('tournaments', '0008_alter_player_unique_together_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_legacy_data, reverse_cleanup),
    ]
