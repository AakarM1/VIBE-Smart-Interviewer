# Verbal Insights - Developer Setup & Deployment Guide

## 🚀 Quick Start Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher  
- **Git**: Latest version
- **Firebase Account**: Optional (for cloud database)
- **Google AI Studio Account**: Required (for AI features)

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/AakarM1/Trajectorie---VIBE.git
cd Trajectorie---VIBE

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local
```

### 2. Environment Configuration

#### Required for AI Features:
```bash
# Google AI Studio API Key (Required)
GEMINI_API_KEY="your_google_ai_studio_api_key"
```

#### Optional for Cloud Database:
```bash
# Firebase Configuration (Optional - uses localStorage if missing)
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Force localStorage mode (Optional)
NEXT_PUBLIC_USE_LOCALSTORAGE="true"
```

### 3. Development Commands
```bash
# Start development server (localhost:3000)
npm run dev

# Start with Firebase emulators (requires Firebase CLI)
npm run dev:with-db

# Start AI development tools
npm run genkit:dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Development Environment Details

### Project Structure for Development:
```
📦 Development Environment
├── 🔥 Hot Module Replacement (Next.js)
├── 🤖 AI Development Tools (Genkit)
├── 📱 Real-time Preview (localhost:3000)
├── 🗄️ Local Storage (Default)
├── ☁️ Firebase Emulators (Optional)
└── 🔍 TypeScript Checking
```

### Default Test Accounts:
The application automatically seeds test accounts for development:

**Admin Account**:
- Email: `admin@gmail.com`
- Password: `admin123`
- Role: Administrator

**Super Admin Account**:
- Email: `superadmin@gmail.com`  
- Password: `superadmin123`
- Role: Super Administrator

**Test Candidates** (10 pre-seeded):
- Email: `candidate1@test.com` to `candidate10@test.com`
- Password: `password123`
- Various roles and companies

### Development Features:
- **Auto-reload**: Changes reflect immediately
- **Error Overlay**: Development error display
- **Console Logging**: Detailed operation logs
- **Storage Notification**: Visual indicator of storage type
- **User List**: Quick access to test accounts

## 🌐 Production Deployment Guide

### Vercel Deployment (Recommended)

#### 1. Prepare Repository:
```bash
# Ensure clean build
npm run build
npm run typecheck

# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 2. Vercel Setup:
1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select "Trajectorie---VIBE" folder

2. **Configure Build Settings**:
   ```bash
   # Build Command (auto-detected)
   npm run build
   
   # Output Directory (auto-detected)
   .next
   
   # Install Command (auto-detected)
   npm install
   ```

3. **Environment Variables**:
   ```bash
   # Required for AI Features
   GEMINI_API_KEY=your_google_ai_studio_api_key
   
   # Optional for Cloud Database
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build completion
   - Access your live application

#### 3. Post-Deployment:
```bash
# Your application will be available at:
https://your-project-name.vercel.app

# Admin dashboard:
https://your-project-name.vercel.app/admin

# API endpoints:
https://your-project-name.vercel.app/api/*
```

### Firebase Hosting (Alternative)

#### 1. Firebase CLI Setup:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init hosting
```

#### 2. Configure Firebase Hosting:
```json
// firebase.json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### 3. Build and Deploy:
```bash
# Build for static export
npm run build
npm run export

# Deploy to Firebase
firebase deploy --only hosting
```

## 🔒 Production Security Configuration

### 1. Firebase Security Rules:
```javascript
// firestore.rules - Production Security
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin users can access all data
    match /{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.role in ['admin', 'superadmin'];
    }
    
    // Submissions are readable by admins and the submitter
    match /submissions/{submissionId} {
      allow read: if request.auth != null && (
        resource.data.candidateId == request.auth.uid ||
        request.auth.token.role in ['admin', 'superadmin']
      );
      allow write: if request.auth != null;
    }
    
    // Configurations are admin-only
    match /configurations/{configId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role in ['admin', 'superadmin'];
    }
  }
}
```

### 2. Authentication Hardening:
```typescript
// Implement proper password hashing
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

### 3. Environment Security:
```bash
# Production environment variables (Vercel)
# Never commit these to version control

# Use secure, randomly generated keys
NEXTAUTH_SECRET="your_super_secure_random_string_here"
NEXTAUTH_URL="https://yourdomain.com"

# Restrict API access
ALLOWED_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"

# Database security
FIREBASE_ADMIN_KEY="your_firebase_admin_service_account_key"
```

## 📊 Monitoring & Analytics

### 1. Error Tracking Setup:
```bash
# Install error tracking (optional)
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  // Sentry configuration
});
```

### 2. Performance Monitoring:
```typescript
// Add to layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Application Monitoring:
```typescript
// Health check endpoint: /api/health
export async function GET() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkFirestoreConnection(),
      ai: await checkGeminiConnection(),
      storage: await checkStorageConnection()
    }
  };
  
  return Response.json(healthStatus);
}
```

## 🔄 CI/CD Pipeline (GitHub Actions)

### Automated Deployment Workflow:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type checking
        run: npm run typecheck
      
      - name: Run build
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🧪 Testing Configuration

### Test Setup:
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Test Configuration (`jest.config.js`):
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = createJestConfig(customJestConfig);
```

## 📈 Performance Optimization

### Production Optimizations:
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};
```

### Bundle Analysis:
```bash
# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Generate bundle report
ANALYZE=true npm run build
```

This comprehensive setup and deployment guide ensures smooth development experience and robust production deployment for the Verbal Insights platform.
