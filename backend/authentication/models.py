from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        SCORER = 'SCORER', 'Official Scorer'
        VAR_OPERATOR = 'VAR_OPERATOR', 'VAR Operator'
        SPECTATOR = 'SPECTATOR', 'Spectator / Viewer'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SPECTATOR,
        help_text="Role determining permissions across the tournament system."
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def is_scorer(self):
        return self.role in [self.Role.ADMIN, self.Role.SCORER] or self.is_superuser

    def is_var_operator(self):
        return self.role in [self.Role.ADMIN, self.Role.VAR_OPERATOR] or self.is_superuser

    def __str__(self):
        return f"{self.username} ({self.role})"
