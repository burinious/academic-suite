from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DIST_DIR = Path(__file__).resolve().parent / "dist"


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self) -> None:
        requested_path = self.path.split("?", 1)[0]
        full_path = (DIST_DIR / requested_path.lstrip("/")).resolve()

        if requested_path in {"/", ""} or (full_path.exists() and full_path.is_file() and DIST_DIR in full_path.parents):
            return super().do_GET()

        index_path = DIST_DIR / "index.html"
        content = index_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4174), SpaHandler)
    print("Serving SPA build at http://127.0.0.1:4174", flush=True)
    server.serve_forever()
