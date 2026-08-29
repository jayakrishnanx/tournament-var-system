from django.db import migrations

def seed_match_heavens_b_vs_ufc(apps, schema_editor):
    # Hardcoded match seeding removed to allow dynamic user data
    pass

def reverse_seed(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('tournaments', '0006_match_bracket_code_match_stage_alter_match_away_team_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_match_heavens_b_vs_ufc, reverse_seed),
    ]

