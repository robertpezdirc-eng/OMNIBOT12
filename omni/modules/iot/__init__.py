# omni/modules/iot/__init__.py
"""
IoT Module Package
Secure IoT device management with automation capabilities
"""

# IoT moduli
from .iot_secure import *
from .iot_automation import *
from .iot_scheduler import *
from .iot_groups import *
from .iot_rules import *
from .iot_monitoring import *
from .iot_notifications import *
from .iot_dashboard import *

__all__ = [
    # IoT Secure
    'turn_on', 'turn_off', 'restart', 'status', 'log_action',
    
    # Automation Engine
    'AutomationEngine', 'create_scene', 'execute_scene', 'get_all_scenes',
    
    # Scheduler
    'IoTScheduler', 'add_scheduled_task', 'remove_scheduled_task', 'get_scheduled_tasks',
    
    # Device Groups
    'DeviceGroup', 'create_device_group', 'add_device_to_group', 'control_group',
    
    # Rules Engine
    'RulesEngine', 'add_automation_rule', 'remove_automation_rule', 'get_all_rules',
    
    # Monitoring
    'IoTMonitor', 'register_device_for_monitoring', 'get_monitoring_dashboard', 'set_alert_threshold',
    
    # Notifications
    'NotificationManager', 'send_alert', 'add_notification_rule',
    
    # Dashboard
    'start_dashboard', 'get_dashboard_app', 'get_socketio', 'broadcast_device_update', 'broadcast_alert'
]