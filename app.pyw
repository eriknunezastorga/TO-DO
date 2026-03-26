import webview
import json
import os
import time
import subprocess
import threading
from pathlib import Path

try:
    import requests as _requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from plyer import notification as _plyer_notif
    HAS_PLYER = True
except ImportError:
    HAS_PLYER = False

# ---------------------------------------------------------------------------
# Data path
# ---------------------------------------------------------------------------
DATA_DIR = Path(os.environ.get("APPDATA", Path.home())) / "Simpel"
DATA_PATH = DATA_DIR / "data.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)

EMPTY_STATE = {"tasks": [], "projects": [], "notes": []}

# ---------------------------------------------------------------------------
# Ollama helpers
# ---------------------------------------------------------------------------
def _ollama_running() -> bool:
    if not HAS_REQUESTS:
        return False
    try:
        _requests.get("http://localhost:11434", timeout=2)
        return True
    except Exception:
        return False


def ensure_ollama():
    """Start Ollama in background if installed but not running."""
    if _ollama_running():
        return True
    try:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(2)
        return _ollama_running()
    except FileNotFoundError:
        return False


# ---------------------------------------------------------------------------
# pywebview JS API
# ---------------------------------------------------------------------------
class Api:
    def load(self):
        """Read data.json and return AppState dict."""
        try:
            if DATA_PATH.exists():
                text = DATA_PATH.read_text(encoding="utf-8")
                data = json.loads(text)
                # Ensure all keys exist
                for key in EMPTY_STATE:
                    data.setdefault(key, [])
                return data
        except Exception:
            pass
        return dict(EMPTY_STATE)

    def save(self, data):
        """Write AppState to data.json."""
        try:
            DATA_PATH.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            return True
        except Exception:
            return False

    def get_data_path(self):
        """Return absolute path to data.json."""
        return str(DATA_PATH)

    def notify(self, title, message):
        """Show a Windows notification via plyer."""
        if HAS_PLYER:
            try:
                _plyer_notif.notify(
                    title=str(title),
                    message=str(message),
                    app_name="Simpel",
                    timeout=8,
                )
            except Exception:
                pass

    def export_dialog(self, data):
        """Open Save dialog and write JSON export."""
        try:
            win = webview.windows[0]
            result = win.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=str(Path.home() / "Documents"),
                save_filename="Simpel_export.json",
                file_types=("JSON-fil (*.json)", "Alla filer (*.*)"),
            )
            if not result:
                return {"ok": False}
            path = result[0] if isinstance(result, (list, tuple)) else result
            Path(path).write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            return {"ok": True, "path": str(path)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_dialog(self):
        """Open file dialog and return parsed JSON data."""
        try:
            win = webview.windows[0]
            result = win.create_file_dialog(
                webview.OPEN_DIALOG,
                directory=str(Path.home() / "Documents"),
                file_types=("JSON-fil (*.json)", "Alla filer (*.*)"),
            )
            if not result:
                return {"ok": False}
            path = result[0] if isinstance(result, (list, tuple)) else result
            text = Path(path).read_text(encoding="utf-8")
            data = json.loads(text)
            return {"ok": True, "data": data}
        except Exception as e:
            return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    # Start Ollama in background (non-blocking)
    threading.Thread(target=ensure_ollama, daemon=True).start()

    html_path = Path(__file__).parent / "Simpel.html"

    api = Api()
    window = webview.create_window(
        title="Simpel",
        url=str(html_path),
        js_api=api,
        width=1280,
        height=800,
        min_size=(920, 640),
        resizable=True,
        text_select=True,
    )
    webview.start(debug=False)


if __name__ == "__main__":
    main()
