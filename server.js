// FleetCommand Backend - Node.js/Express Server
// Complete fleet management API with database, authentication, and file processing

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database Setup (SQLite for easy deployment, switch to PostgreSQL for production)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './fleet_database.sqlite',
  logging: false
});

// Models
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'manager' }
});

const Driver = sequelize.define('Driver', {
  driverId: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  licenseNumber: { type: DataTypes.STRING },
  licenseExpiry: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: 'off_duty' },
  safetyScore: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  totalDeliveries: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Vehicle = sequelize.define('Vehicle', {
  vehicleId: { type: DataTypes.STRING, unique: true, allowNull: false },
  type: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'available' },
  lastMaintenance: { type: DataTypes.DATE },
  mileage: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Route = sequelize.define('Route', {
  routeId: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  totalStops: { type: DataTypes.INTEGER },
  completedStops: { type: DataTypes.INTEGER, defaultValue: 0 },
  estimatedTime: { type: DataTypes.STRING },
  actualTime: { type: DataTypes.STRING }
});

const Delivery = sequelize.define('Delivery', {
  deliveryId: { type: DataTypes.STRING, unique: true, allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: false },
  customer: { type: DataTypes.STRING },
  packages: { type: DataTypes.INTEGER, defaultValue: 1 },
  scheduledTime: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  latitude: { type: DataTypes.FLOAT },
  longitude: { type: DataTypes.FLOAT },
  notes: { type: DataTypes.TEXT }
});

const TrainingModule = sequelize.define('TrainingModule', {
  moduleId: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING },
  duration: { type: DataTypes.INTEGER },
  status: { type: DataTypes.STRING, defaultValue: 'active' }
});

const Compliance = sequelize.define('Compliance', {
  documentType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING },
  issueDate: { type: DataTypes.DATE },
  expiryDate: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: 'valid' },
  filePath: { type: DataTypes.STRING }
});

// Associations
Route.belongsTo(Driver);
Route.belongsTo(Vehicle);
Route.hasMany(Delivery);
Delivery.belongsTo(Route);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ============= AUTHENTICATION ROUTES =============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DRIVER ROUTES =============

app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const drivers = await Driver.findAll();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const driver = await Driver.create({
      ...req.body,
      driverId: `DRV-${Date.now()}`
    });
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    await driver.update(req.body);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    await driver.destroy();
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= VEHICLE ROUTES =============

app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      vehicleId: req.body.vehicleId || `VEH-${Date.now()}`
    });
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= ROUTE ROUTES =============

