from flask import Flask, jsonify
from flask_cors import CORS
import psutil
import requests
import re

app = Flask(__name__)
CORS(app)

def get_cpu_temp():
    try:
        resp = requests.get('http://192.168.1.24:8085/data.json', timeout=2)
        data = resp.json()
        print("Top-level keys:", data.keys())
        for system in data.get('Children', []):
            print("System Text:", system.get('Text', ''))
            for hw in system.get('Children', []):
                print("  Hardware Text:", hw.get('Text', ''))
                if "Intel Core" in hw.get('Text', ''):
                    print("  Found Intel Core section:", hw.get('Text'))
                    for category in hw.get('Children', []):
                        print("    Category Text:", category.get('Text', ''))
                        if category.get('Text') == "Temperatures":
                            print("    Found Temperatures category")
                            # Try each possible sensor in order of preference
                            for preferred in ["CPU Package", "Core Max", "Core Average"]:
                                for sensor in category.get('Children', []):
                                    print("      Sensor Text:", sensor.get('Text', ''), "Value:", sensor.get('Value', ''))
                                    if sensor.get('Text') == preferred:
                                        value_str = sensor.get('Value')
                                        if value_str:
                                            match = re.search(r"[\d.]+", value_str)
                                            if match:
                                                print("      Matched value:", match.group(0))
                                                return float(match.group(0))
                            print("      No preferred temperature sensor found.")
        print("CPU temperature not found in JSON.")
        return None
    except Exception as e:
        print(f"Error reading CPU temp from LibreHardwareMonitor: {e}")
        return None

@app.route('/api/stats')
def stats():
    cpu_usage = psutil.cpu_percent(interval=0.5)
    cpu_temp = get_cpu_temp()
    ram = psutil.virtual_memory()
    ram_used_gb = ram.used / (1024**3)
    ram_total_gb = ram.total / (1024**3)
    ram_usage = ram.percent
    net = psutil.net_io_counters()
    network = {'down': net.bytes_recv, 'up': net.bytes_sent}
    nas = None
    for part in psutil.disk_partitions(all=True):
        if part.device.startswith('Z:'):
            usage = psutil.disk_usage(part.mountpoint)
            nas = {
                'usage': usage.percent,
                'used': usage.used / (1024 ** 3),
                'free': usage.free / (1024 ** 3),
                'total': usage.total / (1024 ** 3)
            }
            break
    return jsonify({
        'cpu': {'usage': cpu_usage, 'temp': cpu_temp},
        'ram': {'usage': ram_usage, 'used': ram_used_gb, 'total': ram_total_gb},
        'network': network,
        'nas': nas
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3030)