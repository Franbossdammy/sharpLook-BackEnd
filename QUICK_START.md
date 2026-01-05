# SHARPLOOK BACKEND - QUICK START GUIDE

## 📦 What You Received - Phase 1

You have received the **Phase 1** of the SharpLook backend, which includes:
- ✅ Complete project structure and configuration
- ✅ Database models (User, Category)
- ✅ Authentication & authorization system
- ✅ Security middlewares
- ✅ Error handling
- ✅ Logging system
- ✅ TypeScript compilation working
- ✅ Development environment ready

## 🚀 Getting Started

### Step 1: Extract the ZIP File
```bash
unzip sharplook-backend-phase1.zip
cd sharplook-backend
```

### Step 2: Install Dependencies
```bash
npm install
```
This will install all required packages (~894 packages).

### Step 3: Setup MongoDB
Make sure MongoDB is installed and running:
```bash
# Check if MongoDB is running
mongosh

# Or start MongoDB service
# macOS with Homebrew:
brew services start mongodb-community

# Ubuntu/Linux:
sudo systemctl start mongod

# Windows:
net start MongoDB
```

### Step 4: Setup Redis (Optional for Phase 1, Required Later)
```bash
# macOS with Homebrew:
brew services start redis

# Ubuntu/Linux:
sudo systemctl start redis

# Windows:
# Download and install Redis from GitHub
```

### Step 5: Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use any text editor
```

**Minimum required configuration for Phase 1:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sharplook
JWT_SECRET=your-very-secret-jwt-key-at-least-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key
```

### Step 6: Build the TypeScript
```bash
npm run build
```
This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 7: Run the Development Server
```bash
npm run dev
```

You should see:
```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║           🚀 SHARPLOOK SERVER STARTED 🚀            ║
║                                                      ║
║  Environment: development                            ║
║  Port: 5000                                          ║
║  API Version: v1                                     ║
║  URL: http://localhost:5000                          ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Step 8: Test the Server
Open a new terminal and test:
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API root
curl http://localhost:5000/api/v1
```

Expected responses:
```json
{
  "success": true,
  "message": "Server is running",
  "data": {
    "status": "healthy",
    "environment": "development",
    "timestamp": "2025-11-11T...",
    "uptime": 5.123
  },
  "timestamp": "2025-11-11T..."
}
```

## 📝 Available Scripts

```bash
# Development (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 🗂️ Project Structure

```
sharplook-backend/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   ├── models/            # Database models
│   ├── controllers/       # Route controllers (Phase 2+)
│   ├── routes/            # API routes (Phase 2+)
│   ├── middlewares/       # Custom middlewares
│   ├── services/          # Business logic (Phase 2+)
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── validations/       # Validators (Phase 2+)
│   ├── templates/         # Email templates (Phase 9)
│   ├── jobs/              # Background jobs (Phase 5+)
│   ├── sockets/           # WebSocket handlers (Phase 8)
│   ├── app.ts             # Express app
│   └── server.ts          # Server entry point
├── dist/                  # Compiled JavaScript
├── logs/                  # Application logs
├── node_modules/          # Dependencies
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Environment template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── README.md              # Full documentation
└── PHASE_1_SUMMARY.md     # Phase 1 details
```

## 🔑 Important Environment Variables

### Required for Phase 1:
- `NODE_ENV` - Application environment
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

### Required for Later Phases:
- `PAYSTACK_SECRET_KEY` - Paystack payment integration
- `SMTP_*` - Email configuration
- `CLOUDINARY_*` - File uploads
- `REDIS_URL` - Caching and sessions
- `FIREBASE_*` - Push notifications
- `TWILIO_*` - SMS and voice calls

## 🧪 Testing with Postman

1. Import the Postman collection:
   - Open Postman
   - Click Import
   - Select `postman_collection.json`

2. Set the base URL variable:
   - Collection → Variables
   - `base_url` = `http://localhost:5000/api/v1`

3. The collection includes:
   - Health check
   - Authentication endpoints (Phase 2)
   - User management (Phase 2)

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB service

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in .env or kill the process using port 5000

### TypeScript Compilation Errors
**Solution:** Make sure all dependencies are installed
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Module Not Found
**Solution:** Clear cache and reinstall
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

## 📚 What's Next?

**Phase 2 will include:**
- ✅ Authentication routes (register, login, logout)
- ✅ Email verification
- ✅ Password reset
- ✅ User profile management
- ✅ Role-based access control
- ✅ Vendor registration

**To continue to Phase 2, simply say "continue" in the chat.**

## 🆘 Need Help?

### Common Commands:
```bash
# View logs
tail -f logs/combined.log

# Check MongoDB connection
mongosh sharplook

# View all environment variables
cat .env

# Check Node.js version
node --version  # Should be >= 18.x

# Check npm version
npm --version
```

### File Locations:
- **Logs:** `logs/` directory
- **Compiled code:** `dist/` directory
- **Database:** MongoDB (sharplook database)
- **Environment:** `.env` file

## ✅ Verification Checklist

Before moving to Phase 2, verify:
- [ ] MongoDB is installed and running
- [ ] Node.js version is 18 or higher
- [ ] Dependencies installed successfully (`npm install`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Server starts successfully (`npm run dev`)
- [ ] Health endpoint returns success (`curl http://localhost:5000/health`)
- [ ] API root endpoint works (`curl http://localhost:5000/api/v1`)
- [ ] Logs directory is created
- [ ] `.env` file is configured

## 📞 Support

If you encounter any issues:
1. Check the error logs in `logs/error.log`
2. Review the `PHASE_1_SUMMARY.md` for detailed information
3. Check the `README.md` for comprehensive documentation
4. Verify all prerequisites are installed
5. Ask for help in the chat!

---

**Status:** ✅ Phase 1 Complete
**Ready for:** Phase 2 Implementation
**Last Updated:** November 11, 2025
