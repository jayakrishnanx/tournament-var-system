import os
import sys
import django
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Setup Django environment
sys.path.append(str(Path(__file__).resolve().parent / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

import urllib.request
import json
from tournaments.models import Tournament, Team, Player, Match

CLOUD_URL = 'https://tournament-var-system.onrender.com/api'

def post(endpoint, payload):
    req = urllib.request.Request(
        f"{CLOUD_URL}{endpoint}",
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req).read().decode('utf-8')
        return json.loads(res)
    except Exception as e:
        print(f"Error syncing to {endpoint}: {e}")
        return None

def sync():
    print("Starting sync from Localhost database to Render Cloud...")

    for t in Tournament.objects.all():
        print(f"Syncing Tournament: {t.name}...")
        t_payload = {
            "name": t.name,
            "sport_type": getattr(t, 'sport_type', getattr(t, 'sport', 'Soccer / Football')),
            "sport": getattr(t, 'sport', getattr(t, 'sport_type', 'Soccer / Football')),
            "location": t.location or "Arena",
            "start_date": str(t.start_date),
            "end_date": str(t.end_date),
            "status": t.status
        }
        cloud_t = post('/tournaments/tournaments/', t_payload)
        if not cloud_t:
            continue

        cloud_t_id = cloud_t['id']

        team_map = {}
        for team in t.teams.all():
            print(f"  - Syncing Team: {team.name}...")
            team_payload = {
                "tournament": cloud_t_id,
                "name": team.name,
                "code": team.code
            }
            cloud_team = post('/tournaments/teams/', team_payload)
            if cloud_team:
                team_map[team.id] = cloud_team['id']

        for match in t.matches.all():
            print(f"  - Syncing Match: {match.match_code}...")
            home_id = team_map.get(match.home_team_id)
            away_id = team_map.get(match.away_team_id)
            if home_id and away_id:
                match_payload = {
                    "tournament": cloud_t_id,
                    "home_team": home_id,
                    "away_team": away_id,
                    "home_score": match.home_score,
                    "away_score": match.away_score,
                    "status": match.status,
                    "current_period": match.current_period,
                    "timer_seconds_elapsed": match.timer_seconds_elapsed,
                    "scheduled_time": match.scheduled_time.isoformat() if match.scheduled_time else "2026-08-29T00:00:00Z"
                }
                post('/tournaments/matches/', match_payload)

    print("Sync complete! All local tournaments and matches uploaded to Cloud.")

if __name__ == '__main__':
    sync()
