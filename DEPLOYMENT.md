# 🚀 PadelMate Deployment Guide

## Render Deployment

### Stap 1: GitHub Repository
```bash
# Initialiseer Git repository
git init
git add .
git commit -m "Initial commit: PadelMate backend setup"

# Maak GitHub repository aan en push
git remote add origin https://github.com/yourusername/padelmate.git
git push -u origin main
```

### Stap 2: Render Setup

1. **Ga naar [Render.com](https://render.com)**
2. **Log in met je GitHub account**
3. **Klik "New +" → "Blueprint"**
4. **Connect je GitHub repository**
5. **Render zal automatisch detecteren:**
   - `render.yaml` configuratie
   - Python backend
   - PostgreSQL database

### Stap 3: Environment Variables

Render zal automatisch instellen:
- `SECRET_KEY`: Auto-generated
- `DATABASE_URL`: Auto-connected to PostgreSQL
- `PYTHON_VERSION`: 3.9.16

### Stap 4: Database Migratie

Na deployment, voer database migraties uit:

```bash
# Via Render Shell of SSH
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### Stap 5: Test de API

```bash
# Test health endpoint
curl https://your-app-name.onrender.com/api/health

# Test registratie
curl -X POST https://your-app-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

## Lokale Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
flask run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Registreer nieuwe gebruiker
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Huidige gebruiker

### Match Nights
- `GET /api/match-nights/` - Alle speelavonden
- `POST /api/match-nights/` - Nieuwe speelavond
- `GET /api/match-nights/<id>` - Speelavond details
- `POST /api/match-nights/<id>/join` - Deelnemen
- `POST /api/match-nights/<id>/leave` - Uitschrijven
- `POST /api/match-nights/<id>/generate-schedule` - Schema genereren

### Matches
- `POST /api/matches/<id>/result` - Score invoeren
- `GET /api/matches/<id>/result` - Score ophalen

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match Nights
CREATE TABLE match_nights (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(200) NOT NULL,
    num_courts INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participations
CREATE TABLE participations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    match_night_id INTEGER REFERENCES match_nights(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_night_id)
);

-- Matches
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    match_night_id INTEGER REFERENCES match_nights(id),
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    player3_id INTEGER REFERENCES users(id),
    player4_id INTEGER REFERENCES users(id),
    round INTEGER NOT NULL,
    court INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match Results
CREATE TABLE match_results (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id),
    score VARCHAR(50),
    winner_ids TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` in Render environment
   - Ensure PostgreSQL service is running

2. **CORS Errors**
   - Frontend URL moet toegevoegd zijn aan CORS origins
   - Check `CORS_ORIGINS` environment variable

3. **Import Errors**
   - Ensure all dependencies in `requirements.txt`
   - Check Python version compatibility

4. **Authentication Issues**
   - Verify `SECRET_KEY` is set
   - Check session configuration

### Logs bekijken
```bash
# Render dashboard → Services → Logs
# Of via CLI
render logs --service padelmate-backend
``` 