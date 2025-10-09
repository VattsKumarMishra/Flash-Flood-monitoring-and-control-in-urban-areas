"""
Quick test script to check available Gemini models
"""
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

print("Available Gemini models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"- {model.name}")

# Test a simple request
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, this is a test.")
    print(f"\nTest successful! Response: {response.text[:100]}...")
except Exception as e:
    print(f"\nError with gemini-1.5-flash: {e}")
    
    # Try alternative model
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content("Hello, this is a test.")
        print(f"gemini-1.5-pro works! Response: {response.text[:100]}...")
    except Exception as e2:
        print(f"Error with gemini-1.5-pro: {e2}")