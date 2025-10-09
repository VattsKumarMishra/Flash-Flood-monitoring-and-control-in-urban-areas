"""
Phone Verification System with OTP
Sends verification codes via SMS for phone number verification
"""

from twilio.rest import Client
from twilio_config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
import logging
import random
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class OTPVerificationService:
    def __init__(self):
        self.client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        self.db_path = "verification_otps.db"
        self.init_database()
        
    def init_database(self):
        """Initialize database for storing OTP verification data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified BOOLEAN DEFAULT 0,
                expires_at TIMESTAMP NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def generate_otp(self) -> str:
        """Generate a 6-digit OTP"""
        return str(random.randint(100000, 999999))
    
    def send_verification_otp(self, phone_number: str) -> Dict[str, any]:
        """Send OTP verification code to phone number"""
        try:
            # Generate OTP
            otp_code = self.generate_otp()
            
            # Create OTP message
            message = f"Your Flood Alert verification code is: {otp_code}. Valid for 10 minutes. Do not share this code."
            
            # Send SMS
            message_obj = self.client.messages.create(
                body=message,
                from_="+12293638233",  # Your Twilio number
                to=phone_number
            )
            
            # Store OTP in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Remove any existing OTPs for this number
            cursor.execute('DELETE FROM verification_otps WHERE phone_number = ?', (phone_number,))
            
            # Insert new OTP
            expires_at = datetime.now() + timedelta(minutes=10)
            cursor.execute('''
                INSERT INTO verification_otps (phone_number, otp_code, expires_at)
                VALUES (?, ?, ?)
            ''', (phone_number, otp_code, expires_at.isoformat()))
            
            conn.commit()
            conn.close()
            
            logger.info(f"📱 OTP sent to {phone_number}: {message_obj.sid}")
            
            return {
                "success": True,
                "message": "OTP sent successfully",
                "message_sid": message_obj.sid
            }
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"❌ Failed to send OTP to {phone_number}: {error_message}")
            
            # Handle Twilio trial account limitation
            if "21608" in error_message or "unverified" in error_message.lower():
                return {
                    "success": False,
                    "error_code": "TRIAL_ACCOUNT_LIMITATION",
                    "error": "Trial account can only send to verified numbers",
                    "message": f"To receive OTP, please verify {phone_number} at twilio.com/console/phone-numbers/verified first, or we can register you without SMS verification.",
                    "verification_url": "https://www.twilio.com/console/phone-numbers/verified",
                    "alternative": "register_without_otp"
                }
            
            return {
                "success": False,
                "message": f"Failed to send OTP: {error_message}"
            }
    
    def verify_otp(self, phone_number: str, otp_code: str) -> Dict[str, any]:
        """Verify the OTP code"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Find the OTP
            cursor.execute('''
                SELECT otp_code, expires_at, verified 
                FROM verification_otps 
                WHERE phone_number = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            ''', (phone_number,))
            
            result = cursor.fetchone()
            
            if not result:
                return {
                    "success": False,
                    "message": "No OTP found for this phone number"
                }
            
            stored_otp, expires_at, verified = result
            
            # Check if already verified
            if verified:
                return {
                    "success": False,
                    "message": "OTP already used"
                }
            
            # Check if expired
            if datetime.now() > datetime.fromisoformat(expires_at):
                return {
                    "success": False,
                    "message": "OTP has expired"
                }
            
            # Check if OTP matches
            if stored_otp != otp_code:
                return {
                    "success": False,
                    "message": "Invalid OTP code"
                }
            
            # Mark as verified
            cursor.execute('''
                UPDATE verification_otps 
                SET verified = 1 
                WHERE phone_number = ? AND otp_code = ?
            ''', (phone_number, otp_code))
            
            conn.commit()
            
            logger.info(f"✅ Phone number verified: {phone_number}")
            
            return {
                "success": True,
                "message": "Phone number verified successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Error verifying OTP: {str(e)}")
            return {
                "success": False,
                "message": f"Verification failed: {str(e)}"
            }
        finally:
            conn.close()
    
    def is_phone_verified(self, phone_number: str) -> bool:
        """Check if phone number is verified"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT verified 
            FROM verification_otps 
            WHERE phone_number = ? AND verified = 1
            ORDER BY created_at DESC 
            LIMIT 1
        ''', (phone_number,))
        
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    
    def register_without_otp(self, phone_number: str) -> Dict[str, any]:
        """Register user without OTP verification (for trial accounts)"""
        try:
            # Mark as manually verified for trial account
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create a mock verification entry
            cursor.execute('''
                INSERT OR REPLACE INTO verification_otps 
                (phone_number, otp_code, expires_at, verified) 
                VALUES (?, ?, ?, ?)
            ''', (phone_number, "TRIAL", datetime.now().isoformat(), True))
            
            conn.commit()
            conn.close()
            
            logger.info(f"📋 Trial account: {phone_number} registered without OTP")
            
            return {
                "success": True,
                "message": "Phone number registered for trial account (SMS limited to verified numbers)",
                "trial_mode": True
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to register {phone_number} without OTP: {str(e)}")
            return {
                "success": False,
                "message": f"Registration failed: {str(e)}"
            }

# Global instance
otp_service = OTPVerificationService()