# PadelMate Frontend

Een moderne React frontend voor de PadelMate applicatie, gebouwd met TypeScript, Tailwind CSS en Vite.

## 🚀 Features

- **Moderne UI/UX**: Gebouwd met Tailwind CSS voor een professionele uitstraling
- **TypeScript**: Volledig getypeerd voor betere developer experience
- **React Router**: Client-side routing voor snelle navigatie
- **Context API**: State management voor authenticatie
- **Responsive Design**: Werkt perfect op desktop en mobiel
- **Real-time Updates**: Automatische data refresh en error handling

## 📁 Projectstructuur

```
src/
├── components/          # Herbruikbare componenten
│   ├── Layout.tsx      # Hoofdlayout met navigatie
│   └── ProtectedRoute.tsx # Authenticatie wrapper
├── contexts/           # React Context providers
│   └── AuthContext.tsx # Authenticatie state management
├── pages/              # Pagina componenten
│   ├── Login.tsx       # Login pagina
│   ├── Register.tsx    # Registratie pagina
│   ├── Dashboard.tsx   # Hoofddashboard
│   ├── CreateMatchNight.tsx # Nieuwe avond aanmaken
│   └── MatchNightDetails.tsx # Avond details
├── services/           # API services
│   └── api.ts         # Axios configuratie en API calls
├── types/              # TypeScript type definities
│   └── index.ts       # Alle interfaces
└── hooks/              # Custom React hooks (voor toekomstig gebruik)
```

## 🛠️ Technische Stack

- **React 18** - Moderne React met hooks
- **TypeScript** - Type safety en betere DX
- **Vite** - Snelle development server en build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client voor API calls
- **Lucide React** - Moderne icon library
- **date-fns** - Date formatting utilities

## 🎨 Design System

### Kleuren
- **Primary**: Blue (primary-600, primary-700)
- **Secondary**: Gray (gray-200, gray-300)
- **Success**: Green (green-600, green-50)
- **Error**: Red (red-600, red-100)

### Componenten
- **Buttons**: `.btn-primary`, `.btn-secondary`
- **Cards**: `.card`
- **Inputs**: `.input-field`
- **Loading**: Animated spinner

## 🔧 Development

### Installeren
```bash
npm install
```

### Development Server
```bash
npm run dev
```
De app draait op `http://localhost:3000`

### Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## 🌐 API Integratie

De frontend communiceert met de Flask backend via:

- **Base URL**: `http://localhost:5000` (development)
- **Authentication**: Session-based met cookies
- **CORS**: Configureerd voor cross-origin requests
- **Error Handling**: Automatische redirect bij 401 errors

### Endpoints
- `/api/auth/*` - Authenticatie
- `/api/match-nights/*` - Padelavonden beheer
- `/api/matches/*` - Wedstrijden en resultaten

## 📱 Responsive Design

De app is volledig responsive met:
- **Mobile First**: Begint met mobiele layout
- **Breakpoints**: sm, md, lg, xl
- **Flexible Grid**: CSS Grid voor layouts
- **Touch Friendly**: Grote buttons en touch targets

## 🔐 Authenticatie Flow

1. **Login/Register** - Gebruiker logt in of registreert
2. **Protected Routes** - Automatische redirect naar login
3. **Session Management** - Automatische logout bij 401
4. **User Context** - Globale user state

## 🎯 Toekomstige Features

- [ ] Score invoer voor wedstrijden
- [ ] Gebruikersprofiel en statistieken
- [ ] Notificaties voor nieuwe avonden
- [ ] Offline support met service workers
- [ ] Dark mode toggle
- [ ] PWA functionaliteit

## 🚀 Deployment

De frontend kan gedeployed worden naar:
- **Vercel** - Voor React apps
- **Netlify** - Voor statische sites
- **GitHub Pages** - Gratis hosting
- **AWS S3** - Voor enterprise

---

*Gebouwd met ❤️ voor de padel community* 