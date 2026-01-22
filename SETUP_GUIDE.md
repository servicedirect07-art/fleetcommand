# FleetCommand Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

Check your installations:
```bash
node --version
npm --version
```

## Quick Start (Local Development)

### Step 1: Project Setup

1. Create a new folder for your project:
```bash
mkdir fleetcommand
cd fleetcommand
```

2. Place these files in the folder:
   - `server.js` - Backend API server
   - `package.json` - Dependencies configuration
   - `fleet-manager.html` - Frontend (rename to `index.html`)
   - `.env.example` - Environment variables template

3. Copy environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and change `JWT_SECRET` to a random string:
```
JWT_SECRET=your-super-secret-random-string-here
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (Express, Sequelize, etc.)

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
Database synchronized
Sample data created
FleetCommand Backend running on http://localhost:3000
```

### Step 4: Open the App

1. Create a `public` folder in your project:
```bash
mkdir public
```

2. Move `fleet-manager.html` to `public/index.html`:
```bash
mv fleet-manager.html public/index.html
```

3. Open your browser to: **http://localhost:3000**

## Folder Structure

```
fleetcommand/
├── server.js              # Backend API server
├── package.json           # Dependencies
├── .env                   # Environment config (create from .env.example)
├── fleet_database.sqlite  # Database (auto-created)
├── public/                # Frontend files
│   └── index.html         # Your web app
├── uploads/               # Uploaded files (auto-created)
└── node_modules/          # Dependencies (auto-created)
```

## API Testing

### Test Authentication

1. Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@fleet.com","password":"password123"}'
```

2. Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

Save the returned `token` for other requests.

### Test Getting Drivers

```bash
curl http://localhost:3000/api/drivers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Connecting Frontend to Backend

Update your `public/index.html` to make API calls. Add this at the top of the `<script>` section:

```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');

// API Helper Function
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
}

// Example: Load real drivers
async function loadDrivers() {
    try {
        const drivers = await apiCall('/drivers');
        console.log('Drivers:', drivers);
        // Update UI with real data
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}
```

## Development Mode

For auto-restart on file changes, use:

```bash
npm run dev
```

This uses nodemon to watch for changes.

## Troubleshooting

### Port Already in Use

If port 3000 is busy, change it in `.env`:
```
PORT=3001
```

### Database Issues

Delete the database and restart:
```bash
rm fleet_database.sqlite
npm start
```

### CORS Errors

Update `.env` with your frontend URL:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000
```

### Module Not Found

Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Option 1: Render.com (Recommended - Free)

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Create new "Web Service"
4. Connect your GitHub repo
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add environment variables from `.env`
8. Deploy!

### Option 2: Railway.app

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Node.js
5. Add environment variables
6. Deploy!

### Option 3: Heroku

```bash
# Install Heroku CLI
# Login: heroku login

# Create app
heroku create your-fleet-app

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main

# Open app
heroku open
```

## Database Migration (SQLite → PostgreSQL)

For production, use PostgreSQL:

1. Update `.env`:
```
DB_DIALECT=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=fleetcommand
DB_USER=your-user
DB_PASSWORD=your-password
```

2. Install PostgreSQL driver:
```bash
npm install pg pg-hstore
```

3. Update `server.js` Sequelize config:
```javascript
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false
  }
);
```

## Advanced Features

### Add Real-time Updates (WebSocket)

Install Socket.io:
```bash
npm install socket.io
```

Update server.js:
```javascript
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Broadcast updates
function broadcastUpdate(event, data) {
  io.emit(event, data);
}
```

### Add Email Notifications

Install nodemailer:
```bash
npm install nodemailer
```

### Add SMS Notifications

Install Twilio:
```bash
npm install twilio
```

## API Documentation

Full API documentation available at:
- Drivers: `/api/drivers` (GET, POST, PUT, DELETE)
- Vehicles: `/api/vehicles` (GET, POST, PUT, DELETE)
- Routes: `/api/routes` (GET, POST, PUT, DELETE)
- Deliveries: `/api/deliveries` (GET, POST, PUT, DELETE)
- Import: `/api/import/excel`, `/api/import/pdf` (POST)
- Analytics: `/api/analytics/dashboard` (GET)

## Support

For issues or questions:
1. Check this guide
2. Review console errors
3. Check server logs
4. Verify environment variables

## Next Steps

1. ✅ Get local server running
2. ✅ Test API endpoints
3. ✅ Connect frontend to backend
4. 📝 Add authentication to frontend
5. 📝 Implement real-time updates
6. 🚀 Deploy to production

Happy coding! 🚀
