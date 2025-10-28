# 🚀 Production APK Configuration

## 📱 **Configure Your Server URL**

To build an APK that automatically connects to your deployed server (no user configuration needed):

### **Step 1: Update Server URL**

Edit the file: `app/src/config/AppConfig.js`

```javascript
const AppConfig = {
  // 🚀 REPLACE THIS WITH YOUR ACTUAL SERVER URL
  PRODUCTION_SERVER_URL: 'https://your-actual-server.onrender.com',
  
  // ... rest of config
};
```

### **Step 2: Build Production APK**

```bash
# Navigate to app directory
cd app

# Build production APK
npx react-native run-android --variant=release
# OR
cd android && ./gradlew assembleRelease
```

### **Step 3: Test**

The APK will automatically connect to your server URL. No user configuration required!

## 🔧 **How It Works**

### **Development Mode (`__DEV__ = true`)**
- Uses `localhost:3000` for local development
- Allows manual server configuration (if enabled)

### **Production APK (`__DEV__ = false`)**
- Automatically uses `AppConfig.PRODUCTION_SERVER_URL`
- No user configuration needed
- Direct connection to your deployed server

## 📋 **Example Configurations**

### **Render Deployment**
```javascript
PRODUCTION_SERVER_URL: 'https://narayana-app.onrender.com',
```

### **Vercel Deployment**
```javascript
PRODUCTION_SERVER_URL: 'https://narayana-app.vercel.app',
```

### **Custom Domain**
```javascript
PRODUCTION_SERVER_URL: 'https://api.yourapp.com',
```

### **Railway Deployment**
```javascript
PRODUCTION_SERVER_URL: 'https://narayana-app-production.up.railway.app',
```

## ✅ **Verification**

### **Test Your Configuration**
```javascript
// In your app, you can check which server is being used:
import backgroundRemovalService from './src/services/BackgroundRemovalService';

console.log('Server URL:', backgroundRemovalService.getConfig());
```

### **Expected Output:**
```javascript
// Development
{
  serverUrl: 'http://localhost:3000',
  isDevelopment: true,
  // ...
}

// Production APK
{
  serverUrl: 'https://your-server.onrender.com',
  isDevelopment: false,
  // ...
}
```

## 🎯 **Benefits**

✅ **Zero User Configuration**: Users just install and use  
✅ **Automatic Connection**: Connects to your server immediately  
✅ **Development Friendly**: Still works with localhost in development  
✅ **Easy Updates**: Change server URL in one place  
✅ **Professional**: No complex setup for end users  

## 🚀 **Ready for Release!**

Once configured, your APK will:
1. **Install** on user's device
2. **Automatically connect** to your server
3. **Work immediately** without any setup
4. **Process images** using your deployed server

**Perfect for distributing to users!** 🎉