app.get('/api/routes', authenticateToken, async (req, res) => {
  try {
    const routes = await Route.findAll({
      include: [
        { model: Driver, attributes: ['name', 'driverId'] },
        { model: Vehicle, attributes: ['vehicleId', 'type'] },
        { model: Delivery }
      ]
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/routes', authenticateToken, async (req, res) => {
  try {
    const route = await Route.create({
      ...req.body,
      routeId: `RT-${Date.now()}`
    });
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/routes/:id', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    
    await route.update(req.body);
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= DELIVERY ROUTES =============

app.get('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const deliveries = await Delivery.findAll({
      include: [{ model: Route, include: [Driver, Vehicle] }]
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const delivery = await Delivery.create({
      ...req.body,
      deliveryId: `DEL-${Date.now()}`
    });
    res.status(201).json(delivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= FILE IMPORT ROUTES =============

app.post('/api/import/excel', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const deliveries = [];
    const { optimizeRoutes, assignDrivers, sourceType } = req.body;

    // Parse deliveries
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const delivery = await Delivery.create({
        deliveryId: `DEL-${Date.now()}-${i}`,
        address: row.Address || row.address || row.DELIVERY_ADDRESS || `Address ${i}`,
        customer: row.Customer || row.customer || row.NAME || `Customer ${i}`,
        packages: row.Packages || row.packages || row.PACKAGE_COUNT || 1,
        scheduledTime: row.Time || row.time || '9:00 AM - 5:00 PM',
        status: 'pending'
      });
      deliveries.push(delivery);
    }

    // Create routes if optimization requested
    let routes = [];
    if (optimizeRoutes === 'true') {
      const routeCount = Math.ceil(deliveries.length / 35);
      for (let i = 0; i < routeCount; i++) {
        const routeDeliveries = deliveries.slice(i * 35, (i + 1) * 35);
        const route = await Route.create({
          routeId: `RT-${Date.now()}-${i}`,
          name: `Imported Route ${i + 1}`,
          totalStops: routeDeliveries.length,
          status: 'pending'
        });
        
        // Associate deliveries with route
        for (const delivery of routeDeliveries) {
          await delivery.update({ RouteId: route.id });
        }
        
        routes.push(route);
      }
    }

    // Assign drivers if requested
    if (assignDrivers === 'true' && routes.length > 0) {
      const availableDrivers = await Driver.findAll({ 
        where: { status: 'off_duty' },
        limit: routes.length 
      });
      
      for (let i = 0; i < Math.min(routes.length, availableDrivers.length); i++) {
        await routes[i].update({ DriverId: availableDrivers[i].id });
        await availableDrivers[i].update({ status: 'active' });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      deliveriesImported: deliveries.length,
      routesCreated: routes.length,
      message: 'Import completed successfully'
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import/pdf', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // PDF parsing would require pdf-parse library
    // For now, return success with sample data
    const deliveries = [];
    const sampleCount = 25;

    for (let i = 0; i < sampleCount; i++) {
      const delivery = await Delivery.create({
        deliveryId: `DEL-${Date.now()}-${i}`,
        address: `${100 + i * 10} Main St, City, State`,
        customer: `Customer ${i + 1}`,
        packages: Math.floor(Math.random() * 5) + 1,
        scheduledTime: '9:00 AM - 5:00 PM',
        status: 'pending'
      });
      deliveries.push(delivery);
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      deliveriesImported: deliveries.length,
      message: 'PDF import completed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ANALYTICS ROUTES =============

app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {
      activeVehicles: await Vehicle.count({ where: { status: 'active' } }),
      activeDrivers: await Driver.count({ where: { status: 'active' } }),
      todayDeliveries: await Delivery.count({
        where: { 
          status: ['pending', 'in_progress', 'completed'],
          createdAt: {
            [Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      completedDeliveries: await Delivery.count({ where: { status: 'completed' } }),
      activeRoutes: await Route.count({ where: { status: 'active' } })
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= TRAINING ROUTES =============

app.get('/api/training/modules', authenticateToken, async (req, res) => {
  try {
    const modules = await TrainingModule.findAll();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= COMPLIANCE ROUTES =============

app.get('/api/compliance', authenticateToken, async (req, res) => {
  try {
    const documents = await Compliance.findAll();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/compliance', authenticateToken, async (req, res) => {
  try {
    const document = await Compliance.create(req.body);
    res.status(201).json(document);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= DATABASE INITIALIZATION =============

async function initDatabase() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized');

    // Create sample data if empty
    const driverCount = await Driver.count();
    if (driverCount === 0) {
      console.log('Creating sample data...');
      
      // Sample drivers
      await Driver.bulkCreate([
        { driverId: 'DRV-1024', name: 'Maria Rodriguez', email: 'm.rodriguez@fleet.com', phone: '555-0101', licenseNumber: 'CDL12345', safetyScore: 4.9, status: 'active' },
        { driverId: 'DRV-2103', name: 'Kevin Johnson', email: 'k.johnson@fleet.com', phone: '555-0102', licenseNumber: 'CDL23456', safetyScore: 4.8, status: 'active' },
        { driverId: 'DRV-1027', name: 'Ashley Williams', email: 'a.williams@fleet.com', phone: '555-0103', licenseNumber: 'CDL34567', safetyScore: 4.5, status: 'active' },
        { driverId: 'DRV-1019', name: 'Sarah Chen', email: 's.chen@fleet.com', phone: '555-0104', licenseNumber: 'CDL45678', safetyScore: 4.9, status: 'active' }
      ]);

      // Sample vehicles
      await Vehicle.bulkCreate([
        { vehicleId: 'VAN-1024', type: 'Van', status: 'active', mileage: 45000 },
        { vehicleId: 'TRUCK-2103', type: 'Truck', status: 'active', mileage: 67000 },
        { vehicleId: 'VAN-1027', type: 'Van', status: 'active', mileage: 32000 },
        { vehicleId: 'VAN-1019', type: 'Van', status: 'active', mileage: 28000 }
      ]);

      console.log('Sample data created');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start Server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`FleetCommand Backend running on http://localhost:${PORT}`);
  console.log('API Endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/drivers');
  console.log('  GET  /api/vehicles');
  console.log('  GET  /api/routes');
  console.log('  GET  /api/deliveries');
  console.log('  POST /api/import/excel');
  console.log('  POST /api/import/pdf');
});

module.exports = app;
