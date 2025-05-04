require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { createServer } = require('http');
const { Server } = require('socket.io');
require("./config/passport");
const { sendFeaturesToAI } = require('./utils/api');
const { extractFeaturesFromRequest } = require('./utils/featureExtract');
const fs = require('fs');
const path = require('path');


const RequestLog = require('./models/requestLog');
const User = require('./models/user');
const BlacklistedIp = require('./models/blacklistedIp');
const Threat = require('./models/threat');
const threatRoutes = require('./api/threats');

const loginFeatureLogPath = path.join(__dirname, 'login_features_log.csv');

console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: "*",  // Allow all origins in development
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(morgan('tiny'));

// Add session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ✅ Rate Limiting (500 requests per 15 minutes per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: "Too many requests from this IP. Try again later.",
});
app.use(limiter);

// ✅ IP Blacklist Middleware
app.use(async (req, res, next) => {
    try {
        const blacklistedIp = await BlacklistedIp.findOne({ ip: req.ip });
        if (blacklistedIp) {
            return res.status(403).json({ message: "Your IP is blacklisted", reason: blacklistedIp.reason });
        }
        next();
    } catch (error) {
        console.error("Error checking blacklisted IP:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log("🔐 Incoming Authorization Header:", authHeader);  // ADD THIS

    if (!authHeader) {
        return res.status(401).json({ message: "Access Denied - No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token format" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        console.error("❌ Token Verification Failed:", error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};


// ✅ Role-Based Access Control (Only Admins can access certain routes)
const authorizeRole = (role) => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({ message: "Access Denied - Insufficient Permissions" });
    }
    next();
};

// ✅ Request Logging Middleware (Logs After Response is Sent)
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', async () => {
        try {
            const diff = process.hrtime(start);
            const responseTime = (diff[0] * 1e3) + (diff[1] / 1e6); // ms
            const log = new RequestLog({
                ip: req.ip,
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                responseTime: responseTime
            });
            console.log("[DEBUG] Attempting to save log:", log);
            console.log("[DEBUG] Mongoose connection state:", mongoose.connection.readyState); // 1 = connected
            const saved = await log.save();
            console.log("[DEBUG] Request logged and saved:", saved);
        } catch (error) {
            console.error("[DEBUG] Error logging request:", error);
        }
    });
    next();
});

// ✅ Secure API Endpoint
app.get('/secure-data', authenticateJWT, (req, res) => {
    res.json({ message: "Secure Data Accessed!", user: req.user });
});

// ✅ Register a New User
app.post('/api/register', async (req, res) => {
    try {
      console.log("Received registration request body:", req.body);
      
      const {
        firstName,
        lastName,
        email,
        password,
        role
      } = req.body;
  
      // Log each field separately
      console.log("firstName:", firstName);
      console.log("lastName:", lastName);
      console.log("email:", email);
      console.log("password:", password ? "***" : "missing");
      console.log("role:", role);
  
      // Validate required fields
      const missingFields = [];
      if (!firstName?.trim()) missingFields.push('firstName');
      if (!lastName?.trim()) missingFields.push('lastName');
      if (!email?.trim()) missingFields.push('email');
      if (!password?.trim()) missingFields.push('password');

      if (missingFields.length > 0) {
        console.log("Missing required fields:", missingFields);
        return res.status(400).json({ 
          message: "Missing required fields",
          missingFields: missingFields
        });
      }
  
      // Check if the email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        console.log("Email already exists:", email);
        return res.status(400).json({ message: "Email already taken" });
      }
  
      // Hash the password before saving it
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("Hashed password during registration:", hashedPassword);

      // Create the new user with all fields
      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || "admin"
      });

      console.log("User to be saved:", JSON.stringify(newUser, null, 2));
  
      // Save the new user to the database
      try {
        await newUser.save();
        console.log("User saved successfully");
      } catch (saveError) {
        console.error("Error saving user to database:", saveError);
        if (saveError.code === 11000) {
          return res.status(400).json({ 
            message: "Email already exists",
            error: "DUPLICATE_KEY"
          });
        }
        throw saveError;
      }

      // Return the created user (excluding sensitive data)
      const userResponse = {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin,
        isActive: newUser.isActive
      };

      console.log("Sending response:", JSON.stringify(userResponse, null, 2));
      res.status(201).json({ 
        message: "User registered successfully",
        user: userResponse
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ 
        message: "Error registering user",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  
  // ✅ Login User & Generate JWT Token
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password, googleId } = req.body;
      console.log('Login attempt:', { email, password: password ? '***' : 'missing', googleId });
  
      // Log features and label for retraining
      function logLoginFeatures(features, label) {
        const row = features.join(',') + ',' + label + '\n';
        // If file doesn't exist, write header first
        if (!fs.existsSync(loginFeatureLogPath)) {
          const header = [
            'email_length','password_length','password_special_chars','is_post','is_login_endpoint',
            'user_agent_length','ip1','ip2','ip3','ip4','time_since_last','body_field_count',
            'has_sql','has_script','hour','day','is_gmail','is_yahoo','is_outlook','dummy','label'
          ].join(',') + '\n';
          fs.writeFileSync(loginFeatureLogPath, header);
        }
        fs.appendFileSync(loginFeatureLogPath, row);
      }
  
      // --- THREAT DETECTION (runs for all login attempts) ---
      const features = extractFeaturesFromRequest(req);
      console.log('[DEBUG] Features sent to AI:', features);
      try {
        const aiResult = await sendFeaturesToAI(features);
        console.log('[AI] Threat detection result:', aiResult);
        
        // Log features and label for retraining
        const isBenign = aiResult.threatType === 'BENIGN';
        logLoginFeatures(features, isBenign ? 'benign' : 'attack');
        
        if (!isBenign) {
          // Map threat types to match the enum in the Threat model
          const threatTypeMap = {
            'SQL_INJECTION': 'SQL Injection',
            'XSS': 'XSS Attack',
            'BRUTE_FORCE': 'Brute Force',
            'PORT_SCAN': 'Port scan'
          };
          
          const mappedThreatType = threatTypeMap[aiResult.threatType] || aiResult.threatType;
          
          // Log the threat and mark it as blocked
          await Threat.create({ 
            ip: req.ip, 
            threatType: mappedThreatType, 
            confidence: aiResult.confidence,
            status: 'blocked',
            details: {
              confidence: aiResult.confidence,
              timestamp: new Date()
            }
          });
          
          // Add IP to blacklist
          await BlacklistedIp.create({
            ip: req.ip,
            reason: `Blocked due to ${mappedThreatType} attempt`,
            blockedAt: new Date()
          });
          
          return res.status(403).json({ 
            message: `Threat detected and blocked: ${mappedThreatType}`,
            confidence: aiResult.confidence
          });
        }
      } catch (aiErr) {
        console.error('[AI] Error calling AI model:', aiErr);
        // Optionally, continue or block on AI error
      }
      // --- END THREAT DETECTION ---
  
      if (googleId) {
        // Handle Google login
        const user = await User.findOne({ googleId });
        if (!user) {
          console.log('Google account not found for googleId:', googleId);
          return res.status(400).json({ message: 'Google account not found' });
        }
        
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        return res.json({ 
          token,
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive
          }
        });
      } else {
        // Handle regular login
        const user = await User.findOne({ email });
        if (!user) {
          console.log('User not found for email:', email);
          return res.status(400).json({ message: 'Invalid Email' });
        }
  
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.log('Password mismatch for email:', email);
          return res.status(400).json({ message: 'Invalid password' });
        }
        console.log('Login successful for email:', email);
  
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        res.json({ 
          token,
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive
          }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  

// ✅ Log Threats
app.post('/api/threats', authenticateJWT, async (req, res) => {
    try {
        const { ip, threatType, confidence, status } = req.body;
        const newThreat = new Threat({ 
            ip, 
            threatType,
            confidence,
            status,
            detectedAt: new Date()
        });
        await newThreat.save();
        
        // Broadcast the new threat to all connected clients
        io.emit('newThreat', newThreat);
        
        res.status(201).json({ message: "Threat logged successfully" });
    } catch (error) {
        console.error("Error logging threat:", error);
        res.status(500).json({ message: "Error logging threat" });
    }
});

// ✅ Get Recent Threats (optional: protected)
app.get('/api/threats', authenticateJWT, async (req, res) => {
    try {
        const threats = await Threat.find().sort({ detectedAt: -1 }).limit(50);
        res.status(200).json(threats);
    } catch (error) {
        console.error("Error fetching threats:", error);
        res.status(500).json({ message: "Error fetching threats" });
    }
});


// ✅ Get Request Logs (Only Admins)
app.get('/api/logs', authenticateJWT, authorizeRole("admin"), async (req, res) => {
    try {
        const logs = await RequestLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        console.error("Error retrieving logs:", error);
        res.status(500).json({ message: "Error retrieving logs" });
    }
});

// ✅ Total API requests
app.get('/api/stats/requests', async (req, res) => {
    try {
        const count = await RequestLog.countDocuments();
        res.json({ totalRequests: count });
    } catch (err) {
        console.error("Error fetching total requests:", err);
        res.status(500).json({ message: "Failed to fetch request count" });
    }
});

// ✅ Blocked threats count
app.get('/api/stats/blocked', async (req, res) => {
    try {
        const count = await Threat.countDocuments({ status: 'blocked' });
        res.json({ blockedThreats: count });
    } catch (err) {
        console.error("Error fetching blocked threats:", err);
        res.status(500).json({ message: "Failed to fetch blocked threats count" });
    }
});

// ✅ Get blocked threats timeline
app.get('/api/stats/blocked-timeline', async (req, res) => {
    try {
        const range = req.query.range || 'day'; // day, week, month
        const now = new Date();
        let startDate;

        switch(range) {
            case 'day':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const timeline = await Threat.aggregate([
            {
                $match: {
                    status: 'blocked',
                    detectedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$detectedAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        res.json({ timeline });
    } catch (err) {
        console.error("Error fetching blocked threats timeline:", err);
        res.status(500).json({ message: "Failed to fetch blocked threats timeline" });
    }
});

// ✅ Average Response Time Endpoint
app.get('/api/stats/avg-response-time', async (req, res) => {
    try {
        const result = await RequestLog.aggregate([
            { $match: { responseTime: { $exists: true } } },
            { $group: { _id: null, avg: { $avg: "$responseTime" } } }
        ]);
        const avgResponseTime = result.length > 0 ? result[0].avg : 0;
        res.json({ avgResponseTime });
    } catch (error) {
        console.error("Error calculating average response time:", error);
        res.status(500).json({ message: "Error calculating average response time" });
    }
});

// ✅ Enhanced Traffic Monitor Endpoint (Supports hour, day, week, month, and both detected and blocked threats)
app.get('/api/stats/traffic', async (req, res) => {
    try {
        const range = req.query.range || 'hour';
        let start, group, labelFormat, numPoints;
        const now = new Date();

        if (range === 'day') {
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            group = {
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" },
                hour: { $hour: "$timestamp" }
            };
            labelFormat = t => t.getUTCHours().toString().padStart(2, '0') + ':00';
            numPoints = 24;
        } else if (range === 'week') {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            group = {
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" }
            };
            labelFormat = t => (t.getUTCMonth() + 1) + '/' + t.getUTCDate();
            numPoints = 7;
        } else if (range === 'month') {
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            group = {
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" }
            };
            labelFormat = t => (t.getUTCMonth() + 1) + '/' + t.getUTCDate();
            numPoints = 30;
        } else { // 'hour' (default)
            start = new Date(now.getTime() - 60 * 60 * 1000);
            group = {
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" },
                hour: { $hour: "$timestamp" },
                minute: { $minute: "$timestamp" }
            };
            labelFormat = t => t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0');
            numPoints = 60;
        }

        // Total pipeline
        const totalPipeline = [
            { $match: { timestamp: { $gte: start } } },
            { $group: { _id: group, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
        ];

        // Detected threats pipeline (all non-BENIGN)
        const detectedPipeline = [
            { $match: { detectedAt: { $gte: start }, threatType: { $ne: 'BENIGN' } } },
            { $group: { _id: group, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
        ];

        // Blocked threats pipeline (status: 'blocked')
        const blockedPipeline = [
            { $match: { detectedAt: { $gte: start }, status: 'blocked' } },
            { $group: { _id: group, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
        ];

        const [totalResults, detectedResults, blockedResults] = await Promise.all([
            RequestLog.aggregate(totalPipeline),
            Threat.aggregate(detectedPipeline),
            Threat.aggregate(blockedPipeline)
        ]);

        // Build traffic array
        const traffic = [];
        for (let i = numPoints - 1; i >= 0; i--) {
            let t;
            if (range === 'day') {
                t = new Date(now.getTime() - i * 60 * 60 * 1000);
            } else if (range === 'week' || range === 'month') {
                t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            } else {
                t = new Date(now.getTime() - i * 60 * 1000);
            }

            let total, detected, blocked;
            if (range === 'day') {
                total = totalResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours()
                );
                detected = detectedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours()
                );
                blocked = blockedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours()
                );
            } else if (range === 'week' || range === 'month') {
                total = totalResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate()
                );
                detected = detectedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate()
                );
                blocked = blockedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate()
                );
            } else {
                total = totalResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours() &&
                    r._id.minute === t.getUTCMinutes()
                );
                detected = detectedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours() &&
                    r._id.minute === t.getUTCMinutes()
                );
                blocked = blockedResults.find(r =>
                    r._id.year === t.getUTCFullYear() &&
                    r._id.month === t.getUTCMonth() + 1 &&
                    r._id.day === t.getUTCDate() &&
                    r._id.hour === t.getUTCHours() &&
                    r._id.minute === t.getUTCMinutes()
                );
            }

            traffic.push({
                label: labelFormat(t),
                total: total ? total.count : 0,
                detected: detected ? detected.count : 0,
                blocked: blocked ? blocked.count : 0
            });
        }

        res.json({ traffic });
    } catch (error) {
        console.error("Error fetching traffic stats:", error);
        res.status(500).json({ message: "Error fetching traffic stats" });
    }
});

// Configure Passport
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        // Check if user exists with the same email but no googleId
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Update existing user with googleId
          user.googleId = profile.id;
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            role: 'user'
          });
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Routes
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, generate JWT
    const token = jwt.sign(
      { 
        id: req.user._id, 
        email: req.user.email, 
        role: req.user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secureapi', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB Connected');
    console.log('MongoDB Connection State:', mongoose.connection.readyState);
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    console.error('MongoDB Connection State:', mongoose.connection.readyState);
});

// ✅ Start Server
const PORT = process.env.PORT || 5001;
// ✅ Threat logging and fetch route (used by AI module and dashboard)
app.use('/api', threatRoutes);

// Get user profile
app.get('/api/user/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -googleId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Error fetching user profile" });
    }
});

// Get all users (admin only)
app.get('/api/users', authenticateJWT, authorizeRole('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password -googleId');
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

httpServer.listen(PORT, '0.0.0.0', () => console.log(`API Gateway running on port ${PORT}`));

