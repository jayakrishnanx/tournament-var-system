# 🏆 ArenaVAR - Live Tournament Scoring & 3-Camera VAR System

An enterprise-grade, high-availability live tournament management, real-time scoring, and 3-camera Video Assistant Referee (VAR) system built with **Django (ASGI + Channels)**, **Redis**, **MediaMTX**, **PostgreSQL**, and **React (Vite)**.

---

## 📐 1. System Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
| 1. VIDEO DATA FLOW (MediaMTX & Storage)                                          |
|                                                                                   |
| [Phone 1 (iOS/Android)] --RTMP/RTSP--> +--------------------+ --> HLS / WebRTC --> [Viewer UI]
| [Phone 2 (iOS/Android)] --RTMP/RTSP--> | MediaMTX Container |                      | (Public Livestream)
| [Phone 3 (iOS/Android)] --RTMP/RTSP--> +--------------------+ --> Recorded HLS --> [VAR Operator UI]
|                                                  |                 (3 x Independent  | (Multi-Cam Synchronized
|                                                  v                 MP4/HLS Files)    |  Replay & Clip Maker)
|                                            [Storage Volume]                          |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
| 2. LIVE SCORING & MATCH STATE FLOW (Django + Redis + WebSockets)                  |
|                                                                                   |
| [Scorer UI / Ref] ----(REST/WS API)----> +---------------------+                  |
|   (Score +1, Card, Timer Start)           |  Django App Server  |                  |
|                                           |  (Channels ASGI)    |                  |
|                                           +---------------------+                  |
|                                            /         |         \                  |
|                                           v          v          v                 |
|                                    (DB Trans)  (AuditLog)  (Redis Pub/Sub)          |
|                                         |                    |                    |
|                                         v                    v                    |
|                                    [PostgreSQL]        [WebSocket Broadcast]      |
|                                                              |                    |
|                                                              +------------------> [Scorer UI]
|                                                              +------------------> [VAR Operator UI]
|                                                              +------------------> [Public Scoreboard]
+-----------------------------------------------------------------------------------+
```

---

## 🔑 2. User Roles & Credentials

The portal features strict Role-Based Access Control (RBAC):

| Role | Username | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin` | `admin123` | Full system access, tournament creation, team & match management. |
| ⏱️ **Scorer** | `scorer` | `scorer123` | Rapid score controls (+1/-1), timer start/pause, event recorder. |
| 📹 **VAR Operator** | `var_op` | `var123` | 3-camera synchronized playback, incident queue review, decision logger. |
| 👀 **Spectator** | `spectator` | `viewer123` | Read-only public stadium scoreboards & live streams. |

---

## 📱 3. Mobile Camera Setup Guide (Local Wi-Fi & Tailscale 4G/5G)

Use any free RTMP/RTSP camera app (e.g., **Larix Broadcaster** on App Store / Google Play).

### Option A: Local Wi-Fi Network Setup
Replace `<YOUR_PC_IP>` with your computer's local Wi-Fi IP address (e.g., `192.168.1.8`):
- **Camera 1 (Left Goal)**: `rtmp://<YOUR_PC_IP>:1935/live/left_goal` (or `rtmp://<YOUR_PC_IP>:1935/live/cam1`)
- **Camera 2 (Right Goal)**: `rtmp://<YOUR_PC_IP>:1935/live/right_goal` (or `rtmp://<YOUR_PC_IP>:1935/live/cam2`)
- **Camera 3 (Main Center)**: `rtmp://<YOUR_PC_IP>:1935/live/main` (or `rtmp://<YOUR_PC_IP>:1935/live/cam3`)

### Option B: Remote 4G/5G Cellular Setup via Tailscale (No Port Forwarding Required)
1. Install **Tailscale** on your host laptop and sign in.
2. Note your laptop's Tailscale IP address (e.g. `100.64.92.46`).
3. Install **Tailscale** on Phone 1, Phone 2, and Phone 3. Connect them to 4G/5G (Wi-Fi OFF, Tailscale ON).
4. In **Larix Broadcaster**, configure target RTMP URLs using your laptop's Tailscale IP (must include `/live/`):
   - **Phone 1 (Left Goal)**: `rtmp://100.64.92.46:1935/live/left_goal` (or `rtmp://100.64.92.46:1935/live/cam1`)
   - **Phone 2 (Right Goal)**: `rtmp://100.64.92.46:1935/live/right_goal` (or `rtmp://100.64.92.46:1935/live/cam2`)
   - **Phone 3 (Main Center)**: `rtmp://100.64.92.46:1935/live/main` (or `rtmp://100.64.92.46:1935/live/cam3`)

---

## 🌐 4. Environment Variables

### Backend (`backend/.env`)
- `ALLOWED_HOSTS=*`: Accepts requests from any IP including local Wi-Fi and Tailscale IPs.
- `CORS_ALLOW_ALL_ORIGINS=True`: Permits cross-origin requests.
- `SECRET_KEY`, `DEBUG`, `USE_POSTGRES`, `USE_REDIS`.

### Frontend (`frontend/.env` - Optional)
- `VITE_API_URL`: Override base API endpoint (Default: `http://${window.location.hostname}:8000/api`).
- `VITE_WS_URL`: Override base WebSocket endpoint (Default: `ws://${window.location.hostname}:8000/ws/match/`).

---

## 🚀 5. Local Development Setup

### 1. Allow Firewall Ports (Run once as Administrator)
```powershell
.\allow_firewall.bat
```

### 2. Start Complete System Stack
```powershell
.\start_arena_var.bat
```
Or start individually:
```powershell
# MediaMTX
.\mediamtx.exe

# Backend
cd backend
py -3 manage.py migrate
py -3 manage.py test tournaments authentication audit
py -3 manage.py runserver 0.0.0.0:8000

# Frontend
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Open **[http://localhost:5173/](http://localhost:5173/)** or **`http://<TAILSCALE_IP>:5173/`** in your browser.

---

## 🧪 6. Final Acceptance Test Verification Scenario

- **Laptop**: Connected to Wi-Fi/Ethernet. Tailscale active. Media server & Django running.
- **Phone 1**: 4G/5G network. Wi-Fi OFF. Tailscale ON. Larix Broadcaster streaming `left_goal`.
- **Phone 2**: Different network. Tailscale ON. Larix Broadcaster streaming `right_goal`.
- **Phone 3**: Another network. Tailscale ON. Larix Broadcaster streaming `main`.
- **Verified Results**:
  1. All 3 phones successfully push video to the laptop.
  2. Django web app displays all 3 live camera feeds simultaneously.
  3. MediaMTX records all 3 cameras into MP4 format under `./recordings/`.
  4. Real-time scoring, match timer, and WebSocket score updates operate smoothly.
  5. VAR Operator Station plays back recorded MP4 files with instant rewind and zoom magnifier.
  6. Zero router port forwarding, public IP addresses, VPS servers, or paid cloud services required.
