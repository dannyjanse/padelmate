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
    # Get match nights created by the user
    created_match_nights = MatchNight.query.filter_by(creator_id=current_user.id).all()
    
    # Get match nights where user is participating
    participations = Participation.query.filter_by(user_id=current_user.id).all()
    participating_match_nights = [p.match_night for p in participations]
    
    # Combine and remove duplicates
    all_match_nights = list(set(created_match_nights + participating_match_nights))
    all_match_nights.sort(key=lambda x: x.date, reverse=True)
    
    return jsonify({'match_nights': [mn.to_dict() for mn in all_match_nights]}), 200

@match_nights_bp.route('/', methods=['POST'])
@login_required
def create_match_night():
    """Create a new match night"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('date', 'location')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    match_night = MatchNight(
        date=date,
        location=data['location'],
        num_courts=data.get('num_courts', 1),
        creator_id=current_user.id
    )
    
    try:
        db.session.add(match_night)
        db.session.commit()
        return jsonify({'message': 'Match night created', 'match_night': match_night.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create match night'}), 500

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

# Simple database check endpoint
@auth_bp.route('/check-db', methods=['GET'])
def check_database():
    """Check if database is working and has users"""
    try:
        user_count = User.query.count()
        return jsonify({
            'message': 'Database is working',
            'user_count': user_count,
            'status': 'success'
        }), 200
    except Exception as e:
        return jsonify({
            'message': 'Database error',
            'error': str(e),
            'status': 'error'
        }), 500 