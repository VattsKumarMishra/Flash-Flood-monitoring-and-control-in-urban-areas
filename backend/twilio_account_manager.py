"""
Twilio Account Management Helper
Provides guidance and tools for managing Twilio trial vs paid accounts
"""

import logging
from twilio.rest import Client
from twilio_config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEMO_MODE

logger = logging.getLogger(__name__)

class TwilioAccountManager:
    def __init__(self):
        if not DEMO_MODE:
            self.client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        else:
            self.client = None
    
    def check_account_type(self):
        """Check if account is trial or paid"""
        if DEMO_MODE or not self.client:
            return "demo"
        
        try:
            account = self.client.api.accounts(TWILIO_ACCOUNT_SID).fetch()
            return "trial" if account.type == "Trial" else "paid"
        except Exception as e:
            logger.error(f"Error checking account type: {e}")
            return "unknown"
    
    def get_verified_numbers(self):
        """Get list of verified phone numbers (for trial accounts)"""
        if DEMO_MODE or not self.client:
            return []
        
        try:
            # For trial accounts, get verified caller IDs
            verified_numbers = []
            outgoing_caller_ids = self.client.outgoing_caller_ids.list()
            
            for caller_id in outgoing_caller_ids:
                verified_numbers.append({
                    'phone_number': caller_id.phone_number,
                    'friendly_name': caller_id.friendly_name
                })
            
            return verified_numbers
        except Exception as e:
            logger.error(f"Error getting verified numbers: {e}")
            return []
    
    def send_verification_code(self, phone_number):
        """Send verification code to a phone number"""
        if DEMO_MODE or not self.client:
            logger.info(f"Demo mode: Would send verification to {phone_number}")
            return True
        
        try:
            # For trial accounts, you need to use Twilio Verify service
            # This is a simplified version - you'd need to set up Verify service
            verification = self.client.verify.services.create(
                friendly_name="Flood Alert Verification"
            )
            
            verification_check = self.client.verify \
                .services(verification.sid) \
                .verifications \
                .create(to=phone_number, channel='sms')
            
            return verification_check.status == 'pending'
        except Exception as e:
            logger.error(f"Error sending verification: {e}")
            return False
    
    def get_account_info(self):
        """Get account information and recommendations"""
        account_type = self.check_account_type()
        
        info = {
            "account_type": account_type,
            "can_send_to_anyone": account_type == "paid",
            "verified_numbers": self.get_verified_numbers() if account_type == "trial" else [],
            "recommendations": []
        }
        
        if account_type == "trial":
            info["recommendations"] = [
                "Trial account detected - can only send to verified numbers",
                "To send alerts to anyone, upgrade to a paid account",
                "Cost: ~$0.0075 per SMS (very affordable)",
                "Upgrade at: https://console.twilio.com/billing"
            ]
        elif account_type == "paid":
            info["recommendations"] = [
                "Paid account detected - can send to any phone number",
                "No verification required for new numbers"
            ]
        else:
            info["recommendations"] = [
                "Unable to determine account type",
                "Check your Twilio configuration"
            ]
        
        return info

# Global instance
twilio_manager = TwilioAccountManager()

def print_account_status():
    """Print current account status and recommendations"""
    info = twilio_manager.get_account_info()
    
    print("\n" + "="*60)
    print("🏦 TWILIO ACCOUNT STATUS")
    print("="*60)
    print(f"Account Type: {info['account_type'].upper()}")
    print(f"Can send to anyone: {'✅ YES' if info['can_send_to_anyone'] else '❌ NO'}")
    
    if info['verified_numbers']:
        print(f"\nVerified Numbers ({len(info['verified_numbers'])}):")
        for num in info['verified_numbers']:
            print(f"  📱 {num['phone_number']} - {num['friendly_name']}")
    
    print("\n📋 RECOMMENDATIONS:")
    for rec in info['recommendations']:
        print(f"  • {rec}")
    
    print("="*60)

if __name__ == "__main__":
    print_account_status()