from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from models import User, MatchNight, Participation, Match, MatchResult, GameSchema, PlayerStats
from schedule_generator import create_matches_for_night
from extensions import db
from datetime import datetime
import json

# Blueprints
auth_bp = Blueprint('auth', __name__)
match_nights_bp = Blueprint('match_nights', __name__)
matches_bp = Blueprint('matches', __name__)
game_schemas_bp = Blueprint('game_schemas', __name__)

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

@auth_bp.route('/quick-login', methods=['POST'])
def quick_login():
    """Quick login that creates a test user if none exist"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Missing username or password'}), 400
    
    # Check if any users exist
    user_count = User.query.count()
    
    if user_count == 0:
        # Create test users if none exist
        test_users = [
            {'name': 'Danny', 'email': 'danny@example.com', 'password': 'password'},
            {'name': 'Branko', 'email': 'branko@example.com', 'password': 'password'},
            {'name': 'Tukkie', 'email': 'tukkie@example.com', 'password': 'password'},
            {'name': 'Michiel', 'email': 'michiel@example.com', 'password': 'password'},
            {'name': 'Jeroen', 'email': 'jeroen@example.com', 'password': 'password'},
            {'name': 'Joost', 'email': 'joost@example.com', 'password': 'password'}
        ]
        
        for user_data in test_users:
            user = User(
                name=user_data['name'],
                email=user_data['email']
            )
            user.set_password(user_data['password'])
            db.session.add(user)
        
        db.session.commit()
        print("Created test users for quick login")
        
        # Create a test match night if none exist
        match_night_count = MatchNight.query.count()
        if match_night_count == 0:
            danny = User.query.filter_by(name='Danny').first()
            if danny:
                test_match_night = MatchNight(
                    date=datetime.now().date(),
                    location='Padelcentrum Amsterdam',
                    num_courts=2,
                    creator_id=danny.id
                )
                db.session.add(test_match_night)
                db.session.commit()
                
                # Add all users as participants
                for user in User.query.all():
                    participation = Participation(
                        user_id=user.id,
                        match_night_id=test_match_night.id
                    )
                    db.session.add(participation)
                
                db.session.commit()
                print(f"Created test match night with ID: {test_match_night.id}")
    
    # Now try to find the user
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
        # Parse date and time together
        if 'time' in data and data['time']:
            # If time is provided, combine with date
            date_time_str = f"{data['date']}T{data['time']}"
            date = datetime.strptime(date_time_str, '%Y-%m-%dT%H:%M')
        else:
            # If no time provided, use default time (e.g., 19:00)
            date_time_str = f"{data['date']}T19:00"
            date = datetime.strptime(date_time_str, '%Y-%m-%dT%H:%M')
        print(f"Parsed date and time: {date}")
    except ValueError:
        return jsonify({'error': 'Invalid date/time format. Use YYYY-MM-DD and HH:MM'}), 400
    
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
            # Parse date and time together
            if 'time' in data and data['time']:
                # If time is provided, combine with date
                date_time_str = f"{data['date']}T{data['time']}"
                date = datetime.strptime(date_time_str, '%Y-%m-%dT%H:%M')
            else:
                # If no time provided, use default time (e.g., 19:00)
                date_time_str = f"{data['date']}T19:00"
                date = datetime.strptime(date_time_str, '%Y-%m-%dT%H:%M')
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
    
    # Get matches with all relationships loaded
    matches = Match.query.filter_by(match_night_id=match_night_id).order_by(Match.round, Match.court).all()
    
    # Load all player relationships for matches
    for match in matches:
        match.player1 = User.query.get(match.player1_id)
        match.player2 = User.query.get(match.player2_id)
        match.player3 = User.query.get(match.player3_id)
        match.player4 = User.query.get(match.player4_id)
    
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
    print(f"Submitting result for match_id: {match_id}")
    match = Match.query.get_or_404(match_id)
    data = request.get_json()
    
    print(f"Received data: {data}")
    
    if not data:
        print("No data provided")
        return jsonify({'error': 'No data provided'}), 400
    
    # Check if result already exists
    existing_result = MatchResult.query.filter_by(match_id=match_id).first()
    if existing_result:
        print(f"Updating existing result for match_id: {match_id}")
        # Update existing result
        existing_result.score = data.get('score')
        existing_result.set_winner_ids(data.get('winner_ids', []))
        try:
            db.session.commit()
            
            # Update player stats after updating result
            update_player_stats_for_match(match_id)
            
            print(f"Result updated successfully for match_id: {match_id}")
            return jsonify({'message': 'Result updated successfully', 'result': existing_result.to_dict()}), 200
        except Exception as e:
            print(f"Error updating result: {str(e)}")
            db.session.rollback()
            return jsonify({'error': f'Failed to update result: {str(e)}'}), 500
    
    result = MatchResult(
        match_id=match_id,
        score=data.get('score'),
        winner_ids=data.get('winner_ids', [])
    )
    
    print(f"Creating result: score={result.score}, winner_ids={result.winner_ids}")
    
    try:
        db.session.add(result)
        db.session.commit()
        
        # Update player stats after submitting result
        update_player_stats_for_match(match_id)
        
        print(f"Result submitted successfully for match_id: {match_id}")
        return jsonify({'message': 'Result submitted successfully', 'result': result.to_dict()}), 201
    except Exception as e:
        print(f"Error submitting result: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Failed to submit result: {str(e)}'}), 500

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

# Reinitialize database with test data
@auth_bp.route('/reinit-db', methods=['POST'])
def reinitialize_database():
    """Reinitialize database with test data after schema changes"""
    try:
        print("Reinitializing database with test data...")
        
        # Create all tables
        db.create_all()
        print("Database tables created successfully!")
        
        # Clear existing data
        db.session.query(MatchResult).delete()
        db.session.query(Match).delete()
        db.session.query(Participation).delete()
        db.session.query(MatchNight).delete()
        db.session.query(User).delete()
        db.session.commit()
        print("Existing data cleared")
        
        # Create test users
        users_data = [
            {'name': 'Danny', 'email': 'danny@example.com', 'password': 'password'},
            {'name': 'Branko', 'email': 'branko@example.com', 'password': 'password'},
            {'name': 'Tukkie', 'email': 'tukkie@example.com', 'password': 'password'},
            {'name': 'Michiel', 'email': 'michiel@example.com', 'password': 'password'},
            {'name': 'Jeroen', 'email': 'jeroen@example.com', 'password': 'password'},
            {'name': 'Joost', 'email': 'joost@example.com', 'password': 'password'}
        ]
        
        created_users = []
        for user_data in users_data:
            user = User(
                name=user_data['name'],
                email=user_data['email']
            )
            user.set_password(user_data['password'])
            db.session.add(user)
            created_users.append(user_data['name'])
        
        db.session.commit()
        print(f"Created {len(created_users)} users: {created_users}")
        
        # Create a test match night
        danny = User.query.filter_by(name='Danny').first()
        if danny:
            test_match_night = MatchNight(
                date=datetime.now().date(),
                location='Padelcentrum Amsterdam',
                num_courts=2,
                creator_id=danny.id
            )
            db.session.add(test_match_night)
            db.session.commit()
            
            # Add all users as participants
            for user in User.query.all():
                participation = Participation(
                    user_id=user.id,
                    match_night_id=test_match_night.id
                )
                db.session.add(participation)
            
            db.session.commit()
            print(f"Created test match night with ID: {test_match_night.id}")
        
        return jsonify({
            'message': 'Database reinitialized successfully',
            'users_created': created_users,
            'test_match_night_created': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Failed to reinitialize database: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to reinitialize database: {str(e)}'}), 500

# Debug endpoint to check database state
@auth_bp.route('/debug-db', methods=['GET'])
def debug_database():
    """Debug endpoint to check database state"""
    try:
        users = User.query.all()
        match_nights = MatchNight.query.all()
        participations = Participation.query.all()
        
        # Try to get matches, but handle missing column error
        try:
            matches = Match.query.all()
            matches_count = len(matches)
        except Exception as e:
            print(f"Matches query failed: {str(e)}")
            matches_count = 0
            matches = []
        
        return jsonify({
            'users_count': len(users),
            'users': [user.to_dict() for user in users],
            'match_nights_count': len(match_nights),
            'match_nights': [mn.to_dict() for mn in match_nights],
            'participations_count': len(participations),
            'matches_count': matches_count
        }), 200
    except Exception as e:
        return jsonify({'error': f'Debug failed: {str(e)}'}), 500

# Fix database schema
@auth_bp.route('/fix-schema', methods=['POST'])
def fix_database_schema():
    """Fix database schema issues"""
    try:
        print("Fixing database schema...")
        
        with db.engine.connect() as connection:
            # Check if game_schema_id column exists in matches table
            columns = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'matches' AND table_schema = 'public'
            """)).fetchall()
            
            column_names = [col[0] for col in columns]
            print(f"Matches table columns: {column_names}")
            
            # Add missing columns if they don't exist
            if 'game_schema_id' not in column_names:
                print("Adding game_schema_id column to matches table...")
                try:
                    connection.execute(db.text("ALTER TABLE matches ADD COLUMN game_schema_id INTEGER"))
                    connection.execute(db.text("ALTER TABLE matches ADD CONSTRAINT fk_matches_game_schema FOREIGN KEY (game_schema_id) REFERENCES game_schemas(id)"))
                    print("game_schema_id column added successfully")
                except Exception as e:
                    print(f"Failed to add game_schema_id column: {str(e)}")
            
            # Check match_nights table columns
            match_nights_columns = connection.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public'
            """)).fetchall()
            
            match_nights_column_names = [col[0] for col in match_nights_columns]
            print(f"Match_nights table columns: {match_nights_column_names}")
            
            # Add game_status column if it doesn't exist
            if 'game_status' not in match_nights_column_names:
                print("Adding game_status column to match_nights table...")
                try:
                    connection.execute(db.text("ALTER TABLE match_nights ADD COLUMN game_status VARCHAR(20) DEFAULT 'not_started'"))
                    print("game_status column added successfully")
                except Exception as e:
                    print(f"Failed to add game_status column: {str(e)}")
            
            # Check if date column is DateTime type
            column_types = connection.execute(db.text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'match_nights' AND table_schema = 'public' AND column_name = 'date'
            """)).fetchall()
            
            if column_types and column_types[0][1] == 'date':
                print("Converting date column to timestamp...")
                try:
                    connection.execute(db.text("ALTER TABLE match_nights ALTER COLUMN date TYPE TIMESTAMP USING date::timestamp"))
                    print("date column converted to timestamp successfully")
                except Exception as e:
                    print(f"Failed to convert date column: {str(e)}")
            
            # Check if game_schemas table exists
            tables = connection.execute(db.text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)).fetchall()
            
            table_names = [table[0] for table in tables]
            print(f"Available tables: {table_names}")
            
            if 'game_schemas' not in table_names:
                print("Creating game_schemas table...")
                # Drop and recreate all tables to ensure proper schema
                connection.execute(db.text("DROP SCHEMA public CASCADE"))
                connection.execute(db.text("CREATE SCHEMA public"))
                connection.commit()
                
                # Let SQLAlchemy recreate all tables
                db.create_all()
                print("All tables recreated successfully")
            
            # Create player_stats table if it doesn't exist
            if 'player_stats' not in table_names:
                print("Creating player_stats table...")
                try:
                    connection.execute(db.text("""
                        CREATE TABLE player_stats (
                            id SERIAL PRIMARY KEY,
                            match_night_id INTEGER NOT NULL REFERENCES match_nights(id),
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            games_won INTEGER DEFAULT 0,
                            games_lost INTEGER DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_player_match_night_stats UNIQUE (match_night_id, user_id)
                        )
                    """))
                    print("player_stats table created successfully")
                except Exception as e:
                    print(f"Failed to create player_stats table: {str(e)}")
            
            connection.commit()
            print("Database schema fixed successfully!")
        
        return jsonify({
            'message': 'Database schema fixed successfully',
            'status': 'success'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Failed to fix database schema: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to fix database schema: {str(e)}'}), 500

# Debug matches for a match night
@match_nights_bp.route('/<int:match_night_id>/debug-matches', methods=['GET'])
@login_required
def debug_matches(match_night_id):
    """Debug endpoint to check matches for a specific match night"""
    try:
        matches = Match.query.filter_by(match_night_id=match_night_id).all()
        
        matches_data = []
        for match in matches:
            match_data = {
                'id': match.id,
                'round': match.round,
                'court': match.court,
                'player1_id': match.player1_id,
                'player2_id': match.player2_id,
                'player3_id': match.player3_id,
                'player4_id': match.player4_id,
                'game_schema_id': match.game_schema_id,
                'created_at': match.created_at.isoformat() if match.created_at else None
            }
            
            # Load player names
            player1 = User.query.get(match.player1_id)
            player2 = User.query.get(match.player2_id)
            player3 = User.query.get(match.player3_id)
            player4 = User.query.get(match.player4_id)
            
            match_data['player1_name'] = player1.name if player1 else 'Unknown'
            match_data['player2_name'] = player2.name if player2 else 'Unknown'
            match_data['player3_name'] = player3.name if player3 else 'Unknown'
            match_data['player4_name'] = player4.name if player4 else 'Unknown'
            
            matches_data.append(match_data)
        
        return jsonify({
            'match_night_id': match_night_id,
            'matches_count': len(matches),
            'matches': matches_data
        }), 200
    except Exception as e:
        return jsonify({'error': f'Debug matches failed: {str(e)}'}), 500

# Clear all matches for a match night
@match_nights_bp.route('/<int:match_night_id>/clear-matches', methods=['POST'])
@login_required
def clear_matches(match_night_id):
    """Clear all matches for a match night"""
    # Get match night
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can clear matches'}), 403
    
    try:
        # First, get all matches for this match night
        matches = Match.query.filter_by(match_night_id=match_night_id).all()
        match_ids = [match.id for match in matches]
        
        # Delete all match results for these matches first
        match_results_deleted = 0
        if match_ids:
            match_results_deleted = MatchResult.query.filter(MatchResult.match_id.in_(match_ids)).delete()
        
        # Now delete all matches for this match night
        matches_deleted = Match.query.filter_by(match_night_id=match_night_id).delete()
        
        # Also delete any game schemas
        game_schemas_deleted = GameSchema.query.filter_by(match_night_id=match_night_id).delete()
        
        db.session.commit()
        
        return jsonify({
            'message': f'Cleared {matches_deleted} matches, {match_results_deleted} match results, and {game_schemas_deleted} game schemas',
            'matches_deleted': matches_deleted,
            'match_results_deleted': match_results_deleted,
            'game_schemas_deleted': game_schemas_deleted
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to clear matches: {str(e)}'}), 500

# Game Schema routes
@game_schemas_bp.route('/<int:match_night_id>/start', methods=['POST'])
@login_required
def start_game(match_night_id):
    """Start a game with a specific game mode"""
    data = request.get_json()
    
    if not data or 'game_mode' not in data:
        return jsonify({'error': 'Game mode is required'}), 400
    
    game_mode = data['game_mode']
    if game_mode not in ['everyone_vs_everyone', 'king_of_the_court']:
        return jsonify({'error': 'Invalid game mode'}), 400
    
    # Get match night
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can start a game'}), 403
    
    # Check if there are enough participants
    participants = Participation.query.filter_by(match_night_id=match_night_id).all()
    if len(participants) < 4:
        return jsonify({'error': 'Need at least 4 participants to start a game'}), 400
    
    # Check if a game is already active
    existing_game = GameSchema.query.filter_by(
        match_night_id=match_night_id,
        status='active'
    ).first()
    
    if existing_game:
        return jsonify({'error': 'A game is already active for this match night'}), 400
    
    try:
        # Create new game schema
        game_schema = GameSchema(
            match_night_id=match_night_id,
            game_mode=game_mode,
            status='active'
        )
        db.session.add(game_schema)
        
        # Update match night game status
        match_night.game_status = 'active'
        
        db.session.commit()
        
        # Generate matches based on game mode
        matches = []
        try:
            if game_mode == 'everyone_vs_everyone':
                print(f"Generating everyone vs everyone matches for {len(participants)} participants")
                matches = generate_everyone_vs_everyone_matches(match_night, game_schema)
            elif game_mode == 'king_of_the_court':
                print(f"Generating king of the court matches for {len(participants)} participants")
                matches = generate_king_of_the_court_matches(match_night, game_schema)
            
            print(f"Successfully created {len(matches)} matches")
        except Exception as e:
            print(f"Error generating matches: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Don't fail the entire request, just log the error
        
        return jsonify({
            'message': f'Game started successfully with mode: {game_mode}',
            'game_schema': game_schema.to_dict(),
            'matches_created': len(matches),
            'participants_count': len(participants)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to start game: {str(e)}'}), 500

@game_schemas_bp.route('/<int:match_night_id>/status', methods=['GET'])
@login_required
def get_game_status(match_night_id):
    """Get the current game status for a match night"""
    game_schema = GameSchema.query.filter_by(
        match_night_id=match_night_id,
        status='active'
    ).first()
    
    if not game_schema:
        return jsonify({'game_active': False}), 200
    
    return jsonify({
        'game_active': True,
        'game_schema': game_schema.to_dict()
    }), 200

@game_schemas_bp.route('/<int:match_night_id>/stop', methods=['POST'])
@login_required
def stop_game(match_night_id):
    """Stop the current active game"""
    # Get match night
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can stop the game'}), 403
    
    # Find active game
    active_game = GameSchema.query.filter_by(
        match_night_id=match_night_id,
        status='active'
    ).first()
    
    if not active_game:
        return jsonify({'error': 'No active game found'}), 404
    
    try:
        # Mark game as completed
        active_game.status = 'completed'
        db.session.commit()
        
        return jsonify({
            'message': 'Game stopped successfully',
            'game_schema': active_game.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to stop game: {str(e)}'}), 500

@game_schemas_bp.route('/<int:match_night_id>/complete', methods=['POST'])
@login_required
def complete_game(match_night_id):
    """Complete the game and finalize all results"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if user is the creator
    if match_night.creator_id != current_user.id:
        return jsonify({'error': 'Only the creator can complete the game'}), 403
    
    try:
        # Get the active game schema
        game_schema = GameSchema.query.filter_by(
            match_night_id=match_night_id,
            status='active'
        ).first()
        
        if not game_schema:
            return jsonify({'error': 'No active game found'}), 404
        
        # Update game schema status
        game_schema.status = 'completed'
        
        # Update match night game status
        match_night.game_status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Game completed successfully',
            'game_schema': game_schema.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to complete game: {str(e)}'}), 500

def generate_everyone_vs_everyone_matches(match_night, game_schema):
    """Generate matches for everyone vs everyone mode using pair-based scheduling"""
    print(f"Starting generate_everyone_vs_everyone_matches for match_night_id: {match_night.id}")
    
    participants = Participation.query.filter_by(match_night_id=match_night.id).all()
    participant_ids = [p.user_id for p in participants]
    
    print(f"Found {len(participants)} participants: {participant_ids}")
    
    if len(participant_ids) not in [4, 5, 6, 7, 8]:
        print(f"Not creating matches: need 4, 5, 6, 7, or 8 players, got {len(participant_ids)}")
        return []
    
    # Generate all possible unique pairs
    from itertools import combinations
    all_pairs = list(combinations(participant_ids, 2))
    print(f"Generated {len(all_pairs)} unique pairs: {all_pairs}")
    
    # Create schedule based on number of players
    if len(participant_ids) == 4:
        # For 4 players: 3 matches, all pairs play
        schedule = create_4_player_schedule(participant_ids)
    elif len(participant_ids) == 5:
        # For 5 players: 5 matches, 10 pairs play (5 pairs don't play)
        schedule = create_5_player_schedule(participant_ids)
    elif len(participant_ids) == 6:
        # For 6 players: 8 matches, 16 pairs play (1 pair doesn't play)
        schedule = create_6_player_schedule(participant_ids)
    elif len(participant_ids) == 7:
        # For 7 players: 10 matches, 20 pairs play (1 pair doesn't play)
        schedule = create_7_player_schedule(participant_ids)
    elif len(participant_ids) == 8:
        # For 8 players: 14 matches, 28 pairs play (all pairs play)
        schedule = create_8_player_schedule(participant_ids)
    
    # Create matches from schedule
    matches = []
    for round_num, match_pairs in enumerate(schedule, 1):
        if len(match_pairs) == 2:  # One match per round
            pair1, pair2 = match_pairs
            
            # Check if this is a naai-partij (last match for 6 or 7 players)
            is_naai_partij = False
            if len(participant_ids) in [6, 7] and round_num == len(schedule):
                is_naai_partij = True
            
            match = Match(
                match_night_id=match_night.id,
                game_schema_id=game_schema.id,
                player1_id=pair1[0],
                player2_id=pair1[1],
                player3_id=pair2[0],
                player4_id=pair2[1],
                round=round_num,
                court=1
            )
            matches.append(match)
            db.session.add(match)
            
            match_type = "NAAI-PARTIJ" if is_naai_partij else "Normal"
            print(f"Created match {round_num} ({match_type}): {pair1[0]}&{pair1[1]} vs {pair2[0]}&{pair2[1]}")
    
    try:
        db.session.commit()
        print(f"Successfully committed {len(matches)} matches to database")
    except Exception as e:
        print(f"Error committing matches to database: {str(e)}")
        db.session.rollback()
        raise e
    
    return matches

def create_4_player_schedule(players):
    """Create schedule for 4 players: 3 matches, all pairs play"""
    # All possible pairs: (1,2), (1,3), (1,4), (2,3), (2,4), (3,4)
    # Schedule: (1,2) vs (3,4), (1,3) vs (2,4), (1,4) vs (2,3)
    return [
        [(players[0], players[1]), (players[2], players[3])],  # 1&2 vs 3&4
        [(players[0], players[2]), (players[1], players[3])],  # 1&3 vs 2&4
        [(players[0], players[3]), (players[1], players[2])]   # 1&4 vs 2&3
    ]

def create_5_player_schedule(players):
    """Create schedule for 5 players: 5 matches, all 10 pairs play exactly once"""
    # All possible pairs: (1,2), (1,3), (1,4), (1,5), (2,3), (2,4), (2,5), (3,4), (3,5), (4,5)
    # Schedule: 5 matches, each pair plays exactly once
    return [
        [(players[0], players[1]), (players[2], players[3])],  # 1&2 vs 3&4 (5 rests)
        [(players[0], players[2]), (players[1], players[4])],  # 1&3 vs 2&5 (4 rests)
        [(players[0], players[3]), (players[2], players[4])],  # 1&4 vs 3&5 (2 rests)
        [(players[0], players[4]), (players[1], players[3])],  # 1&5 vs 2&4 (3 rests)
        [(players[1], players[2]), (players[3], players[4])]   # 2&3 vs 4&5 (1 rests)
    ]

def create_6_player_schedule(players):
    """Create schedule for 6 players: 8 matches, all 15 pairs play exactly once + naai-partij"""
    # All possible pairs: (1,2), (1,3), (1,4), (1,5), (1,6), (2,3), (2,4), (2,5), (2,6), (3,4), (3,5), (3,6), (4,5), (4,6), (5,6)
    # Schedule: 8 matches, each pair plays exactly once, plus naai-partij for the remaining pair
    return [
        [(players[0], players[1]), (players[2], players[3])],  # 1&2 vs 3&4 (5,6 rest)
        [(players[0], players[2]), (players[1], players[4])],  # 1&3 vs 2&5 (3,6 rest)
        [(players[0], players[3]), (players[2], players[4])],  # 1&4 vs 3&5 (2,6 rest)
        [(players[0], players[4]), (players[1], players[3])],  # 1&5 vs 2&4 (3,6 rest)
        [(players[0], players[5]), (players[1], players[2])],  # 1&6 vs 2&3 (4,5 rest)
        [(players[1], players[5]), (players[2], players[4])],  # 2&6 vs 3&5 (1,4 rest)
        [(players[2], players[5]), (players[3], players[4])],  # 3&6 vs 4&5 (1,2 rest)
        [(players[3], players[5]), (players[0], players[1])]   # NAAI-PARTIJ: 4&6 vs 1&2 (3,5 rest) - 4&6 speelt extra, resultaat telt alleen voor 4&6
    ]

def create_7_player_schedule(players):
    """Create schedule for 7 players: 11 matches, all 21 pairs play exactly once + naai-partij"""
    # All possible pairs: 21 total, we use all 21 pairs in 11 matches including naai-partij
    return [
        [(players[0], players[1]), (players[2], players[3])],  # 1&2 vs 3&4 (5,6,7 rest)
        [(players[0], players[2]), (players[1], players[4])],  # 1&3 vs 2&5 (3,6,7 rest)
        [(players[0], players[3]), (players[2], players[4])],  # 1&4 vs 3&5 (2,6,7 rest)
        [(players[0], players[4]), (players[1], players[3])],  # 1&5 vs 2&4 (3,6,7 rest)
        [(players[0], players[5]), (players[1], players[2])],  # 1&6 vs 2&3 (4,5,7 rest)
        [(players[0], players[6]), (players[1], players[4])],  # 1&7 vs 2&5 (3,4,6 rest)
        [(players[1], players[5]), (players[3], players[4])],  # 2&6 vs 4&5 (1,3,7 rest)
        [(players[1], players[6]), (players[3], players[4])],  # 2&7 vs 4&5 (1,3,6 rest)
        [(players[2], players[6]), (players[3], players[5])],  # 3&7 vs 4&6 (1,2,5 rest)
        [(players[4], players[6]), (players[5], players[6])],  # 5&7 vs 6&7 (1,2,3 rest)
        [(players[3], players[6]), (players[0], players[1])]   # NAAI-PARTIJ: 4&7 vs 1&2 (3,5,6 rest) - 4&7 speelt extra, resultaat telt alleen voor 4&7
    ]

def create_8_player_schedule(players):
    """Create schedule for 8 players: 14 matches, all 28 pairs play"""
    # All possible pairs: 28 total, we use all pairs in 14 matches
    return [
        [(players[0], players[1]), (players[2], players[3])],  # 1&2 vs 3&4 (5,6,7,8 rest)
        [(players[0], players[2]), (players[1], players[4])],  # 1&3 vs 2&5 (3,6,7,8 rest)
        [(players[0], players[3]), (players[2], players[4])],  # 1&4 vs 3&5 (2,6,7,8 rest)
        [(players[0], players[4]), (players[1], players[3])],  # 1&5 vs 2&4 (3,6,7,8 rest)
        [(players[0], players[5]), (players[1], players[2])],  # 1&6 vs 2&3 (4,5,7,8 rest)
        [(players[0], players[6]), (players[2], players[5])],  # 1&7 vs 3&6 (2,4,5,8 rest)
        [(players[0], players[7]), (players[3], players[6])],  # 1&8 vs 4&7 (2,3,5,6 rest)
        [(players[1], players[5]), (players[2], players[4])],  # 2&6 vs 3&5 (1,4,7,8 rest)
        [(players[1], players[6]), (players[3], players[4])],  # 2&7 vs 4&5 (1,3,6,8 rest)
        [(players[1], players[7]), (players[2], players[6])],  # 2&8 vs 3&7 (1,4,5,6 rest)
        [(players[2], players[7]), (players[3], players[5])],  # 3&8 vs 4&6 (1,2,5,7 rest)
        [(players[3], players[7]), (players[4], players[5])],  # 4&8 vs 5&6 (1,2,3,7 rest)
        [(players[4], players[7]), (players[5], players[6])],  # 5&8 vs 6&7 (1,2,3,4 rest)
        [(players[4], players[6]), (players[5], players[7])]   # 5&7 vs 6&8 (1,2,3,4 rest)
    ]

def update_player_stats_for_match(match_id):
    """Update player stats for a specific match"""
    match = Match.query.get(match_id)
    if not match or not match.result:
        return
    
    match_night_id = match.match_night_id
    result = match.result
    
    # Parse the score to get games won by each team
    try:
        score_parts = result.score.split('-')
        team1_games = int(score_parts[0])
        team2_games = int(score_parts[1])
    except (ValueError, IndexError):
        return
    
    # Determine winners and losers
    if team1_games > team2_games:
        winners = [match.player1_id, match.player2_id]
        losers = [match.player3_id, match.player4_id]
    elif team2_games > team1_games:
        winners = [match.player3_id, match.player4_id]
        losers = [match.player1_id, match.player2_id]
    else:
        # Tie - no games won or lost
        return
    
    # Update stats for all players
    for player_id in [match.player1_id, match.player2_id, match.player3_id, match.player4_id]:
        # Get or create player stats
        player_stat = PlayerStats.query.filter_by(
            match_night_id=match_night_id,
            user_id=player_id
        ).first()
        
        if not player_stat:
            player_stat = PlayerStats(
                match_night_id=match_night_id,
                user_id=player_id,
                games_won=0,
                games_lost=0
            )
            db.session.add(player_stat)
        
        # Update games won/lost
        if player_id in winners:
            player_stat.games_won += 1
        else:
            player_stat.games_lost += 1
    
    db.session.commit()

def generate_king_of_the_court_matches(match_night, game_schema):
    """Generate initial matches for king of the court mode"""
    participants = Participation.query.filter_by(match_night_id=match_night.id).all()
    participant_ids = [p.user_id for p in participants]
    
    matches = []
    
    # For king of the court, we start with one match
    # Winners stay, losers go to queue
    if len(participant_ids) >= 4:
        match = Match(
            match_night_id=match_night.id,
            game_schema_id=game_schema.id,
            player1_id=participant_ids[0],
            player2_id=participant_ids[1],
            player3_id=participant_ids[2],
            player4_id=participant_ids[3],
            round=1,
            court=1
        )
        matches.append(match)
        db.session.add(match)
    
    db.session.commit()
    return matches 