#!/usr/bin/env python3
"""
Health monitoring service for Shadow Moses Media Server
Provides real-time status monitoring for all configured services
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests
import time
import threading
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Service configuration with health check endpoints
SERVICES = {
    'plex': {
        'name': 'Plex',
        'url': 'http://192.168.1.24:32400',
        'health_endpoint': '/web/index.html',
        'timeout': 5,
        'expected_status': [200, 302]
    },
    'sonarr': {
        'name': 'Sonarr',
        'url': 'http://192.168.1.24:8989',
        'health_endpoint': '/api/v3/system/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-Api-Key': '6ff1a3b70dcf40f1a7c1c7f05fbf2b5a'}
    },
    'radarr': {
        'name': 'Radarr',
        'url': 'http://192.168.1.24:7878',
        'health_endpoint': '/api/v3/system/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-Api-Key': 'c42c4e3ef0ad474d8f5187ecba354c63'}
    },
    'lidarr': {
        'name': 'Lidarr',
        'url': 'http://192.168.1.24:8686',
        'health_endpoint': '/api/v1/system/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-Api-Key': 'your-lidarr-api-key'}
    },
    'bazarr': {
        'name': 'Bazarr',
        'url': 'http://192.168.1.24:6767',
        'health_endpoint': '/api/system/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-API-KEY': 'your-bazarr-api-key'}
    },
    'prowlarr': {
        'name': 'Prowlarr',
        'url': 'http://192.168.1.24:9696',
        'health_endpoint': '/api/v1/system/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-Api-Key': 'your-prowlarr-api-key'}
    },
    'sabnzbd': {
        'name': 'SABnzbd',
        'url': 'http://192.168.1.24:8080',
        'health_endpoint': '/api?mode=version&apikey=your-sabnzbd-api-key',
        'timeout': 5,
        'expected_status': [200]
    },
    'tautulli': {
        'name': 'Tautulli',
        'url': 'http://192.168.1.24:8181',
        'health_endpoint': '/api/v2?apikey=a27404f5c80c4cb693f11a65f5956357&cmd=get_activity',
        'timeout': 5,
        'expected_status': [200]
    },
    'jellyseerr': {
        'name': 'Jellyseerr',
        'url': 'http://192.168.1.17:5055',
        'health_endpoint': '/api/v1/status',
        'timeout': 5,
        'expected_status': [200],
        'headers': {'X-Api-Key': 'MTc1NjA2MDE5MTc2NmJmYWZjNDdhLWI1NmQtNGYzMS1hMDJiLTc0ZmMyMzNiMDU5Nw=='}
    }
}

# Global health status storage
health_status = {}
health_lock = threading.Lock()

def check_service_health(service_id, config):
    """Check health of a single service"""
    try:
        start_time = time.time()
        
        headers = config.get('headers', {})
        timeout = config.get('timeout', 5)
        expected_status = config.get('expected_status', [200])
        
        url = config['url'] + config['health_endpoint']
        
        response = requests.get(
            url,
            headers=headers,
            timeout=timeout,
            allow_redirects=True,
            verify=False
        )
        
        response_time = int((time.time() - start_time) * 1000)  # milliseconds
        
        status = 'online' if response.status_code in expected_status else 'degraded'
        
        return {
            'status': status,
            'response_time': response_time,
            'status_code': response.status_code,
            'last_checked': datetime.now().isoformat(),
            'error': None
        }
        
    except requests.exceptions.Timeout:
        return {
            'status': 'offline',
            'response_time': None,
            'status_code': None,
            'last_checked': datetime.now().isoformat(),
            'error': 'Connection timeout'
        }
    except requests.exceptions.ConnectionError:
        return {
            'status': 'offline',
            'response_time': None,
            'status_code': None,
            'last_checked': datetime.now().isoformat(),
            'error': 'Connection refused'
        }
    except Exception as e:
        return {
            'status': 'offline',
            'response_time': None,
            'status_code': None,
            'last_checked': datetime.now().isoformat(),
            'error': str(e)
        }

def update_all_health():
    """Update health status for all services"""
    global health_status
    
    new_status = {}
    
    for service_id, config in SERVICES.items():
        health = check_service_health(service_id, config)
        health['name'] = config['name']
        new_status[service_id] = health
    
    with health_lock:
        health_status = new_status
    
    print(f"Health check completed at {datetime.now().isoformat()}")

def health_monitor_worker():
    """Background worker to continuously monitor service health"""
    while True:
        try:
            update_all_health()
            time.sleep(30)  # Check every 30 seconds
        except Exception as e:
            print(f"Error in health monitor: {e}")
            time.sleep(60)  # Wait longer on error

@app.route('/api/health/all')
def get_all_health():
    """Get health status for all services"""
    with health_lock:
        return jsonify(health_status)

@app.route('/api/health/<service_id>')
def get_service_health(service_id):
    """Get health status for a specific service"""
    with health_lock:
        if service_id in health_status:
            return jsonify(health_status[service_id])
        else:
            return jsonify({'error': 'Service not found'}), 404

@app.route('/api/health/check')
def force_health_check():
    """Force an immediate health check of all services"""
    update_all_health()
    with health_lock:
        return jsonify({
            'message': 'Health check completed',
            'timestamp': datetime.now().isoformat(),
            'services': health_status
        })

def main():
    # Start background health monitoring
    monitor_thread = threading.Thread(target=health_monitor_worker, daemon=True)
    monitor_thread.start()
    
    # Perform initial health check
    update_all_health()
    
    print("Starting Health Monitor API on http://0.0.0.0:5002")
    app.run(host="0.0.0.0", port=5002, debug=False, use_reloader=False)

if __name__ == "__main__":
    main()