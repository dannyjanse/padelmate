from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from models import User, MatchNight, Participation, Match, MatchResult
from schedule_generator import create_matches_for_night
from extensions import db
from datetime import datetime
import json

# Blueprints
auth_bp = Blueprint('auth', __name__)
match_nights_bp = Blueprint('match_nights', __name__)
matches_bp = Blueprint('matches', __name__)

# Authentication routes
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('name', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if user already exists by name
    if User.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    # Check if email is provided and if it already exists
    email = data.get('email', '').strip()
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create new user
    user = User(
        name=data['name'],
        email=email if email else None
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(name=data['username']).first()
    
    if user and user.check_password(data['password']):
        login_user(user)
        return jsonify({'message': 'Login successful', 'user': user.to_dict()}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({'user': current_user.to_dict()}), 200

# Match Night routes
@match_nights_bp.route('/', methods=['GET'])
@login_required
def get_match_nights():
    """Get match nights for current user (created by user or user is participating)"""
    try:
        print(f"Current user ID: {current_user.id}")
        print(f"Current user: {current_user.name}")
        
        # Check if creator_id column exists before querying
        with db.engine.connect() as connection:
            columns = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public'
            """)).fetchall()
            
            column_names = [col[0] for col in columns]
            print(f"Match_nights columns: {column_names}")
            
            if 'creator_id' not in column_names:
                print("creator_id column missing, returning empty list")
                return jsonify({'match_nights': []}), 200
        
        # Get match nights created by the user
        created_match_nights = MatchNight.query.filter_by(creator_id=current_user.id).all()
        print(f"Created match nights: {len(created_match_nights)}")
        
        # Get match nights where user is participating
        participations = Participation.query.filter_by(user_id=current_user.id).all()
        participating_match_nights = [p.match_night for p in participations]
        print(f"Participating match nights: {len(participating_match_nights)}")
        
        # Combine and remove duplicates
        all_match_nights = list(set(created_match_nights + participating_match_nights))
        all_match_nights.sort(key=lambda x: x.date, reverse=True)
        print(f"Total match nights: {len(all_match_nights)}")
        
        result = [mn.to_dict() for mn in all_match_nights]
        print(f"Result: {result}")
        
        return jsonify({'match_nights': result}), 200
    except Exception as e:
        import traceback
        print(f"Error in get_match_nights: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@match_nights_bp.route('/', methods=['POST'])
@login_required
def create_match_night():
    """Create a new match night"""
    data = request.get_json()
    
    print(f"Creating match night with data: {data}")
    print(f"Current user ID: {current_user.id}")
    
    if not data or not all(k in data for k in ('date', 'location')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        print(f"Parsed date: {date}")
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Check if creator_id column exists
    with db.engine.connect() as connection:
        columns = connection.execute(db.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'match_nights' AND table_schema = 'public'
        """)).fetchall()
        
        column_names = [col[0] for col in columns]
        print(f"Match_nights columns: {column_names}")
        
        if 'creator_id' not in column_names:
            print("creator_id column missing, cannot create match night")
            return jsonify({'error': 'Database structure error: creator_id column missing'}), 500
    
    match_night = MatchNight(
        date=date,
        location=data['location'],
        num_courts=data.get('num_courts', 1),
        creator_id=current_user.id
    )
    
    print(f"Created match_night object: {match_night}")
    
    try:
        db.session.add(match_night)
        db.session.commit()
        print(f"Match night created successfully with ID: {match_night.id}")
        return jsonify({'message': 'Match night created', 'match_night': match_night.to_dict()}), 201
    except Exception as e:
        import traceback
        print(f"Error creating match night: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': f'Failed to create match night: {str(e)}'}), 500

@match_nights_bp.route('/<int:match_night_id>', methods=['PUT'])
@login_required
def update_match_night(match_night_id):
    """Update a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can update this match night'}), 403
    
    try:
        if 'date' in data:
            date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            match_night.date = date
        
        if 'location' in data:
            match_night.location = data['location']
        
        if 'num_courts' in data:
            match_night.num_courts = data['num_courts']
        
        db.session.commit()
        return jsonify({
            'message': 'Match night updated successfully',
            'match_night': match_night.to_dict()
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update match night'}), 500

@match_nights_bp.route('/<int:match_night_id>', methods=['DELETE'])
@login_required
def delete_match_night(match_night_id):
    """Delete a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can delete this match night'}), 403
    
    try:
        # Delete all related data
        Participation.query.filter_by(match_night_id=match_night_id).delete()
        Match.query.filter_by(match_night_id=match_night_id).delete()
        db.session.delete(match_night)
        db.session.commit()
        
        return jsonify({'message': 'Match night deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete match night'}), 500

@match_nights_bp.route('/<int:match_night_id>', methods=['GET'])
@login_required
def get_match_night(match_night_id):
    """Get specific match night with participants and matches"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator or a participant
    is_creator = match_night.creator_id == current_user.id
    is_participant = Participation.query.filter_by(
        user_id=current_user.id,
        match_night_id=match_night_id
    ).first() is not None
    
    if not is_creator and not is_participant:
        return jsonify({'error': 'Access denied. You are not a participant or creator of this match night'}), 403
    
    # Get participants
    participations = Participation.query.filter_by(match_night_id=match_night_id).all()
    participants = [p.user.to_dict() for p in participations]
    
    # Get matches
    matches = Match.query.filter_by(match_night_id=match_night_id).order_by(Match.round, Match.court).all()
    
    result = match_night.to_dict()
    result['participants'] = participants
    result['matches'] = [m.to_dict() for m in matches]
    
    return jsonify(result), 200

@match_nights_bp.route('/<int:match_night_id>/join', methods=['POST'])
@login_required
def join_match_night(match_night_id):
    """Join a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if already participating
    existing_participation = Participation.query.filter_by(
        user_id=current_user.id,
        match_night_id=match_night_id
    ).first()
    
    if existing_participation:
        return jsonify({'error': 'Already participating in this match night'}), 400
    
    participation = Participation(
        user_id=current_user.id,
        match_night_id=match_night_id
    )
    
    try:
        db.session.add(participation)
        db.session.commit()
        return jsonify({'message': 'Successfully joined match night'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to join match night'}), 500

@match_nights_bp.route('/<int:match_night_id>/leave', methods=['POST'])
@login_required
def leave_match_night(match_night_id):
    """Leave a match night"""
    participation = Participation.query.filter_by(
        user_id=current_user.id,
        match_night_id=match_night_id
    ).first()
    
    if not participation:
        return jsonify({'error': 'Not participating in this match night'}), 400
    
    try:
        db.session.delete(participation)
        db.session.commit()
        return jsonify({'message': 'Successfully left match night'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to leave match night'}), 500

@match_nights_bp.route('/<int:match_night_id>/generate-schedule', methods=['POST'])
@login_required
def generate_schedule(match_night_id):
    """Generate match schedule for a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can generate the schedule'}), 403
    
    # Get all participants
    participations = Participation.query.filter_by(match_night_id=match_night_id).all()
    players = [p.user for p in participations]
    
    if len(players) < 4:
        return jsonify({'error': 'Need at least 4 players to generate schedule'}), 400
    
    if len(players) % 4 != 0:
        return jsonify({'error': 'Number of players must be divisible by 4'}), 400
    
    # Check if schedule already exists
    existing_matches = Match.query.filter_by(match_night_id=match_night_id).first()
    if existing_matches:
        return jsonify({'error': 'Schedule already exists for this match night'}), 400
    
    try:
        # Generate matches
        matches = create_matches_for_night(
            match_night_id=match_night_id,
            players=players,
            num_courts=match_night.num_courts,
            schedule_type=request.json.get('schedule_type') if request.json else None
        )
        
        # Save matches to database
        for match in matches:
            db.session.add(match)
        db.session.commit()
        
        return jsonify({
            'message': 'Schedule generated successfully',
            'matches': [match.to_dict() for match in matches]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to generate schedule: {str(e)}'}), 500

# Match routes
@matches_bp.route('/<int:match_id>/result', methods=['POST'])
@login_required
def submit_match_result(match_id):
    """Submit result for a match"""
    match = Match.query.get_or_404(match_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check if result already exists
    existing_result = MatchResult.query.filter_by(match_id=match_id).first()
    if existing_result:
        return jsonify({'error': 'Result already submitted for this match'}), 400
    
    result = MatchResult(
        match_id=match_id,
        score=data.get('score'),
        winner_ids=data.get('winner_ids', [])
    )
    
    try:
        db.session.add(result)
        db.session.commit()
        return jsonify({'message': 'Result submitted successfully', 'result': result.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to submit result'}), 500

@matches_bp.route('/<int:match_id>/result', methods=['GET'])
@login_required
def get_match_result(match_id):
    """Get result for a match"""
    result = MatchResult.query.filter_by(match_id=match_id).first()
    
    if not result:
        return jsonify({'error': 'No result found for this match'}), 404
    
    return jsonify({'result': result.to_dict()}), 200

# Database initialization endpoint (for development/setup)
@auth_bp.route('/init-db', methods=['POST'])
def init_database():
    """Initialize database tables and create test users (development only)"""
    try:
        # Create all tables
        db.create_all()
        
        # Check if test users already exist
        existing_user = User.query.filter_by(email='test@example.com').first()
        if existing_user:
            return jsonify({
                'message': 'Database already initialized with test users',
                'test_users': [
                    {'email': 'test@example.com', 'password': 'password'},
                    {'email': 'admin@example.com', 'password': 'password'}
                ]
            }), 200
        
        # Create test users
        test_user = User(
            name='Test User',
            email='test@example.com'
        )
        test_user.set_password('password')
        
        admin_user = User(
            name='Admin User',
            email='admin@example.com'
        )
        admin_user.set_password('password')
        
        # Add users to database
        db.session.add(test_user)
        db.session.add(admin_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Database initialized successfully with test users',
            'test_users': [
                {'email': 'test@example.com', 'password': 'password'},
                {'email': 'admin@example.com', 'password': 'password'}
            ]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database initialization failed: {str(e)}'}), 500



# Get all users (for adding participants)
@auth_bp.route('/users', methods=['GET'])
@login_required
def get_all_users():
    """Get all users for adding to match nights"""
    users = User.query.all()
    return jsonify({'users': [user.to_dict() for user in users]}), 200

# Add participant to match night
@match_nights_bp.route('/<int:match_night_id>/add-participant', methods=['POST'])
@login_required
def add_participant(match_night_id):
    """Add a participant to a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    data = request.get_json()
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can add participants'}), 403
    
    user_id = data['user_id']
    
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if already participating
    existing_participation = Participation.query.filter_by(
        user_id=user_id,
        match_night_id=match_night_id
    ).first()
    
    if existing_participation:
        return jsonify({'error': 'User is already participating in this match night'}), 400
    
    participation = Participation(
        user_id=user_id,
        match_night_id=match_night_id
    )
    
    try:
        db.session.add(participation)
        db.session.commit()
        return jsonify({
            'message': f'Successfully added {user.name} to match night',
            'participation': participation.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add participant'}), 500

# Remove participant from match night
@match_nights_bp.route('/<int:match_night_id>/remove-participant', methods=['POST'])
@login_required
def remove_participant(match_night_id):
    """Remove a participant from a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    data = request.get_json()
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can remove participants'}), 403
    
    user_id = data['user_id']
    
    # Find participation
    participation = Participation.query.filter_by(
        user_id=user_id,
        match_night_id=match_night_id
    ).first()
    
    if not participation:
        return jsonify({'error': 'User is not participating in this match night'}), 400
    
    try:
        db.session.delete(participation)
        db.session.commit()
        return jsonify({'message': 'Successfully removed participant from match night'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to remove participant'}), 500

# Test endpoint without authentication
@auth_bp.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint without authentication"""
    return jsonify({
        'message': 'API is working!',
        'status': 'success',
        'endpoints': {
            'health': '/api/health',
            'register': '/api/auth/register',
            'login': '/api/auth/login',
            'init_db': '/api/auth/init-db'
        }
    }), 200

# Test database connection
@auth_bp.route('/test-db', methods=['GET'])
def test_database():
    """Test database connection and basic queries"""
    try:
        print("Testing database connection...")
        
        # Test basic connection using with statement
        with db.engine.connect() as connection:
            result = connection.execute(db.text('SELECT 1'))
            print("Basic connection test passed")
            
            # Test if tables exist
            tables = connection.execute(db.text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)).fetchall()
            
            table_names = [row[0] for row in tables]
            print(f"Found tables: {table_names}")
        
        return jsonify({
            'message': 'Database connection successful',
            'tables': table_names,
            'status': 'success'
        }), 200
    except Exception as e:
        import traceback
        print(f"Database test error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'message': 'Database connection failed',
            'error': str(e),
            'status': 'error'
        }), 500

# Test current user
@auth_bp.route('/test-user', methods=['GET'])
@login_required
def test_current_user():
    """Test current user and their data"""
    try:
        print(f"Testing current user: {current_user.name} (ID: {current_user.id})")
        
        # Test if user exists in database
        user_from_db = User.query.get(current_user.id)
        if not user_from_db:
            raise Exception(f"User {current_user.id} not found in database")
        
        print("User found in database")
        
        # Check if creator_id column exists before querying
        with db.engine.connect() as connection:
            columns = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public'
            """)).fetchall()
            
            column_names = [col[0] for col in columns]
            print(f"Match_nights columns: {column_names}")
            
            if 'creator_id' not in column_names:
                print("creator_id column missing, skipping match nights query")
                created_match_nights = []
            else:
                # Get user's match nights
                created_match_nights = MatchNight.query.filter_by(creator_id=current_user.id).all()
                print(f"Found {len(created_match_nights)} created match nights")
        
        participations = Participation.query.filter_by(user_id=current_user.id).all()
        print(f"Found {len(participations)} participations")
        
        return jsonify({
            'user': current_user.to_dict(),
            'created_match_nights': len(created_match_nights),
            'participations': len(participations),
            'match_nights_columns': column_names,
            'status': 'success'
        }), 200
    except Exception as e:
        import traceback
        print(f"User test error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'message': 'User test failed',
            'error': str(e),
            'status': 'error'
        }), 500

# Simple database check endpoint
@auth_bp.route('/check-db', methods=['GET'])
def check_database():
    """Check if database is working and has users"""
    try:
        user_count = User.query.count()
        
        # Get all users for debugging
        users = User.query.all()
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            'message': 'Database is working',
            'user_count': user_count,
            'users': user_list,
            'status': 'success'
        }), 200
    except Exception as e:
        import traceback
        print(f"Database check error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'message': 'Database error',
            'error': str(e),
            'status': 'error'
        }), 500

# Database tables creation endpoint
@auth_bp.route('/create-tables', methods=['POST'])
def create_tables():
    """Create all database tables"""
    try:
        print("Creating database tables...")
        
        # Drop all tables first to ensure clean slate
        with db.engine.connect() as connection:
            print("Dropping all existing tables...")
            connection.execute(db.text("DROP SCHEMA public CASCADE"))
            connection.execute(db.text("CREATE SCHEMA public"))
            connection.commit()
            print("All tables dropped successfully")
        
        # Create all tables
        db.create_all()
        print("Database tables created successfully!")
        
        # Verify tables were created
        with db.engine.connect() as connection:
            tables = connection.execute(db.text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)).fetchall()
            
            table_names = [row[0] for row in tables]
            print(f"Available tables: {table_names}")
            
            # Check table structure
            for table in table_names:
                columns = connection.execute(db.text(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' AND table_schema = 'public'
                """)).fetchall()
                print(f"Table {table} columns: {[col[0] for col in columns]}")
        
        return jsonify({
            'message': 'Database tables created successfully',
            'tables': table_names,
            'status': 'success'
        }), 200
    except Exception as e:
        import traceback
        print(f"Failed to create tables: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'message': 'Failed to create tables',
            'error': str(e),
            'status': 'error'
        }), 500

# Fix match_nights table specifically
@auth_bp.route('/fix-match-nights', methods=['POST'])
def fix_match_nights_table():
    """Fix the match_nights table structure"""
    try:
        print("Fixing match_nights table...")
        
        with db.engine.connect() as connection:
            # Check if creator_id column exists
            columns = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public'
            """)).fetchall()
            
            column_names = [col[0] for col in columns]
            print(f"Current match_nights columns: {column_names}")
            
            # Try to add missing columns if they don't exist
            if 'creator_id' not in column_names:
                print("Adding creator_id column...")
                try:
                    connection.execute(db.text("ALTER TABLE match_nights ADD COLUMN creator_id INTEGER"))
                    connection.execute(db.text("ALTER TABLE match_nights ADD CONSTRAINT fk_match_nights_creator FOREIGN KEY (creator_id) REFERENCES users(id)"))
                    print("creator_id column added successfully")
                except Exception as e:
                    print(f"Failed to add creator_id column: {str(e)}")
                    # Try alternative approach - recreate table
                    print("Trying to recreate match_nights table...")
                    connection.execute(db.text("DROP TABLE IF EXISTS match_nights CASCADE"))
                    connection.commit()
                    # Let SQLAlchemy recreate the table
                    db.create_all()
                    print("Match_nights table recreated successfully")
            else:
                print("creator_id column already exists")
            
            if 'created_at' not in column_names:
                print("Adding created_at column...")
                try:
                    connection.execute(db.text("ALTER TABLE match_nights ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    print("created_at column added successfully")
                except Exception as e:
                    print(f"Failed to add created_at column: {str(e)}")
            else:
                print("created_at column already exists")
            
            connection.commit()
            print("Match_nights table fixed successfully!")
            
            # Verify the fix
            columns_after = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public'
            """)).fetchall()
            
            column_names_after = [col[0] for col in columns_after]
            print(f"Match_nights columns after fix: {column_names_after}")
        
        return jsonify({
            'message': 'Match_nights table fixed successfully',
            'columns': column_names_after,
            'status': 'success'
        }), 200
    except Exception as e:
        import traceback
        print(f"Failed to fix match_nights table: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'message': 'Failed to fix match_nights table',
            'error': str(e),
            'status': 'error'
        }), 500 

