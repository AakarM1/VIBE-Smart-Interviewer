#!/usr/bin/env python3
"""
Create minimal SJT and JDT configurations for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models import Configuration, User
from sqlalchemy.orm import Session
import uuid
import json

def create_minimal_sjt_config(db: Session, admin_user: User):
    """Create a minimal SJT configuration"""
    sjt_config = {
        "scenarios": [
            {
                "id": "scenario1",
                "situation": "You are working on a team project with a tight deadline. A colleague is consistently missing meetings and not completing their assigned tasks on time. What would you do?",
                "options": [
                    {
                        "id": "A",
                        "text": "Speak directly with the colleague about their attendance and work quality"
                    },
                    {
                        "id": "B", 
                        "text": "Immediately report the issue to your supervisor"
                    },
                    {
                        "id": "C",
                        "text": "Take on their tasks yourself to ensure the project is completed"
                    },
                    {
                        "id": "D",
                        "text": "Wait and see if they improve without intervention"
                    }
                ],
                "competency": "Communication",
                "bestResponse": "A",
                "worstResponse": "D",
                "bestReason": "Direct communication is professional and gives the colleague a chance to improve",
                "worstReason": "Waiting without action could jeopardize the project and team dynamics"
            }
        ],
        "settings": {
            "numberOfQuestions": 1,
            "timeLimit": 30,
            "instructions": "Choose the response that best represents what you would actually do in each situation."
        }
    }
    
    # Check if SJT config already exists
    existing = db.query(Configuration).filter(
        Configuration.config_type == 'sjt',
        Configuration.is_active == True
    ).first()
    
    if existing:
        print("✅ SJT configuration already exists")
        return existing
    
    config = Configuration(
        id=str(uuid.uuid4()),
        config_type='sjt',
        config_data=sjt_config,
        created_by=admin_user.id,
        tenant_id=admin_user.tenant_id,
        scope='system',
        version=1,
        is_active=True
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    print("✅ Created minimal SJT configuration")
    return config

def create_minimal_jdt_config(db: Session, admin_user: User):
    """Create a minimal JDT configuration"""
    jdt_config = {
        "roles": [
            {
                "id": "role1",
                "roleName": "Software Engineer",
                "jobDescription": "Develop and maintain software applications using modern technologies.",
                "questions": [
                    {
                        "id": "q1",
                        "text": "Describe your experience with software development methodologies.",
                        "preferredAnswer": "Candidate should mention specific methodologies like Agile, Scrum, or Waterfall and provide examples of how they've used them.",
                        "competency": "Technical Knowledge"
                    }
                ]
            }
        ],
        "settings": {
            "numberOfQuestions": 1,
            "aiGeneratedQuestions": 0,
            "timeLimit": 30,
            "instructions": "Answer questions based on the job description provided."
        }
    }
    
    # Check if JDT config already exists
    existing = db.query(Configuration).filter(
        Configuration.config_type == 'jdt',
        Configuration.is_active == True
    ).first()
    
    if existing:
        print("✅ JDT configuration already exists")
        return existing
    
    config = Configuration(
        id=str(uuid.uuid4()),
        config_type='jdt', 
        config_data=jdt_config,
        created_by=admin_user.id,
        tenant_id=admin_user.tenant_id,
        scope='system',
        version=1,
        is_active=True
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    print("✅ Created minimal JDT configuration")
    return config

def main():
    print("🔧 Creating minimal test configurations...")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Get or create admin user
        admin_user = db.query(User).filter(User.role == 'admin').first()
        if not admin_user:
            admin_user = db.query(User).filter(User.role == 'superadmin').first()
        
        if not admin_user:
            print("❌ No admin or superadmin user found. Please create an admin user first.")
            return
        
        print(f"📝 Using admin user: {admin_user.email}")
        
        # Create configurations
        sjt_config = create_minimal_sjt_config(db, admin_user)
        jdt_config = create_minimal_jdt_config(db, admin_user)
        
        print("\n✅ Test configurations created successfully!")
        print("📝 You can now:")
        print("1. Assign tests to users via the admin panel")
        print("2. Users should see assigned tests on their dashboard")
        print("3. Tests should be marked as 'configured' and 'can_start' if assigned")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()