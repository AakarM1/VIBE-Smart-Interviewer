#!/usr/bin/env python3
"""
Simple script to test the login API functionality
"""
import requests
import json

def test_login():
    # Test data
    login_url = "http://localhost:8000/auth/login"
    test_credentials = [
        {"email": "superadmin@gmail.com", "password": "superadmin123"},
        {"email": "admin@gmail.com", "password": "admin123"}
    ]
    
    print("Testing Trajectorie Login API")
    print("=" * 40)
    
    for creds in test_credentials:
        print(f"\nTesting login for: {creds['email']}")
        
        try:
            # First test if server is reachable
            health_response = requests.get("http://localhost:8000/docs", timeout=5)
            print(f"Server health check: {health_response.status_code}")
            
            response = requests.post(
                login_url,
                headers={"Content-Type": "application/json"},
                json=creds,
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Login successful!")
                print(f"User Role: {data.get('user', {}).get('role', 'Unknown')}")
                print(f"Access Token: {data.get('access_token', '')[:50]}...")
            else:
                print("❌ Login failed!")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Connection Error: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 40)
    print("Test completed")

if __name__ == "__main__":
    test_login()

if __name__ == "__main__":
    test_login()