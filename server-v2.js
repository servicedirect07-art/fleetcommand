// FleetCommand Backend - Enhanced Version with Role-Based Access
// Features: Driver accounts, edit/delete drivers, transfer stops, stop details

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { Sequelize, DataTypes, Op } = require('sequelize');
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

// Serve frontend at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

// Database Setup
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
  role: { type: DataTypes.STRING, defaultValue: 'manager' } // 'manager' or 'driver'
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
  totalDeliveries: { type: DataTypes.INTEGER, defaultValue: 0 },
  hasAccount: { type: DataTypes.BOOLEAN, defaultValue: false }
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
  notes: { type: DataTypes.TEXT },
  phoneNumber: { type: DataTypes.STRING },
  specialInstructions: { type: DataTypes.TEXT },
  stopNumber: { type: DataTypes.INTEGER }
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

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }
    next();
  };
};

// ============= AUTHENTICATION ROUTES =============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'manager' } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      } 
    });
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

    const tokenData = { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    };
    
    // If driver, add driver info
    if (user.role === 'driver') {
      const driver = await Driver.findOne({ where: { email: user.email } });
      if (driver) {
        tokenData.driverId = driver.id;
        tokenData.driverName = driver.name;
      }
    }

    const token = jwt.sign(tokenData, JWT_SECRET);
    res.json({ token, user: tokenData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver-specific login
app.post('/api/auth/driver-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email, role: 'driver' } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const driver = await Driver.findOne({ where: { email } });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      role: 'driver',
      driverId: driver.id,
      driverName: driver.name
    }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: 'driver',
        driver: {
          id: driver.id,
          driverId: driver.driverId,
          name: driver.name,
          safetyScore: driver.safetyScore
        }
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DRIVER ROUTES =============

app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: [{
        model: Route,
        where: { status: { [Op.in]: ['pending', 'active'] } },
        required: false
      }]
    });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drivers', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const driver = await Driver.create({
      ...req.body,
      driverId: req.body.driverId || `DRV-${Date.now()}`
    });
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/drivers/:id', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    // If email is being changed and driver has account, update user email too
    if (req.body.email && req.body.email !== driver.email && driver.hasAccount) {
      const user = await User.findOne({ where: { email: driver.email } });
      if (user) {
        await user.update({ email: req.body.email });
      }
    }
    
    await driver.update(req.body);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/drivers/:id', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    // Check if driver has active routes
    const activeRoutes = await Route.count({ 
      where: { DriverId: driver.id, status: { [Op.in]: ['pending', 'active'] } }
    });
    
    if (activeRoutes > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete driver with active routes. Please reassign or complete routes first.',
        activeRoutesCount: activeRoutes
      });
    }
    
    // Delete associated user account if exists
    if (driver.hasAccount) {
      const user = await User.findOne({ where: { email: driver.email, role: 'driver' } });
      if (user) await user.destroy();
    }
    
    await driver.destroy();
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create driver account
app.post('/api/drivers/:id/create-account', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const { password } = req.body;
    const driver = await Driver.findByPk(req.params.id);
    
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    if (!driver.email) {
      return res.status(400).json({ error: 'Driver must have an email address' });
    }
    
    // Check if account already exists
    const existingUser = await User.findOne({ where: { email: driver.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Account already exists for this driver' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: driver.email.split('@')[0] + '_' + driver.driverId,
      email: driver.email,
      password: hashedPassword,
      role: 'driver'
    });
    
    await driver.update({ hasAccount: true });
    
    res.status(201).json({ 
      message: 'Driver account created successfully',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
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

app.post('/api/vehicles', authenticateToken, requireRole('manager'), async (req, res) => {
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
    let whereClause = {};
    
    // If driver, only show their routes
    if (req.user.role === 'driver' && req.user.driverId) {
      whereClause.DriverId = req.user.driverId;
    }
    
    const routes = await Route.findAll({
      where: whereClause,
      include: [
        { model: Driver, attributes: ['id', 'name', 'driverId', 'phone'] },
        { model: Vehicle, attributes: ['vehicleId', 'type'] },
        { 
          model: Delivery,
          attributes: ['id', 'deliveryId', 'address', 'customer', 'packages', 
                       'status', 'latitude', 'longitude', 'notes', 'stopNumber',
                       'phoneNumber', 'specialInstructions', 'scheduledTime']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/routes', authenticateToken, requireRole('manager'), async (req, res) => {
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
    
    // Drivers can only update their own routes and limited fields
    if (req.user.role === 'driver') {
      if (route.DriverId !== req.user.driverId) {
        return res.status(403).json({ error: 'Cannot update routes not assigned to you' });
      }
      // Drivers can only update status and completedStops
      const { status, completedStops, actualTime } = req.body;
      await route.update({ status, completedStops, actualTime });
    } else {
      await route.update(req.body);
    }
    
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Transfer stops between routes
app.post('/api/routes/transfer-stops', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const { deliveryIds, fromRouteId, toRouteId } = req.body;
    
    if (!deliveryIds || !fromRouteId || !toRouteId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const fromRoute = await Route.findByPk(fromRouteId);
    const toRoute = await Route.findByPk(toRouteId);
    
    if (!fromRoute || !toRoute) {
      return res.status(404).json({ error: 'One or both routes not found' });
    }
    
    // Update deliveries
    const updated = await Delivery.update(
      { RouteId: toRoute.id },
      { where: { id: { [Op.in]: deliveryIds }, RouteId: fromRoute.id } }
    );
    
    // Update route stop counts
    const fromRouteStops = await Delivery.count({ where: { RouteId: fromRoute.id } });
    const toRouteStops = await Delivery.count({ where: { RouteId: toRoute.id } });
    
    await fromRoute.update({ totalStops: fromRouteStops });
    await toRoute.update({ totalStops: toRouteStops });
    
    res.json({ 
      message: `Transferred ${updated[0]} stops successfully`,
      fromRoute: { id: fromRoute.id, totalStops: fromRouteStops },
      toRoute: { id: toRoute.id, totalStops: toRouteStops }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DELIVERY ROUTES =============

app.get('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    let whereClause = {};
    
    // If driver, only show deliveries from their routes
    if (req.user.role === 'driver' && req.user.driverId) {
      const driverRoutes = await Route.findAll({
        where: { DriverId: req.user.driverId },
        attributes: ['id']
      });
      const routeIds = driverRoutes.map(r => r.id);
      whereClause.RouteId = { [Op.in]: routeIds };
    }
    
    const deliveries = await Delivery.findAll({
      where: whereClause,
      include: [{ 
        model: Route, 
        include: [
          { model: Driver, attributes: ['name', 'driverId'] },
          { model: Vehicle, attributes: ['vehicleId'] }
        ] 
      }],
      order: [['stopNumber', 'ASC']]
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single delivery details
app.get('/api/deliveries/:id', authenticateToken, async (req, res) => {
  try {
    const delivery = await Delivery.findByPk(req.params.id, {
      include: [{ 
        model: Route, 
        include: [
          { model: Driver, attributes: ['name', 'driverId', 'phone'] },
          { model: Vehicle, attributes: ['vehicleId', 'type'] }
        ] 
      }]
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Check if driver can access this delivery
    if (req.user.role === 'driver' && req.user.driverId) {
      if (!delivery.Route || delivery.Route.DriverId !== req.user.driverId) {
        return res.status(403).json({ error: 'Cannot access this delivery' });
      }
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deliveries', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const delivery = await Delivery.create({
      ...req.body,
      deliveryId: req.body.deliveryId || `DEL-${Date.now()}`
    });
    res.status(201).json(delivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/deliveries/:id', authenticateToken, async (req, res) => {
  try {
    const delivery = await Delivery.findByPk(req.params.id, {
      include: [{ model: Route }]
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Drivers can only update their own deliveries
    if (req.user.role === 'driver') {
      if (!delivery.Route || delivery.Route.DriverId !== req.user.driverId) {
        return res.status(403).json({ error: 'Cannot update deliveries not assigned to you' });
      }
      // Drivers can only update status and notes
      const { status, notes } = req.body;
      await delivery.update({ status, notes });
    } else {
      await delivery.update(req.body);
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= FILE IMPORT ROUTES =============

app.post('/api/import/excel', authenticateToken, requireRole('manager'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const deliveries = [];
    const { optimizeRoutes, assignDrivers, sourceType } = req.body;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const delivery = await Delivery.create({
        deliveryId: `DEL-${Date.now()}-${i}`,
        address: row.Address || row.address || row.DELIVERY_ADDRESS || `Address ${i}`,
        customer: row.Customer || row.customer || row.NAME || `Customer ${i}`,
        packages: row.Packages || row.packages || row.PACKAGE_COUNT || 1,
        scheduledTime: row.Time || row.time || '9:00 AM - 5:00 PM',
        phoneNumber: row.Phone || row.phone || row.PHONE_NUMBER || '',
        specialInstructions: row.Instructions || row.instructions || row.NOTES || '',
        stopNumber: i + 1,
        status: 'pending'
      });
      deliveries.push(delivery);
    }

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
        
        for (const delivery of routeDeliveries) {
          await delivery.update({ RouteId: route.id });
        }
        
        routes.push(route);
      }
    }

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

// ============= ANALYTICS ROUTES =============

app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    let stats = {};
    
    if (req.user.role === 'driver' && req.user.driverId) {
      // Driver-specific stats
      const driverRoutes = await Route.findAll({
        where: { DriverId: req.user.driverId },
        attributes: ['id']
      });
      const routeIds = driverRoutes.map(r => r.id);
      
      stats = {
        myRoutes: await Route.count({ 
          where: { DriverId: req.user.driverId, status: { [Op.in]: ['pending', 'active'] } }
        }),
        myTodayDeliveries: await Delivery.count({
          where: { 
            RouteId: { [Op.in]: routeIds },
            status: { [Op.in]: ['pending', 'in_progress'] },
            createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        myCompletedToday: await Delivery.count({
          where: { 
            RouteId: { [Op.in]: routeIds },
            status: 'completed',
            updatedAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        myTotalDeliveries: await Delivery.count({
          where: { RouteId: { [Op.in]: routeIds } }
        })
      };
    } else {
      // Manager stats
      stats = {
        activeVehicles: await Vehicle.count({ where: { status: 'active' } }),
        activeDrivers: await Driver.count({ where: { status: 'active' } }),
        todayDeliveries: await Delivery.count({
          where: { 
            status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
            createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        completedDeliveries: await Delivery.count({ where: { status: 'completed' } }),
        activeRoutes: await Route.count({ where: { status: 'active' } }),
        totalDrivers: await Driver.count(),
        driversWithAccounts: await Driver.count({ where: { hasAccount: true } })
      };
    }

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

app.get('/api/compliance', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const documents = await Compliance.findAll();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/compliance', authenticateToken, requireRole('manager'), async (req, res) => {
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

    const driverCount = await Driver.count();
    if (driverCount === 0) {
      console.log('Creating sample data...');
      
      // Sample drivers
      const drivers = await Driver.bulkCreate([
        { driverId: 'DRV-1024', name: 'Maria Rodriguez', email: 'maria@fleetcommand.com', phone: '555-0101', licenseNumber: 'CDL12345', safetyScore: 4.9, status: 'active' },
        { driverId: 'DRV-2103', name: 'Kevin Johnson', email: 'kevin@fleetcommand.com', phone: '555-0102', licenseNumber: 'CDL23456', safetyScore: 4.8, status: 'active' },
        { driverId: 'DRV-1027', name: 'Ashley Williams', email: 'ashley@fleetcommand.com', phone: '555-0103', licenseNumber: 'CDL34567', safetyScore: 4.5, status: 'active' },
        { driverId: 'DRV-1019', name: 'Sarah Chen', email: 'sarah@fleetcommand.com', phone: '555-0104', licenseNumber: 'CDL45678', safetyScore: 4.9, status: 'active' }
      ]);

      // Sample vehicles
      await Vehicle.bulkCreate([
        { vehicleId: 'VAN-1024', type: 'Van', status: 'active', mileage: 45000 },
        { vehicleId: 'TRUCK-2103', type: 'Truck', status: 'active', mileage: 67000 },
        { vehicleId: 'VAN-1027', type: 'Van', status: 'active', mileage: 32000 },
        { vehicleId: 'VAN-1019', type: 'Van', status: 'active', mileage: 28000 }
      ]);
      
      // Create sample manager account
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        email: 'admin@fleetcommand.com',
        password: hashedPassword,
        role: 'manager'
      });

      console.log('Sample data created');
      console.log('Default manager login: admin / admin123');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start Server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`FleetCommand Backend v2.0 running on http://localhost:${PORT}`);
  console.log('Enhanced Features:');
  console.log('  ✓ Driver account creation and login');
  console.log('  ✓ Role-based access control (Manager/Driver)');
  console.log('  ✓ Edit and delete drivers');
  console.log('  ✓ Transfer stops between routes');
  console.log('  ✓ Detailed stop information');
  console.log('  ✓ Drivers see only their routes');
});

module.exports = app;
