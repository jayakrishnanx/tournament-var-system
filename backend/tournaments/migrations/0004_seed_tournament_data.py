from django.db import migrations

def seed_data(apps, schema_editor):
    # Hardcoded dummy data seeding removed to allow dynamic user data
    pass

def reverse_seed(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('tournaments', '0003_match_match_number'),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_seed),
    ]

