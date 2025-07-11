#!/usr/bin/env python3
"""
Migration script to add creator_id to existing match nights
"""

from extensions import db
from app import app
from models import User, MatchNight

def migrate_creator_id():
    """Add creator_id to existing match nights"""
    with app.app_context():
        print("Starting migration to add creator_id to existing match nights...")
        
        # Get all match nights without creator_id
        match_nights = MatchNight.query.filter_by(creator_id=None).all()
        
        if not match_nights:
            print("✅ No match nights found without creator_id")
            return True
        
        print(f"Found {len(match_nights)} match nights without creator_id")
        
        # Get the first user as default creator (or create one if none exist)
        default_user = User.query.first()
        if not default_user:
            print("❌ No users found in database. Please create a user first.")
            return False
        
        print(f"Using user '{default_user.name}' as default creator")
        
        try:
            # Update all match nights without creator_id
            for match_night in match_nights:
                match_night.creator_id = default_user.id
                print(f"Updated match night {match_night.id} (date: {match_night.date})")
            
            db.session.commit()
            print("✅ Successfully migrated all match nights!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            return False

if __name__ == "__main__":
    print("🏓 Match Night Creator ID Migration")
    print("=" * 40)
    
    success = migrate_creator_id()
    
    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n❌ Migration failed!") 