"""
AuraMart E-Commerce Web Server
Lightweight Python HTTP server with proper MIME types and UTF-8 handling.
"""

import http.server
import socketserver
import os
import sys

PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class AuraMartHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'application/javascript; charset=utf-8'
        if path.endswith('.css'):
            return 'text/css; charset=utf-8'
        if path.endswith('.html') or path.endswith('/'):
            return 'text/html; charset=utf-8'
        if path.endswith('.json'):
            return 'application/json; charset=utf-8'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        if path.endswith('.png'):
            return 'image/png'
        if path.endswith('.jpg') or path.endswith('.jpeg'):
            return 'image/jpeg'
        if path.endswith('.webp'):
            return 'image/webp'
        return super().guess_type(path)

def run_server(port=PORT):
    handler = AuraMartHTTPHandler
    socketserver.TCPServer.allow_reuse_address = True
    
    for p in range(port, port + 10):
        try:
            with socketserver.TCPServer(("", p), handler) as httpd:
                print(f"\n=======================================================")
                print(f"  AURA.TECH E-Commerce Store with PayPal Integration")
                print(f"  Server running at: http://localhost:{p}/")
                print(f"  Serving files from: {DIRECTORY}")
                print(f"=======================================================\n")
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 10048 or "Address already in use" in str(e):
                print(f"Port {p} is in use, trying {p + 1}...")
                continue
            raise

if __name__ == '__main__':
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port_arg)
