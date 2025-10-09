# Twilio Configuration Template
# Copy this file to twilio_config.py and add your credentials

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# FROM YOUR TWILIO CONSOLE:
# 1. Go to https://console.twilio.com/
# 2. Get your Account SID and Auth Token
# 3. Get your Twilio phone number
# 4. Add them to your .env file

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # Your Account SID (starts with "AC...")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")    # Your Auth Token
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # Your Twilio phone number (e.g., "+1234567890")

# Set to False to send real SMS, True for demo mode
DEMO_MODE = os.getenv("DEMO_MODE", "False").lower() == "true"

# Validation
if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    print("⚠️  Warning: Twilio credentials not found in environment variables!")
    print("   Please create a .env file with:")
    print("   TWILIO_ACCOUNT_SID=your_account_sid")
    print("   TWILIO_AUTH_TOKEN=your_auth_token") 
    print("   TWILIO_PHONE_NUMBER=your_phone_number")
    print("   DEMO_MODE=False")