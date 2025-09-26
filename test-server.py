#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
from datetime import datetime

class APIHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'status': 'OK',
                'service': 'License Server',
                'version': '1.0.0',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404, 'Not Found')
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data.decode()) if post_data else {}
        except json.JSONDecodeError:
            request_data = {}
        
        if self.path == '/api/license/validate':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'valid': True,
                'license_key': request_data.get('license_key', ''),
                'message': 'License validation endpoint working',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == '/api/license/create':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'license_id': f'test-license-{int(datetime.now().timestamp())}',
                'client_id': request_data.get('client_id', ''),
                'plan': request_data.get('plan', ''),
                'message': 'License creation endpoint working',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == '/api/license/toggle':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'client_id': request_data.get('client_id', ''),
                'status': 'toggled',
                'message': 'License toggle endpoint working',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404, 'Not Found')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

PORT = 3001

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
        print(f"🚀 Python Test Server started successfully")
        print(f"   Protocol: HTTP")
        print(f"   Port: {PORT}")
        print(f"   URL: http://localhost:{PORT}")
        print("✅ Ready for testing")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")
            httpd.shutdown()