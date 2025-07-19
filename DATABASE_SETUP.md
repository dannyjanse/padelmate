# Database Setup voor PadelMate

## Render.com PostgreSQL Database

Deze applicatie gebruikt uitsluitend de PostgreSQL database op Render.com. Er is geen lokale SQLite database meer.

## Setup voor Lokale Ontwikkeling

1. **Maak een `.env` bestand aan** in de `backend` directory
2. **Voeg de volgende configuratie toe:**

```env
# Flask Configuration
SECRET_KEY=your-secret-key-here-change-in-production
FLASK_ENV=development
FLASK_DEBUG=1

# Database Configuration - VERPLICHT
# Haal deze URL op uit je Render.com database dashboard
DATABASE_URL=postgresql://padelmate_user:your_password@your_host:5432/padelmate

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Render Configuration
RENDER=true
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
```

## Hoe je de DATABASE_URL vindt:

1. Ga naar je Render.com dashboard
2. Klik op je database service (`padelmate-db`)
3. Ga naar de "Connections" tab
4. Kopieer de "External Database URL"

## Belangrijk:

- De `DATABASE_URL` is **verplicht** - zonder deze zal de app niet starten
- Alle data wordt opgeslagen in de Render.com PostgreSQL database
- Er is geen lokale database meer
- Zorg ervoor dat je database URL correct is voordat je de app start 