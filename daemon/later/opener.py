import subprocess
import sys


def open_url(url: str) -> bool:
    """Open a URL in the default browser."""
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", url], check=True)
        elif sys.platform == "win32":
            subprocess.run(["start", url], shell=True, check=True)
        else:
            subprocess.run(["xdg-open", url], check=True)
        return True
    except subprocess.CalledProcessError:
        return False
