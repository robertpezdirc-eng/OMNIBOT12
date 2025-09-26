#!/usr/bin/env python3
"""
Omni Unified Server
Enotni backend server za Omni AI Platform, ki služi glavni aplikaciji in vsem modulom
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OmniUnifiedServer:
    def __init__(self, port=3000, angel_api_port=3001):
        self.port = port
        self.angel_api_port = angel_api_port
        self.angel_api_url = f"http://localhost:{angel_api_port}"
        self.app = Flask(__name__, static_folder='.', template_folder='.')
        CORS(self.app)
        
        # Server statistics
        self.start_time = time.time()
        self.request_count = 0
        self.angel_cache = {}
        self.cache_timestamp = 0
        
        self.setup_routes()
        
    def setup_routes(self):
        """Setup all server routes"""
        
        # Main application route
        @self.app.route('/')
        def index():
            """Serve the main unified application"""
            return send_from_directory('.', 'index.html')
        
        # Dodamo route za module
        @self.app.route('/modules/<path:filename>')
        def serve_modules(filename):
            """Služi moduli iz modules mape"""
            self.request_count += 1
            return send_from_directory('modules', filename)
        
        # Dodamo route za statične datoteke
        @self.app.route('/<path:filename>')
        def serve_static(filename):
            """Služi statičnim datotekam"""
            self.request_count += 1
            return send_from_directory('.', filename)
        
        # API Routes
        @self.app.route('/api/health')
        def health_check():
            """Health check endpoint"""
            self.request_count += 1
            uptime = time.time() - self.start_time
            
            # Check Angel API availability
            angel_status = self.check_angel_api_health()
            
            return jsonify({
                'status': 'healthy',
                'uptime': uptime,
                'uptime_human': f"{int(uptime // 3600)}h {int((uptime % 3600) // 60)}m",
                'requests_served': self.request_count,
                'timestamp': datetime.now().isoformat(),
                'angel_api_status': angel_status,
                'services': {
                    'main_app': 'active',
                    'angel_api': 'active' if angel_status else 'inactive',
                    'unified_server': 'active'
                }
            })
        
        @self.app.route('/api/stats')
        def get_stats():
            """Get server statistics"""
            self.request_count += 1
            uptime = time.time() - self.start_time
            
            # Get Angel systems data
            angels_data = self.get_cached_angels()
            
            # Calculate average response time
            avg_response_time = 0
            if angels_data:
                response_times = [angel.get('response_time', 0) for angel in angels_data.values()]
                avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            return jsonify({
                'angel_count': len(angels_data) if angels_data else 8,
                'uptime': '99.9%',
                'requests': f"{self.request_count / 1000:.1f}K",
                'response_time': f"{int(avg_response_time)}ms",
                'server_uptime': uptime,
                'timestamp': datetime.now().isoformat()
            })
        
        @self.app.route('/api/angels')
        def get_angels():
            """Get all Angel systems"""
            self.request_count += 1
            angels_data = self.get_cached_angels()
            
            if angels_data:
                return jsonify({
                    'status': 'success',
                    'angels': list(angels_data.keys()),
                    'count': len(angels_data),
                    'data': angels_data
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Angel API not available',
                    'angels': [],
                    'count': 0
                }), 503
        
        @self.app.route('/api/angel/<angel_name>')
        def get_angel_details(angel_name):
            """Get specific Angel system details"""
            self.request_count += 1
            angels_data = self.get_cached_angels()
            
            if angels_data and angel_name in angels_data:
                return jsonify(angels_data[angel_name])
            else:
                return jsonify({
                    'status': 'error',
                    'message': f'Angel {angel_name} not found'
                }), 404
        
        @self.app.route('/api/modules')
        def get_modules():
            """Vrne seznam razpoložljivih modulov"""
            self.request_count += 1
            modules = []
            
            # Preverimo, kateri moduli obstajajo v modules mapi
            modules_dir = 'modules'
            if os.path.exists(modules_dir):
                module_files = [
                    'dashboard.html',
                    'generator.html', 
                    'multimodal.html',
                    'angels.html',
                    'api-gateway.html',
                    'system-status.html',
                    'logs.html'
                ]
                
                for module_file in module_files:
                    module_path = os.path.join(modules_dir, module_file)
                    if os.path.exists(module_path):
                        module_name = module_file.replace('.html', '')
                        modules.append({
                            'name': module_name,
                            'title': module_name.replace('-', ' ').title(),
                            'url': f'/modules/{module_file}',
                            'available': True
                        })
            
            return jsonify(modules)
        
        @self.app.route('/api/system/status')
        def system_status():
            """Get comprehensive system status"""
            self.request_count += 1
            
            # Check all system components
            components = {
                'main_app': self.check_main_app(),
                'angel_api': self.check_angel_api_health(),
                'unified_server': True,  # Always true if we're responding
                'modules': self.check_modules()
            }
            
            overall_status = 'healthy' if all(components.values()) else 'degraded'
            
            return jsonify({
                'status': overall_status,
                'components': components,
                'uptime': time.time() - self.start_time,
                'timestamp': datetime.now().isoformat(),
                'version': '1.0.0'
            })
    
    def check_angel_api_health(self):
        """Check if Angel API is available"""
        try:
            response = requests.get(f"{self.angel_api_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def check_main_app(self):
        """Check if main application files exist"""
        required_files = ['index.html', 'dashboard.html', 'generator.html', 'multimodal.html']
        return all(os.path.exists(file) for file in required_files)
    
    def check_modules(self):
        """Check if all modules are available"""
        modules = ['dashboard.html', 'generator.html', 'multimodal.html']
        return all(os.path.exists(module) for module in modules)
    
    def get_cached_angels(self):
        """Get Angel systems data with caching"""
        current_time = time.time()
        
        # Cache for 30 seconds
        if current_time - self.cache_timestamp > 30:
            try:
                # Get list of angels
                response = requests.get(f"{self.angel_api_url}/api/angels", timeout=5)
                if response.status_code == 200:
                    angels_list = response.json().get('angels', [])
                    
                    # Get detailed info for each angel
                    angels_data = {}
                    for angel_name in angels_list:
                        try:
                            angel_response = requests.get(
                                f"{self.angel_api_url}/api/angel/{angel_name}", 
                                timeout=3
                            )
                            if angel_response.status_code == 200:
                                angels_data[angel_name] = angel_response.json()
                        except:
                            logger.warning(f"Failed to get data for {angel_name}")
                    
                    self.angel_cache = angels_data
                    self.cache_timestamp = current_time
                    
            except Exception as e:
                logger.error(f"Failed to update angel cache: {e}")
        
        return self.angel_cache
    
    def run(self, debug=False):
        """Start the unified server"""
        logger.info(f"Starting Omni Unified Server on port {self.port}")
        logger.info(f"Angel API expected on port {self.angel_api_port}")
        logger.info(f"Main application: http://localhost:{self.port}")
        
        # Check if required files exist
        if not self.check_main_app():
            logger.warning("Some required files are missing!")
        
        # Check Angel API availability
        if self.check_angel_api_health():
            logger.info("Angel API is available")
        else:
            logger.warning("Angel API is not available - some features may not work")
        
        try:
            self.app.run(
                host='0.0.0.0',
                port=self.port,
                debug=debug,
                threaded=True
            )
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Omni Unified Server')
    parser.add_argument('--port', type=int, default=3000, help='Server port (default: 3000)')
    parser.add_argument('--angel-port', type=int, default=3001, help='Angel API port (default: 3001)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Create and start server
    server = OmniUnifiedServer(port=args.port, angel_api_port=args.angel_port)
    server.run(debug=args.debug)

if __name__ == '__main__':
    main()