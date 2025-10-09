# Twilio Configuration for SMS Alerts
# Use environment variables for security

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# FROM YOUR TWILIO CONSOLE:
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # Set in .env file
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")    # Set in .env file  
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # Set in .env file (e.g., "+1234567890")

# Set to False to send real SMS, True for demo mode
DEMO_MODE = os.getenv("DEMO_MODE", "False").lower() == "true"

# Validation
if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    print("⚠️  Warning: Twilio credentials not found in environment variables!")
    print("   Please create a .env file with:")
    print("   TWILIO_ACCOUNT_SID=your_account_sid")
    print("   TWILIO_AUTH_TOKEN=your_auth_token") 
    print("   TWILIO_PHONE_NUMBER=your_phone_number")