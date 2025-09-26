# Omni Cloud - Push Button Deploy

🚀 **One-click deployment** license management system with real-time WebSocket updates.

## 🎯 Quick Deploy

Click below to deploy instantly:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/yourusername/omni-cloud-pushbutton)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/omni-cloud-pushbutton)

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new/template/https://github.com/yourusername/omni-cloud-pushbutton)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/yourusername/omni-cloud-pushbutton)

## 🔧 Environment Variables

Set these environment variables in your deployment platform:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/omnicloud` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key-here` |
| `API_URL` | Frontend API URL | `https://your-app.vercel.app` |
| `ADMIN_USERNAME` | Admin username | `admin` |
| `ADMIN_PASSWORD` | Admin password | `secure-password` |

## ✨ Features

### 🔐 Backend API
- **License Management**: Create, check, toggle, extend licenses
- **User Authentication**: JWT-based auth system
- **WebSocket Support**: Real-time updates and events
- **Admin Panel**: Complete license and user management
- **Debug/Logging**: Comprehensive logging system

### 📱 Client Panel
- **License Verification**: Simple license key checking
- **Real-time Updates**: WebSocket connection for live events
- **Clean UI**: Minimal, responsive design
- **Status Display**: Connection and license status

### 🛠️ Admin GUI
- **Real-time Monitoring**: Live event logs and statistics
- **License Control**: View, toggle, and manage all licenses
- **User Management**: Monitor connected users
- **System Stats**: Uptime, events, and performance metrics

### 🎛️ Conditional License Logic
- **Demo Mode**: Limited features, 7-day trial
- **Basic Plan**: Standard features, 90-day validity
- **Premium Plan**: Full features, 365-day validity
- **Enterprise**: Unlimited access and custom features

### 📊 Real-time Debug Logs
- **Live Monitoring**: Real-time event streaming
- **Error Tracking**: Automatic error logging and alerts
- **Performance Metrics**: System performance monitoring
- **Export Functionality**: Download logs for analysis

## 🚀 Local Development

If you want to run locally:

```bash
# Clone repository
git clone https://github.com/yourusername/omni-cloud-pushbutton.git
cd omni-cloud-pushbutton

# Install dependencies
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# Run tests
npm test
```

## 📁 Project Structure

```
omni-cloud-pushbutton/
├── backend/           # Express.js API server
│   ├── server.js     # Main server file
│   ├── package.json  # Dependencies and scripts
│   ├── test.js       # Test scenarios
│   └── debug.js      # Debug and logging system
├── client/           # Client panel
│   ├── index.html    # Client UI
│   └── app.js        # Client logic
├── admin/            # Admin panel
│   ├── index.html    # Admin UI
│   └── admin.js      # Admin logic
├── test-runner.js    # Test automation
├── README.md         # This file
├── DEPLOYMENT.md     # Detailed deployment guide
└── .gitignore        # Git ignore rules
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### License Management
- `POST /api/license/create` - Create new license
- `POST /api/license/check` - Verify license
- `POST /api/license/toggle` - Toggle license status
- `POST /api/license/extend` - Extend license validity

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/licenses` - List all licenses

## 🌐 WebSocket Events

### Client Events
- `license_update` - License status changes
- `user_connected` - User connection events
- `system_alert` - System notifications

### Admin Events
- `admin_stats` - Real-time statistics
- `license_created` - New license notifications
- `user_activity` - User activity monitoring

## 🧪 Testing

Run comprehensive tests:

```bash
# Quick tests
npm run test:quick

# Full test suite
npm run test:full

# Debug mode tests
npm run test:debug

# Watch mode
npm run test:watch
```

## 🔒 Security Features

- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Environment variable protection
- SQL injection prevention
- XSS protection

## 📈 Monitoring

- Real-time connection monitoring
- License usage analytics
- Error tracking and alerting
- Performance metrics
- System health checks

## 🆘 Support

- **Documentation**: Check `DEPLOYMENT.md` for detailed setup
- **Issues**: Report bugs via GitHub issues
- **Tests**: Run `npm test` to verify functionality
- **Logs**: Check admin panel for real-time debugging

## 📄 License

MIT License - see LICENSE file for details.

---

**🎉 Ready to deploy? Click one of the deploy buttons above and you'll be live in minutes!**

*All previous functionality (Ultimate Dev Mode, WebSocket, license API, conditional logic, debug/log, test scenarios) is included and ready for production use.*