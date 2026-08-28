import cv2
import numpy as np
import subprocess
import time
import datetime

# RTMP Stream URL
rtmp_url = 'rtmp://127.0.0.1:1935/live/cam1'

# Frame dimensions
width = 1280
height = 720
fps = 30

# FFmpeg subprocess command to stream raw video frames to MediaMTX RTMP
command = [
    'ffmpeg',
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-pix_fmt', 'bgr24',
    '-s', f'{width}x{height}',
    '-r', str(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-f', 'flv',
    rtmp_url
]

print("Check if ffmpeg is available...")
try:
    proc = subprocess.Popen(command, stdin=subprocess.PIPE)
    print("Streaming synthetic camera 1 feed to MediaMTX at:", rtmp_url)
    
    frame_count = 0
    start_time = time.time()
    
    while True:
        # Create dark blue background frame
        img = np.zeros((height, width, 3), np.uint8)
        img[:] = (30, 20, 15)
        
        # Moving color bar animation
        x_pos = int((frame_count * 5) % width)
        cv2.rectangle(img, (x_pos, 0), (x_pos + 100, height), (0, 165, 255), -1)
        
        # Draw camera text overlay
        cv2.putText(img, "CAM 1 - LIVE ARENA VAR TEST STREAM", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
        
        # Draw live timestamp
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        cv2.putText(img, f"TIME: {now_str}", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        cv2.putText(img, f"FRAME: {frame_count}", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
        
        # Draw status badge
        cv2.rectangle(img, (50, 300), (350, 360), (0, 200, 0), -1)
        cv2.putText(img, "LIVE INGEST ACTIVE", (65, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        
        # Write frame to ffmpeg stdin
        proc.stdin.write(img.tobytes())
        frame_count += 1
        
        # Control 30 FPS timing
        elapsed = time.time() - start_time
        expected_time = frame_count / fps
        if expected_time > elapsed:
            time.sleep(expected_time - elapsed)

except FileNotFoundError:
    print("FFmpeg binary not in PATH. Will download standalone ffmpeg for instant testing...")
