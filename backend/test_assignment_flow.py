#!/usr/bin/env python3
"""
Test Assignment Flow - Manual Test Script
Tests the complete assignment workflow:
1. Admin login
2. Create candidate user
3. Assign tests to candidate
4. Check candidate availability
5. Candidate login and test visibility
"""

import requests
import json
import time
from typing import Dict, Any, Optional

BASE_URL = "http://127.0.0.1:8000"

def login(email: str, password: str) -> Optional[str]:
    """Login and return access token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Logged in as {email}")
        return data.get("access_token")
    else:
        print(f"❌ Login failed for {email}: {response.status_code} - {response.text}")
        return None

def create_user(token: str, user_data: Dict[str, Any]) -> Optional[str]:
    """Create a candidate user and return user ID"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Created user: {data['email']} (ID: {data['id']})")
        return data["id"]
    elif response.status_code == 409:
        # User already exists, get the user ID
        response = requests.get(f"{BASE_URL}/users/by-email/{user_data['email']}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User already exists: {data['email']} (ID: {data['id']})")
            return data["id"]
        else:
            print(f"❌ Failed to get existing user: {response.status_code} - {response.text}")
            return None
    else:
        print(f"❌ Failed to create user: {response.status_code} - {response.text}")
        return None

def assign_tests(token: str, user_ids: list, test_types: list) -> bool:
    """Assign tests to users"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/api/v1/assignments/tests/bulk", json={
        "user_ids": user_ids,
        "test_types": test_types,
        "max_attempts": 3,
        "notes": "Test assignment via API"
    }, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Assigned {len(test_types)} tests to {len(user_ids)} users: {len(data)} assignments created")
        return True
    else:
        print(f"❌ Failed to assign tests: {response.status_code} - {response.text}")
        return False

def check_test_availability(token: str, test_type: str) -> Dict[str, Any]:
    """Check test availability for current user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/tests/availability?test_type={test_type}", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ {test_type} availability: assigned={data.get('assigned')}, configured={data.get('configured')}, can_start={data.get('can_start')}")
        return data
    else:
        print(f"❌ Failed to check {test_type} availability: {response.status_code} - {response.text}")
        return {}

def main():
    print("🧪 Testing Assignment Flow")
    print("=" * 50)
    
    # Step 1: Admin login
    print("\n1️⃣ Admin Login")
    admin_token = login("admin@gmail.com", "admin@123")
    if not admin_token:
        return
    
    # Step 2: Create test candidate
    print("\n2️⃣ Create Test Candidate")
    candidate_data = {
        "email": "testcandidate@example.com",
        "password": "password123",
        "candidate_name": "Test Candidate",
        "candidate_id": "TC001",
        "client_name": "Test Company",
        "role": "candidate",
        "preferred_language": "en",
        "language_code": "en"
    }
    
    candidate_id = create_user(admin_token, candidate_data)
    if not candidate_id:
        return
    
    # Step 3: Assign tests to candidate
    print("\n3️⃣ Assign Tests to Candidate")
    assignment_success = assign_tests(admin_token, [candidate_id], ["SJT", "JDT"])
    if not assignment_success:
        return
    
    # Step 4: Candidate login
    print("\n4️⃣ Candidate Login")
    candidate_token = login("testcandidate@example.com", "password123")
    if not candidate_token:
        return
    
    # Step 5: Check test availability for candidate
    print("\n5️⃣ Check Test Availability for Candidate")
    sjt_availability = check_test_availability(candidate_token, "SJT")
    jdt_availability = check_test_availability(candidate_token, "JDT")
    
    # Summary
    print("\n📊 Test Summary")
    print("=" * 50)
    print(f"SJT - Assigned: {sjt_availability.get('assigned', False)}, Can Start: {sjt_availability.get('can_start', False)}")
    print(f"JDT - Assigned: {jdt_availability.get('assigned', False)}, Can Start: {jdt_availability.get('can_start', False)}")
    
    if sjt_availability.get('assigned') and jdt_availability.get('assigned'):
        print("✅ Assignment flow working correctly!")
    else:
        print("❌ Assignment flow has issues")
        
    # Check if tests are configured
    if not sjt_availability.get('configured'):
        print("⚠️  SJT is not configured - admin needs to configure SJT scenarios")
    if not jdt_availability.get('configured'):
        print("⚠️  JDT is not configured - admin needs to configure JDT roles and questions")

if __name__ == "__main__":
    main()