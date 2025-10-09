"""
Simple SMS Test Script
"""
import os
import logging
from twilio.rest import Client
from twilio_config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_simple_test_sms():
    """Send a simple test SMS"""
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    # Very short test message for trial account
    message = "Flood Alert Test: HIGH risk detected. Move to safety! Emergency: 100"
    to_phone = "+918004998767"
    
    print(f"📏 Message length: {len(message)} characters")
    print(f"📱 Message content: {message}")
    
    try:
        message_obj = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        
        print(f"✅ Test SMS sent successfully!")
        print(f"   - Message SID: {message_obj.sid}")
        print(f"   - Status: {message_obj.status}")
        print(f"   - To: {to_phone}")
        print(f"   - From: {TWILIO_PHONE_NUMBER}")
        
        return message_obj.sid
        
    except Exception as e:
        print(f"❌ SMS failed: {str(e)}")
        return None

if __name__ == "__main__":
    send_simple_test_sms()