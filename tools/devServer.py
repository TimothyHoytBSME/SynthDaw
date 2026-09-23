import functools
import http.server
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 4329
handler = functools.partial(NoCacheHandler, directory=str(SRC_DIR))
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
