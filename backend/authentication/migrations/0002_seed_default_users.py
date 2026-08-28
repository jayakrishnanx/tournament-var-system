from django.db import migrations
from django.contrib.auth.hashers import make_password

def create_default_users(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
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

def reverse_func(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    User.objects.filter(username__in=['admin', 'scorer', 'var']).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_users, reverse_func),
    ]
