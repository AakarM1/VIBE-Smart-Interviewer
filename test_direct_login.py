import requests
import json

def test_login_direct():
    url = "http://localhost:8000/auth/login"
    
    # Test credentials
    credentials = {
        "email": "superadmin@gmail.com",
        "password": "superadmin123"
    }
    
    try:
        print("Testing direct API login...")
        print(f"URL: {url}")
        print(f"Credentials: {credentials}")
        
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=credentials,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"User: {data.get('user', {})}")
            print(f"Access Token: {data.get('access_token', '')[:50]}...")
        else:
            print("❌ Login failed!")
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_login_direct()