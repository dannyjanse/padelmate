#!/usr/bin/env python3
"""
Database initialization script for PadelMate
Run this script to create all database tables
"""

from extensions import db
from app import app
from models import User, MatchNight, Participation, Match, MatchResult

def init_database():
    """Initialize the database with all tables"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Check if tables were created
        try:
            tables = db.engine.table_names()
            print(f"📊 Created tables: {tables}")
        except Exception as e:
            print(f"⚠️ Could not list tables: {e}")
        
        # Test database connection
        try:
            db.session.execute("SELECT 1")
            print("✅ Database connection successful!")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
        
        return True

if __name__ == "__main__":
    print("🏓 PadelMate Database Initialization")
    print("=" * 40)
    
    success = init_database()
    
    if success:
        print("\n🎉 Database setup completed successfully!")
        print("You can now use the PadelMate API!")
    else:
        print("\n❌ Database setup failed!")
        print("Please check your database configuration.") 