# 🏓 PadelMate Backend

De backend API voor de PadelMate applicatie. Dit is de Flask API die de frontend van data voorziet.

## 🚀 Technische Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL
- **Authenticatie**: Flask-Login
- **Hosting**: Render
- **Version Control**: Git

## 📁 Projectstructuur

```
padelmate/
├── backend/          # Flask API
├── docs/            # Documentatie
└── README.md        # Dit bestand
```

## 🛠️ Setup

### Backend (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

### Frontend
De frontend is nu een apart project: [padelmate-frontend](https://github.com/dannyjanse/padelmate-frontend)

## 📋 MVP Features

- ✅ Gebruikersregistratie & login
- ✅ Aanmaken & inschrijven speelavond
- ✅ Automatisch speelschema genereren
- ✅ Score-invoer
- ✅ Statistieken per speler
- ✅ Responsive design

## 🎯 Doel

PadelMate maakt het eenvoudig voor padelgroepen om:
- Speelavonden te plannen
- Automatisch speelschema's te genereren
- Scores bij te houden
- Statistieken te bekijken

---

*Gebouwd met ❤️ voor de padel community* 