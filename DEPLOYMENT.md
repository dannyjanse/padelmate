# 🚀 PadelMate Deployment Guide - Render.com

## 📋 Overzicht

Deze guide helpt je om de PadelMate app live te zetten op Render.com. De app bestaat uit:
- **Backend**: Flask API (Python)
- **Frontend**: React app (TypeScript)
- **Database**: PostgreSQL

## 🛠️ Voorbereiding

### 1. Repository Setup
Zorg ervoor dat je code in een Git repository staat (GitHub, GitLab, etc.)

### 2. Environment Variables
De volgende environment variables worden automatisch geconfigureerd:
- `SECRET_KEY`: Automatisch gegenereerd door Render
- `DATABASE_URL`: Automatisch gekoppeld aan PostgreSQL database
- `FLASK_ENV`: production
- `FLASK_DEBUG`: false

## 🚀 Deployment Stappen

### Stap 1: Render.com Account
1. Ga naar [render.com](https://render.com)
2. Maak een account aan of log in
3. Verbind je Git repository

### Stap 2: Database Deployen
1. Klik op "New" → "PostgreSQL"
2. Configureer:
   - **Name**: `padelmate-db`
   - **Database**: `padelmate`
   - **User**: `padelmate_user`
   - **Plan**: Free (voor MVP)

### Stap 3: Backend Deployen
1. Klik op "New" → "Web Service"
2. Verbind je Git repository
3. Configureer:
   - **Name**: `padelmate-backend`
   - **Environment**: Python
   - **Build Command**: `cd backend && pip install -r ../requirements.txt`
   - **Start Command**: `cd backend && gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: Free

### Stap 4: Frontend Deployen
1. Klik op "New" → "Static Site"
2. Verbind je Git repository
3. Configureer:
   - **Name**: `padelmate-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Plan**: Free

### Stap 5: Environment Variables Instellen

#### Backend Environment Variables:
```
PYTHON_VERSION=3.9.16
SECRET_KEY=[auto-generated]
DATABASE_URL=[from database]
FLASK_ENV=production
FLASK_DEBUG=false
```

#### Frontend Environment Variables:
```
VITE_API_URL=https://padelmate-backend.onrender.com
```

## 🔧 Post-Deployment Setup

### 1. Database Initialisatie
Na de eerste deployment moet je de database initialiseren:

```bash
# Via Render.com dashboard:
# Ga naar je backend service → "Shell"
# Voer uit:
python init_db.py
```

### 2. Test Users Aanmaken
De app maakt automatisch test users aan bij de eerste login:
- Danny (password: password)
- Branko (password: password)
- Tukkie (password: password)
- Michiel (password: password)
- Jeroen (password: password)
- Joost (password: password)

## 🌐 URLs

Na deployment krijg je:
- **Frontend**: `https://padelmate-frontend.onrender.com`
- **Backend**: `https://padelmate-backend.onrender.com`
- **Database**: Automatisch gekoppeld

## 🔍 Troubleshooting

### Veelvoorkomende Problemen:

#### 1. Build Fails
- Controleer of alle dependencies in `requirements.txt` staan
- Zorg dat `package.json` correct is geconfigureerd

#### 2. Database Connection Issues
- Controleer of `DATABASE_URL` correct is ingesteld
- Zorg dat de database service draait

#### 3. CORS Issues
- Backend heeft CORS geconfigureerd voor productie
- Frontend gebruikt de juiste API URL

#### 4. Static Files
- Zorg dat `logo.png` in de `frontend/public/` map staat
- Build process kopieert automatisch naar `dist/`

## 📊 Monitoring

### Render.com Dashboard
- **Logs**: Bekijk real-time logs
- **Metrics**: CPU, memory usage
- **Health Checks**: Automatische status monitoring

### Database Monitoring
- **Connection Pool**: Automatisch geconfigureerd
- **Backups**: Automatische dagelijkse backups (paid plans)

## 🔄 Updates

### Code Updates
1. Push nieuwe code naar je Git repository
2. Render detecteert automatisch wijzigingen
3. Automatische rebuild en deployment

### Environment Variables
1. Ga naar service dashboard
2. "Environment" tab
3. Voeg/update variables toe

## 💰 Kosten

### Free Tier (MVP):
- **Backend**: 750 uur/maand
- **Frontend**: Onbeperkt
- **Database**: 90 dagen trial

### Paid Plans:
- **Backend**: $7/maand voor altijd online
- **Database**: $7/maand voor persistent storage

## 🚀 Next Steps

### Na Live Deployment:
1. **Test alle functionaliteiten**
2. **Configureer custom domain** (optioneel)
3. **Setup monitoring alerts**
4. **Plan voor scaling** (indien nodig)

### Performance Tips:
- **CDN**: Render gebruikt automatisch CDN voor static files
- **Caching**: Implementeer caching voor betere performance
- **Database Indexes**: Optimaliseer queries

## 📞 Support

- **Render.com Docs**: [docs.render.com](https://docs.render.com)
- **Community**: Render Discord/Forum
- **Status**: [status.render.com](https://status.render.com)

---

**🎉 Gefeliciteerd! Je PadelMate app is nu live!** 