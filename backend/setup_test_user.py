#!/usr/bin/env python3
"""
Complete test flow: Create user, assign tests, check availability
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models import User, TestAssignment, Tenant
from app.auth import get_password_hash
from sqlalchemy.orm import Session
import uuid

def create_test_user(db: Session) -> User:
    """Create a test candidate user"""
    # Check if user already exists
    existing = db.query(User).filter(User.email == 'testuser@example.com').first()
    if existing:
        print(f"✅ Test user already exists: {existing.email}")
        return existing
    
    # Get system tenant
    system_tenant = db.query(Tenant).filter(Tenant.name == "System").first()
    if not system_tenant:
        print("❌ System tenant not found")
        return None
    
    user = User(
        id=str(uuid.uuid4()),
        email='testuser@example.com',
        password_hash=get_password_hash('password123'),
        candidate_name='Test User',
        candidate_id='TU001',
        client_name='Test Company',
        role='candidate',
        preferred_language='en',
        language_code='en',
        tenant_id=system_tenant.id
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✅ Created test user: {user.email}")
    return user

def assign_tests_to_user(db: Session, user: User, admin: User):
    """Assign SJT and JDT tests to user"""
    test_types = ['SJT', 'JDT']
    
    for test_type in test_types:
        # Check if assignment already exists
        existing = db.query(TestAssignment).filter(
            TestAssignment.user_id == user.id,
            TestAssignment.test_type == test_type
        ).first()
        
        if existing:
            print(f"✅ {test_type} assignment already exists for {user.email}")
            continue
        
        assignment = TestAssignment(
            id=str(uuid.uuid4()),
            user_id=user.id,
            admin_id=admin.id,
            tenant_id=user.tenant_id,
            test_type=test_type,
            status='assigned',
            max_attempts=3,
            notes=f'Test assignment for {test_type}'
        )
        
        db.add(assignment)
        print(f"✅ Created {test_type} assignment for {user.email}")
    
    db.commit()

def main():
    print("🧪 Setting up complete test flow...")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Get admin user
        admin_user = db.query(User).filter(User.email == 'admin@gmail.com').first()
        if not admin_user:
            print("❌ Admin user not found. Please create admin user first.")
            return
        
        print(f"📝 Using admin user: {admin_user.email}")
        
        # Create test user
        test_user = create_test_user(db)
        if not test_user:
            return
        
        # Assign tests
        assign_tests_to_user(db, test_user, admin_user)
        
        # Check assignments
        assignments = db.query(TestAssignment).filter(
            TestAssignment.user_id == test_user.id
        ).all()
        
        print(f"\n📊 Test Summary:")
        print(f"User: {test_user.email} (ID: {test_user.id})")
        print(f"Assignments: {len(assignments)}")
        for assignment in assignments:
            print(f"  - {assignment.test_type}: {assignment.status} (max_attempts: {assignment.max_attempts})")
        
        print("\n✅ Complete test flow setup successful!")
        print("🔍 Now test the frontend:")
        print("1. Login as testuser@example.com / password123")
        print("2. Check if SJT and JDT tests appear on dashboard")
        print("3. Tests should show as 'can_start: true' in availability check")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()