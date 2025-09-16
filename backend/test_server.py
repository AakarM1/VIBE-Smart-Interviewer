#!/usr/bin/env python3
"""
Simple test script to validate the FastAPI server is working
"""

import requests
import time

def test_api():
    """Test basic API endpoints"""
    base_url = "http://127.0.0.1:8000"
    
    print("🚀 Testing Trajectorie FastAPI Backend")
    print("=" * 50)
    
    try:
        # Test root endpoint
        print("1. Testing root endpoint...")
        response = requests.get(f"{base_url}/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
        
        # Test health endpoint
        print("\n2. Testing health endpoint...")
        response = requests.get(f"{base_url}/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
        
        # Test docs endpoint
        print("\n3. Testing docs endpoint...")
        response = requests.get(f"{base_url}/docs")
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
        
        print("\n✅ API Testing Complete!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to the API server.")
        print("   Make sure the server is running on http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_api()