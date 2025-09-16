#!/usr/bin/env python3
"""
Debug script to test authentication directly
"""
import traceback
from app.auth import AuthManager
from app.database import SessionLocal
from app.models import User, UserSession

def test_authentication():
    print("=== Authentication Debug Test ===")
    
    # Test the authenticate_user method directly
    db = SessionLocal()
    auth_manager = AuthManager()
    
    try:
        # First check if user exists
        user = db.query(User).filter(User.email == 'superadmin@gmail.com').first()
        if user:
            print(f"✅ User found: {user.email}, Role: {user.role}")
            print(f"✅ User active: {user.is_active}")
        else:
            print("❌ User not found")
            return
        
        # Test password verification
        print("\n--- Testing Password Verification ---")
        password_ok = auth_manager.verify_password('superadmin123', user.password_hash)
        print(f"Password verification: {password_ok}")
        
        # Test authenticate_user method
        print("\n--- Testing authenticate_user Method ---")
        result = auth_manager.authenticate_user(db, 'superadmin@gmail.com', 'superadmin123')
        
        if result:
            print("✅ Authentication successful!")
            print(f"Result keys: {list(result.keys())}")
            print(f"Token type: {result.get('token_type')}")
            print(f"Access token (first 50 chars): {result.get('access_token', '')[:50]}...")
            if 'user' in result:
                print(f"User role: {result['user'].role}")
                print(f"User email: {result['user'].email}")
        else:
            print("❌ Authentication failed - returned None")
            
    except Exception as e:
        print(f"❌ Error during authentication: {e}")
        traceback.print_exc()
    finally:
        db.close()

def test_user_session_model():
    print("\n=== Testing UserSession Model ===")
    db = SessionLocal()
    try:
        # Check if UserSession table exists and is accessible
        sessions = db.query(UserSession).all()
        print(f"✅ UserSession table accessible, found {len(sessions)} sessions")
    except Exception as e:
        print(f"❌ Error with UserSession table: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_authentication()
    test_user_session_model()