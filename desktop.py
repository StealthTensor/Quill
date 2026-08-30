import os
import sys
import threading
import webview
import uvicorn
from api.main import app
from fastapi.staticfiles import StaticFiles

def get_web_dir():
    """Get the path to the React build directory, handling PyInstaller bundle."""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, 'web', 'dist')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'dist')

# Mount the React build
web_dir = get_web_dir()
if os.path.exists(web_dir):
    app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")
else:
    print(f"Warning: Web directory not found at {web_dir}")

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=5001, log_level="error")

def start_app():
    # Start the local server in a daemon thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Create the native window
    webview.create_window(
        'Quill',
        'http://127.0.0.1:5001',
        width=1200,
        height=800,
        min_size=(900, 600)
    )
    # private_mode defaults to True, which wipes localStorage/cookies between
    # launches — that is what breaks "Remember me". Persist a storage profile so
    # saved credentials survive a restart.
    storage_path = os.path.join(os.path.expanduser('~'), '.quill', 'webview')
    os.makedirs(storage_path, exist_ok=True)
    webview.start(private_mode=False, storage_path=storage_path)

if __name__ == '__main__':
    start_app()