# Add specific users endpoint
@auth_bp.route('/add-users', methods=['POST'])
def add_users():
    """Add the 5 specific users (excl. Danny) als ze nog niet bestaan."""
    try:
        users_to_create = [
            {'name': 'Branko', 'email': 'branko@hotmail.com', 'password': 'Branko123'},
            {'name': 'Tukkie', 'email': 'tukkie@hotmail.com', 'password': 'Tukkie123'},
            {'name': 'Michiel', 'email': 'michiel@hotmail.com', 'password': 'Michiel123'},
            {'name': 'Jeroen', 'email': 'jeroen@hotmail.com', 'password': 'Jeroen123'},
            {'name': 'Joost', 'email': 'joost@hotmail.com', 'password': 'Joost123'}
        ]
        new_users = []
        existing_users = []
        for user_data in users_to_create:
            if User.query.filter_by(email=user_data['email']).first():
                existing_users.append(user_data['email'])
            else:
                user = User(name=user_data['name'], email=user_data['email'])
                user.set_password(user_data['password'])
                db.session.add(user)
                new_users.append(user_data['email'])
        db.session.commit()
        return jsonify({
            'message': f'{len(new_users)} users toegevoegd, {len(existing_users)} bestonden al.',
            'new_users': new_users,
            'existing_users': existing_users
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Failed to add users: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to add users: {str(e)}'}), 500 