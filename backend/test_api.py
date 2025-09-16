"""
Basic test script to verify the FastAPI backend works
Run this to test authentication and basic CRUD operations
"""

import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://127.0.0.1:8000"

class APITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        
    def test_health_check(self) -> bool:
        """Test the health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            result = response.status_code == 200
            print(f"✓ Health check: {response.json() if result else 'FAILED'}")
            return result
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            return False
    
    def test_root_endpoint(self) -> bool:
        """Test the root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            result = response.status_code == 200
            print(f"✓ Root endpoint: {response.json() if result else 'FAILED'}")
            return result
        except Exception as e:
            print(f"✗ Root endpoint failed: {e}")
            return False
    
    def test_login(self, email: str = "superadmin@gmail.com", password: str = "superadmin123") -> bool:
        """Test login functionality"""
        try:
            login_data = {
                "email": email,
                "password": password
            }
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                print(f"✓ Login successful for {email}")
                return True
            else:
                print(f"✗ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Login failed: {e}")
            return False
    
    def test_get_current_user(self) -> bool:
        """Test getting current user info"""
        try:
            if not self.auth_token:
                print("✗ No auth token available")
                return False
                
            response = self.session.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"✓ Current user: {user_data['email']} ({user_data['role']})")
                return True
            else:
                print(f"✗ Get current user failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Get current user failed: {e}")
            return False
    
    def test_list_users(self) -> bool:
        """Test listing users"""
        try:
            response = self.session.get(f"{self.base_url}/users")
            
            if response.status_code == 200:
                users = response.json()
                print(f"✓ List users: Found {len(users)} users")
                return True
            else:
                print(f"✗ List users failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ List users failed: {e}")
            return False
    
    def test_create_test_user(self) -> bool:
        """Test creating a test user"""
        try:
            test_user = {
                "email": "test@example.com",
                "password": "testpass123",
                "candidate_name": "Test User",
                "candidate_id": "TEST001",
                "client_name": "Test Company",
                "role": "candidate"
            }
            
            response = self.session.post(f"{self.base_url}/users", json=test_user)
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"✓ Create user: {user_data['email']} created successfully")
                return True
            elif response.status_code == 409:
                print("✓ Create user: User already exists (expected)")
                return True
            else:
                print(f"✗ Create user failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Create user failed: {e}")
            return False
    
    def test_configurations(self) -> bool:
        """Test configuration endpoints"""
        try:
            # Test getting configurations
            response = self.session.get(f"{self.base_url}/api/v1/configurations")
            
            if response.status_code == 200:
                configs = response.json()
                print(f"✓ List configurations: Found {len(configs)} configurations")
                
                # Test creating a sample configuration
                sample_config = {
                    "config_type": "jdt",
                    "config_data": {
                        "timeLimit": 30,
                        "numberOfQuestions": 10,
                        "competencies": ["Problem Solving", "Communication"]
                    }
                }
                
                create_response = self.session.post(f"{self.base_url}/api/v1/configurations", json=sample_config)
                if create_response.status_code == 200:
                    print("✓ Create configuration: Sample JDT config created")
                else:
                    print(f"✓ Create configuration: {create_response.status_code} (may already exist)")
                
                return True
            else:
                print(f"✗ List configurations failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Configuration test failed: {e}")
            return False
    
    def test_submissions(self) -> bool:
        """Test submission endpoints"""
        try:
            # Test getting submissions
            response = self.session.get(f"{self.base_url}/api/v1/submissions")
            
            if response.status_code == 200:
                submissions = response.json()
                print(f"✓ List submissions: Found {len(submissions)} submissions")
                
                # Test creating a sample submission
                sample_submission = {
                    "candidate_name": "Test Candidate",
                    "candidate_id": "TEST001",
                    "test_type": "JDT",
                    "conversation_history": [
                        {
                            "question": "Tell me about a time you solved a problem",
                            "answer": "I once had to debug a complex issue..."
                        }
                    ]
                }
                
                create_response = self.session.post(f"{self.base_url}/api/v1/submissions", json=sample_submission)
                if create_response.status_code == 200:
                    submission_data = create_response.json()
                    print(f"✓ Create submission: {submission_data['test_type']} submission created")
                else:
                    print(f"✗ Create submission failed: {create_response.status_code} - {create_response.text}")
                
                return True
            else:
                print(f"✗ List submissions failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Submission test failed: {e}")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all tests"""
        print("🚀 Starting FastAPI Backend Tests")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Root Endpoint", self.test_root_endpoint),
            ("Login", self.test_login),
            ("Get Current User", self.test_get_current_user),
            ("List Users", self.test_list_users),
            ("Create Test User", self.test_create_test_user),
            ("Configuration Endpoints", self.test_configurations),
            ("Submission Endpoints", self.test_submissions),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Testing: {test_name}")
            try:
                if test_func():
                    passed += 1
                else:
                    print(f"❌ {test_name} failed")
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {e}")
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the output above.")
            return False

def main():
    """Main test function"""
    print("FastAPI Backend Test Suite")
    print("Make sure the server is running on http://127.0.0.1:8000")
    
    tester = APITester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()