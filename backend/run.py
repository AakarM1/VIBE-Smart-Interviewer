#!/usr/bin/env python3
"""
Start script for Trajectorie FastAPI Backend
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_environment():
    """Setup development environment"""
    print("🔧 Setting up development environment...")
    
    # Create uploads directory
    uploads_dir = Path("./uploads")
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "submissions").mkdir(exist_ok=True)
    (uploads_dir / "temp").mkdir(exist_ok=True)
    
    # Check if .env.local exists
    env_file = Path(".env.local")
    if not env_file.exists():
        print("⚠️  .env.local not found. Creating from .env.example...")
        example_file = Path(".env.example")
        if example_file.exists():
            env_file.write_text(example_file.read_text())
            print("✅ Created .env.local from .env.example")
        else:
            print("❌ .env.example not found. Please create .env.local manually.")
            return False
    
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Trajectorie FastAPI Backend...")
    print("📍 Server will be available at: http://127.0.0.1:8000")
    print("📖 API Documentation: http://127.0.0.1:8000/docs")
    print("🔍 Health Check: http://127.0.0.1:8000/health")
    print("\n" + "="*50)
    
    # Load environment variables
    env_file = Path(".env.local")
    if env_file.exists():
        import dotenv
        dotenv.load_dotenv(env_file)
    
    # Start the server
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
        reload_excludes=["uploads/*", "*.db", "*.log"]
    )

def main():
    """Main function"""
    print("Trajectorie Assessment Platform - FastAPI Backend")
    print("=" * 55)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Check if we need to install dependencies
    try:
        import fastapi
        import sqlalchemy
        import jwt
        print("✅ Dependencies are already installed")
    except ImportError:
        if not install_dependencies():
            sys.exit(1)
    
    # Start the server
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()