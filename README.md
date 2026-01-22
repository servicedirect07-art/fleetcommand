[README.md](https://github.com/user-attachments/files/24785469/README.md)
# 🚚 FleetCommand

> Complete fleet management system for delivery contractors (FedEx, Amazon DSP, UPS)

![FleetCommand Dashboard](https://via.placeholder.com/800x400/0a4d68/ffffff?text=FleetCommand+Dashboard)

## ✨ Features

### 📍 Real-Time Fleet Tracking
- Live GPS tracking of all vehicles
- Interactive map with vehicle markers
- Real-time location updates

### 🗺️ Route Management
- Automated route optimization
- Turn-by-turn navigation
- Progress tracking with completion rates
- ETA calculations

### 👥 Driver Management
- Driver profiles with performance metrics
- Safety scores and ratings
- License and certification tracking
- Availability status

### 🚗 Vehicle Management
- Vehicle assignments
- Maintenance scheduling
- Mileage tracking
- Status monitoring

### 📁 Smart Import System
- **Excel Import**: Upload delivery manifests (.xlsx, .xls)
- **PDF Import**: Extract delivery data from PDF documents
- Auto-detection of FedEx, Amazon, UPS formats
- Automatic route creation and driver assignment

### 🎓 Safety Training
- Automated training modules
- Progress tracking
- Compliance management
- DOT certification tracking

### 📊 Analytics Dashboard
- Real-time statistics
- Performance metrics
- Delivery completion rates
- On-time delivery tracking

### 🔒 Security
- User authentication with JWT
- Role-based access control
- Secure API endpoints

## 🚀 Quick Start

### Option 1: View Demo (2 minutes)
```bash
# Just open the HTML file
open fleet-manager.html
```

### Option 2: Run Locally (10 minutes)
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Create public folder
mkdir public
mv fleet-manager.html public/index.html

# Start server
npm start

# Open browser
open http://localhost:3000
```

### Option 3: Docker (5 minutes)
```bash
# Start everything
docker-compose up -d

# Access app
open http://localhost:3000
```

## 📦 Installation

### Prerequisites
- Node.js 14+ (https://nodejs.org)
- npm (comes with Node.js)
- Git (https://git-scm.com)

### Steps
```bash
# Clone repository
git clone https://github.com/yourusername/fleetcommand.git
cd fleetcommand

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set JWT_SECRET

# Initialize database
npm start
# Database auto-creates with sample data

# Open in browser
http://localhost:3000
```

## 🏗️ Project Structure

```
fleetcommand/
├── server.js              # Express API server
├── package.json           # Dependencies
├── .env.example          # Environment template
├── Dockerfile            # Container config
├── docker-compose.yml    # Stack configuration
├── .gitignore           # Git ignore rules
├── public/              # Frontend files
│   └── index.html       # Web application
├── uploads/             # File uploads
└── docs/                # Documentation
    ├── SETUP_GUIDE.md
    ├── DEPLOYMENT_GUIDE.md
    ├── QUICK_DEPLOY.md
    └── GITHUB_UPLOAD_GUIDE.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-random-string-here

# Database (SQLite by default)
DB_DIALECT=sqlite
DB_STORAGE=./fleet_database.sqlite

# For PostgreSQL production:
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=fleetcommand
# DB_USER=fleetuser
# DB_PASSWORD=yourpassword
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register    # Create new user
POST   /api/auth/login        # Login user
```

### Drivers
```
GET    /api/drivers           # List all drivers
POST   /api/drivers           # Create driver
PUT    /api/drivers/:id       # Update driver
DELETE /api/drivers/:id       # Delete driver
```

### Vehicles
```
GET    /api/vehicles          # List all vehicles
POST   /api/vehicles          # Create vehicle
PUT    /api/vehicles/:id      # Update vehicle
DELETE /api/vehicles/:id      # Delete vehicle
```

### Routes
```
GET    /api/routes            # List all routes
POST   /api/routes            # Create route
PUT    /api/routes/:id        # Update route
DELETE /api/routes/:id        # Delete route
```

### Deliveries
```
GET    /api/deliveries        # List all deliveries
POST   /api/deliveries        # Create delivery
PUT    /api/deliveries/:id    # Update delivery
DELETE /api/deliveries/:id    # Delete delivery
```

### Import
```
POST   /api/import/excel      # Import from Excel
POST   /api/import/pdf        # Import from PDF
```

### Analytics
```
GET    /api/analytics/dashboard  # Dashboard statistics
```

## 🚀 Deployment

### Render.com (Recommended - Free)

1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - Build: `npm install`
   - Start: `npm start`
   - Environment: Add `JWT_SECRET`
6. Deploy!

See [QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) for detailed instructions.

### Railway.app

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select repository
4. Add `JWT_SECRET` variable
5. Deploy!

### Heroku

```bash
heroku create your-fleet-app
heroku config:set JWT_SECRET=your-secret
git push heroku main
heroku open
```

## 🧪 Testing

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@fleet.com","password":"password123"}'

# Test getting drivers (requires token)
curl http://localhost:3000/api/drivers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Font Awesome icons
- SheetJS (XLSX parsing)
- PDF.js (PDF parsing)
- Responsive design

### Backend
- Node.js
- Express.js
- Sequelize ORM
- SQLite / PostgreSQL
- JWT authentication
- Multer (file uploads)

### DevOps
- Docker
- Docker Compose
- Nginx (optional)

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - All deployment options
- **[Quick Deploy](docs/QUICK_DEPLOY.md)** - Fast deployment paths
- **[GitHub Upload](docs/GITHUB_UPLOAD_GUIDE.md)** - How to upload to GitHub

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Open an issue on GitHub
- **Email**: support@fleetcommand.example

## 🎯 Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Advanced route optimization algorithms
- [ ] Real-time driver chat
- [ ] Weather integration
- [ ] Traffic optimization
- [ ] Customer notifications
- [ ] Automated reporting
- [ ] Multi-language support

## 🌟 Features in Detail

### Import System
The import system intelligently parses delivery manifests from various sources:

**Supported Formats:**
- FedEx contractor manifests
- Amazon DSP route sheets
- UPS delivery lists
- Custom CSV/Excel formats

**Smart Detection:**
- Auto-detects column headers
- Flexible field matching
- Address validation
- Package count extraction

### Route Optimization
Advanced algorithms for efficient routing:
- Minimizes total distance
- Considers delivery time windows
- Balances driver workload
- Accounts for vehicle capacity
- Real-time traffic integration (future)

## 🔐 Security Best Practices

1. **Change default JWT secret** in production
2. **Use PostgreSQL** instead of SQLite for production
3. **Enable HTTPS** (automatic on Render/Netlify)
4. **Set strong passwords** for all accounts
5. **Regular backups** of database
6. **Keep dependencies updated**: `npm audit fix`

## 📈 Performance

- Handles 1000+ deliveries per day
- Real-time updates for 100+ vehicles
- Sub-second API response times
- Optimized database queries
- Efficient file processing

## 🎨 Screenshots

*(Add screenshots here after deployment)*

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

## 📞 Contact

- **Website**: https://fleetcommand.example
- **Email**: info@fleetcommand.example
- **Twitter**: @fleetcommand

---

Made with ❤️ for delivery contractors everywhere
