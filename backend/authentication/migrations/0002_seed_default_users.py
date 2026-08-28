from django.db import migrations

def create_default_users(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser('admin', 'admin@kallikalam.com', 'admin123')
        admin.role = 'ADMIN'
        admin.save()
        
    if not User.objects.filter(username='scorer').exists():
        scorer = User.objects.create_user('scorer', 'scorer@kallikalam.com', 'scorer123')
        scorer.role = 'SCORER'
        scorer.save()
        
    if not User.objects.filter(username='var').exists():
        var_op = User.objects.create_user('var', 'var@kallikalam.com', 'var123')
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
