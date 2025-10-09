"""
User Registration and SMS Alert System
Handles user registration via phone numbers and sends flood alerts via SMS
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import requests
from fastapi import HTTPException
try:
    from twilio.rest import Client
    from twilio_config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DEMO_MODE
    from phone_verification import verification_service
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    DEMO_MODE = True
    print("⚠️ Twilio not configured - running in demo mode")
        """Register a new user for flood alerts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if phone number is verified (for trial accounts)
            if TWILIO_AVAILABLE and not DEMO_MODE:
                verification_status = verification_service.get_verification_instructions(phone_number)
                if not verification_status["verified"]:
                    raise HTTPException(
                        status_code=400, 
                        detail={
                            "error": "Phone number not verified",
                            "message": verification_status["message"],
                            "instructions": verification_status.get("instructions", []),
                            "verification_url": verification_status.get("verification_url")
                        }
                    )
            
            cursor.execute('''
                INSERT INTO users (phone_number, name, area, latitude, longitude, registered_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (phone_number, name, area, latitude, longitude))
            
            user_id = cursor.lastrowid
            conn.commit()
            logger.info(f"👤 User registered: {name} ({phone_number}) in {area}")
            return user_id
            
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        finally:
            conn.close()
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import requests
from fastapi import HTTPException
try:
    from twilio.rest import Client
    from twilio_config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DEMO_MODE
    from phone_verification import verification_service
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    DEMO_MODE = True
    print("⚠️ Twilio not configured - running in demo mode")
from fastapi import HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskLevel(Enum):
    LOW = "LOW"
    MILD = "MILD"
    HIGH = "HIGH"
    SEVERE = "SEVERE"

@dataclass
class User:
    id: int
    phone_number: str
    name: str
    area: str
    latitude: float
    longitude: float
    registered_at: datetime
    is_active: bool = True
    last_alert_sent: Optional[datetime] = None

@dataclass
class AlertHistory:
    id: int
    user_id: int
    risk_level: str
    message: str
    sent_at: datetime
    delivery_status: str

class DatabaseManager:
    def __init__(self, db_path: str = "flood_alerts.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                area TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                last_alert_sent TIMESTAMP
            )
        ''')
        
        # Alert history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                message TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivery_status TEXT DEFAULT 'pending',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("📊 Database initialized successfully")
    
    def register_user(self, phone_number: str, name: str, area: str, latitude: float, longitude: float) -> int:
        """Register a new user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (phone_number, name, area, latitude, longitude)
                VALUES (?, ?, ?, ?, ?)
            ''', (phone_number, name, area, latitude, longitude))
            
            user_id = cursor.lastrowid
            conn.commit()
            logger.info(f"👤 User registered: {name} ({phone_number}) in {area}")
            return user_id
            
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        finally:
            conn.close()
    
    def get_all_users(self) -> List[Dict]:
        """Get all active users"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, phone_number, name, area, latitude, longitude, 
                   registered_at, is_active, last_alert_sent
            FROM users WHERE is_active = 1
        ''')
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row[0],
                'phone_number': row[1],
                'name': row[2],
                'area': row[3],
                'latitude': row[4],
                'longitude': row[5],
                'registered_at': row[6],
                'is_active': bool(row[7]),
                'last_alert_sent': row[8]
            })
        
        conn.close()
        return users
    
    def update_last_alert_sent(self, user_id: int, sent_time: Optional[datetime]):
        """Update when the last alert was sent to a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Handle None value for clearing alert timestamp
        if sent_time is None:
            cursor.execute('''
                UPDATE users SET last_alert_sent = NULL WHERE id = ?
            ''', (user_id,))
        else:
            cursor.execute('''
                UPDATE users SET last_alert_sent = ? WHERE id = ?
            ''', (sent_time.isoformat(), user_id))
        
        conn.commit()
        conn.close()
    
    def log_alert(self, user_id: int, risk_level: str, message: str, delivery_status: str = 'sent'):
        """Log an alert in the history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alert_history (user_id, risk_level, message, delivery_status)
            VALUES (?, ?, ?, ?)
        ''', (user_id, risk_level, message, delivery_status))
        
        conn.commit()
        conn.close()
    
    def get_user_alerts(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get alert history for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, risk_level, message, sent_at, delivery_status
            FROM alert_history 
            WHERE user_id = ?
            ORDER BY sent_at DESC
            LIMIT ?
        ''', (user_id, limit))
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                'id': row[0],
                'risk_level': row[1],
                'message': row[2],
                'sent_at': row[3],
                'delivery_status': row[4]
            })
        
        conn.close()
        return alerts

class SMSService:
    def __init__(self):
        if TWILIO_AVAILABLE and not DEMO_MODE:
            self.client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            self.from_phone = TWILIO_PHONE_NUMBER
            self.demo_mode = False
            logger.info("🔗 SMS Service initialized with Twilio")
        else:
            self.client = None
            self.from_phone = "+1234567890"  # Demo number
            self.demo_mode = True
            logger.info("📱 SMS Service running in DEMO MODE")
        
    def send_sms(self, phone_number: str, message: str) -> bool:
        """Send SMS to a phone number"""
        try:
            if self.demo_mode:
                # Demo SMS sending for testing
                logger.info(f"📱 DEMO SMS to {phone_number}:")
                logger.info(f"📱 Message: {message}")
                print(f"\n🚨 FLOOD ALERT SMS SENT TO {phone_number}")
                print("=" * 60)
                print(message)
                print("=" * 60)
                return True
            else:
                # Real Twilio implementation
                message_obj = self.client.messages.create(
                    body=message,
                    from_=self.from_phone,
                    to=phone_number
                )
                
                logger.info(f"📱 SMS sent to {phone_number}: {message_obj.sid}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to send SMS to {phone_number}: {str(e)}")
            return False

class AlertManager:
    def __init__(self):
        self.db = DatabaseManager()
        self.sms = SMSService()
        self.emergency_contacts = {
            "Police": "100",
            "Fire Brigade": "101", 
            "Ambulance": "108",
            "NDRF": "011-24363260",
            "Disaster Management": "1070",
            "Uttarakhand Emergency": "0135-2710334"
        }
    
    def create_alert_message(self, risk_level: str, user_name: str, area: str) -> str:
        """Create alert message based on risk level (ultra-short for trial accounts)"""
        
        # Ultra-short message format for trial account limits (under 160 characters)
        if risk_level in ['HIGH', 'SEVERE']:
            message = f"🚨 FLOOD ALERT - {risk_level}\n"
            message += f"Hi {user_name.split()[0]},\n"
            message += f"High flood risk in {area}.\n"
            message += "Move to higher ground!\n"
            message += "Emergency: 100/108\n"
            message += f"{datetime.now().strftime('%d/%m %H:%M')}"
        else:
            message = f"Flood Alert - {risk_level} risk in {area}. Stay safe!"
        
        return message
    
    def should_send_alert(self, user: Dict, risk_level: str) -> bool:
        """Check if alert should be sent based on timing rules"""
        if risk_level not in ['HIGH', 'SEVERE']:
            return False
        
        last_alert = user.get('last_alert_sent')
        if not last_alert:
            return True
        
        # Parse the last alert time
        try:
            last_alert_time = datetime.fromisoformat(last_alert)
            time_since_last = datetime.now() - last_alert_time
            
            # Send again if more than 1 hour has passed
            return time_since_last >= timedelta(hours=1)
        except:
            return True
    
    async def send_flood_alerts(self, current_risk_level: str, flood_probability: float) -> Dict[str, Any]:
        """Send flood alerts to all registered users"""
        logger.info(f"🔍 Processing alerts for risk level: {current_risk_level}")
        
        if current_risk_level not in ['HIGH', 'SEVERE']:
            logger.info(f"❌ No alerts sent for {current_risk_level} risk level (only HIGH/SEVERE trigger alerts)")
            return {
                "alerts_sent": 0,
                "message": f"No alerts sent for {current_risk_level} risk level"
            }
        
        users = self.db.get_all_users()
        alerts_sent = 0
        failed_alerts = 0
        
        logger.info(f"📋 Found {len(users)} users to process")
        
        for user in users:
            try:
                logger.info(f"🔍 Checking user: {user['name']} ({user['phone_number']})")
                
                if self.should_send_alert(user, current_risk_level):
                    logger.info(f"✅ Sending alert to {user['name']}")
                    
                    message = self.create_alert_message(
                        current_risk_level, 
                        user['name'], 
                        user['area']
                    )
                    
                    # Send SMS
                    logger.info(f"📱 Attempting SMS to {user['phone_number']}")
                    success = self.sms.send_sms(user['phone_number'], message)
                    logger.info(f"📱 SMS result: {'SUCCESS' if success else 'FAILED'}")
                    
                    if success:
                        # Update last alert sent time
                        self.db.update_last_alert_sent(user['id'], datetime.now())
                        
                        # Log the alert
                        self.db.log_alert(
                            user['id'], 
                            current_risk_level, 
                            message, 
                            'sent'
                        )
                        
                        alerts_sent += 1
                        logger.info(f"✅ Alert successfully sent to {user['name']} ({user['phone_number']})")
                    else:
                        failed_alerts += 1
                        self.db.log_alert(
                            user['id'], 
                            current_risk_level, 
                            message, 
                            'failed'
                        )
                        logger.error(f"❌ Failed to send alert to {user['name']}")
                else:
                    logger.info(f"⏰ Skipping {user['name']} - alert already sent recently or conditions not met")
            
            except Exception as e:
                logger.error(f"❌ Error processing user {user.get('name', 'Unknown')}: {str(e)}")
                failed_alerts += 1
        
        return {
            "risk_level": current_risk_level,
            "flood_probability": flood_probability,
            "total_users": len(users),
            "alerts_sent": alerts_sent,
            "failed_alerts": failed_alerts,
            "timestamp": datetime.now().isoformat()
        }

# Global instance
alert_manager = AlertManager()

# Test function to manually trigger alerts
async def test_flood_alert():
    """Test function to simulate a flood alert"""
    print("\n🧪 Testing Flood Alert System...")
    
    # Get all registered users
    users = alert_manager.db.get_all_users()
    print(f"📊 Found {len(users)} registered users")
    
    if len(users) == 0:
        print("❌ No users registered! Please register first.")
        return
    
    # Clear previous alert timestamps for testing
    print("🔄 Clearing previous alert timestamps for testing...")
    for user in users:
        alert_manager.db.update_last_alert_sent(user['id'], None)
    
    # Simulate HIGH risk flood condition
    print("🚨 Simulating HIGH flood risk condition...")
    test_result = await alert_manager.send_flood_alerts('HIGH', 0.85)
    
    print(f"\n✅ Test completed:")
    print(f"   - Risk Level: {test_result['risk_level']}")
    print(f"   - Users Notified: {test_result['alerts_sent']}")
    print(f"   - Failed Alerts: {test_result['failed_alerts']}")
    print(f"   - Total Users: {test_result['total_users']}")
    
    return test_result

def clear_user_alerts():
    """Clear all user alert timestamps for testing"""
    users = alert_manager.db.get_all_users()
    for user in users:
        alert_manager.db.update_last_alert_sent(user['id'], None)
    print(f"🔄 Cleared alert timestamps for {len(users)} users")

def sync_test_flood_alert():
    """Synchronous wrapper for the async test function"""
    return asyncio.run(test_flood_alert())

if __name__ == "__main__":
    # Run test if executed directly
    sync_test_flood_alert()