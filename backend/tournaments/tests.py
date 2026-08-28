from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tournaments.models import Tournament, Team, Match, MatchEvent
from tournaments.services import update_match_score, toggle_match_timer
from audit.models import AuditLog

User = get_user_model()

class TournamentSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users with different roles
        self.admin = User.objects.create_user(
            username='admin_user', password='password123', role=User.Role.ADMIN
        )
        self.scorer = User.objects.create_user(
            username='scorer_user', password='password123', role=User.Role.SCORER
        )
        self.var_op = User.objects.create_user(
            username='var_user', password='password123', role=User.Role.VAR_OPERATOR
        )
        self.spectator = User.objects.create_user(
            username='viewer_user', password='password123', role=User.Role.SPECTATOR
        )

        # Create tournament, teams & match
        self.tournament = Tournament.objects.create(
            name="World Cup 2026",
            sport="Soccer",
            start_date="2026-06-01",
            end_date="2026-07-01",
            status=Tournament.Status.ONGOING
        )

        self.team_a = Team.objects.create(tournament=self.tournament, name="Team Alpha", code="ALPHA")
        self.team_b = Team.objects.create(tournament=self.tournament, name="Team Beta", code="BETA")

        self.match = Match.objects.create(
            tournament=self.tournament,
            home_team=self.team_a,
            away_team=self.team_b,
            scheduled_time=timezone.now()
        )

    def test_user_roles(self):
        self.assertTrue(self.admin.is_admin())
        self.assertTrue(self.scorer.is_scorer())
        self.assertTrue(self.var_op.is_var_operator())
        self.assertFalse(self.spectator.is_scorer())

    def test_transactional_score_update(self):
        # Update home score by +1
        updated_match = update_match_score(
            match_id=self.match.id,
            team_id=self.team_a.id,
            delta=1,
            actor=self.scorer
        )
        self.assertEqual(updated_match.home_score, 1)
        self.assertEqual(updated_match.away_score, 0)

        # Check Audit Log created
        audit_entry = AuditLog.objects.filter(target_id=str(self.match.id)).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.action, "UPDATE_SCORE")
        self.assertEqual(audit_entry.actor, self.scorer)

    def test_timer_toggle(self):
        updated_match = toggle_match_timer(
            match_id=self.match.id,
            action="START",
            actor=self.scorer
        )
        self.assertTrue(updated_match.is_timer_running)
        self.assertEqual(updated_match.status, Match.Status.LIVE)

    def test_permission_enforcement(self):
        # Spectator trying to update score should fail (403)
        self.client.force_authenticate(user=self.spectator)
        url = f"/api/tournaments/matches/{self.match.id}/score/"
        response = self.client.post(url, {"team_id": str(self.team_a.id), "delta": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Scorer trying to update score should succeed (200)
        self.client.force_authenticate(user=self.scorer)
        response = self.client.post(url, {"team_id": str(self.team_a.id), "delta": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
