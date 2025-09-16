# Trajectorie Assessment Platform - FastAPI Backend

A production-ready FastAPI backend for the Trajectorie multi-tenant assessment platform, replacing Firebase with PostgreSQL and providing comprehensive REST APIs for SJT (Situational Judgment Tests) and JDT (Job Diagnostic Tests).

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL (optional, SQLite is used by default for development)

### Installation & Setup

1. **Navigate to backend directory:**
   ```bash
   cd trajectorie_production/backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup environment:**
   ```bash
   # Copy environment configuration
   cp .env.example .env.local
   
   # Edit .env.local with your settings
   # For development, the defaults should work fine
   ```

4. **Start the server:**
   ```bash
   python run.py
   ```

   Or manually:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Verify installation:**
   - Health check: http://127.0.0.1:8000/health
   - API docs: http://127.0.0.1:8000/docs
   - Test script: `python test_api.py`

## 🏗️ Architecture

### Database Schema
The application uses a comprehensive PostgreSQL schema with multi-tenant support:

- **Users**: Multi-role user management (superadmin/admin/candidate)
- **Tenants**: Organization/company isolation
- **Submissions**: Test results with analysis data
- **Configurations**: Test and system configuration
- **Media Files**: Video/audio file management
- **User Sessions**: JWT token management
- **Audit Logs**: Complete audit trail

### Authentication System
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Session management with automatic cleanup
- Rate limiting for security

### Storage System
Flexible media storage supporting:
- **Local Storage**: For development and small deployments
- **AWS S3**: For production scalability
- **File validation**: Type and size checking
- **Secure URLs**: Presigned URLs for S3, served endpoints for local

## 📋 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### User Management
- `GET /users` - List users (admin only)
- `POST /users` - Create user (admin only)
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user (admin only)
- `DELETE /users/{id}` - Delete user (admin only)

### Submissions
- `GET /api/v1/submissions` - List submissions
- `POST /api/v1/submissions` - Create submission
- `GET /api/v1/submissions/{id}` - Get submission
- `PUT /api/v1/submissions/{id}` - Update submission
- `DELETE /api/v1/submissions/{id}` - Delete submission
- `POST /api/v1/submissions/{id}/media` - Upload media files
- `GET /api/v1/submissions/{id}/media` - List media files

### Configuration
- `GET /api/v1/configurations` - List configurations
- `POST /api/v1/configurations` - Create configuration
- `GET /api/v1/configurations/{id}` - Get configuration
- `PUT /api/v1/configurations/{id}` - Update configuration
- `GET /api/v1/configurations/type/{type}` - Get by type
- `POST /api/v1/configurations/sjt` - Save SJT config
- `GET /api/v1/configurations/sjt` - Get SJT config
- `POST /api/v1/configurations/jdt` - Save JDT config
- `GET /api/v1/configurations/jdt` - Get JDT config

### Tenant Management (Superadmin only)
- `GET /api/v1/tenants` - List tenants
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants/{id}` - Get tenant
- `PUT /api/v1/tenants/{id}` - Update tenant
- `GET /api/v1/tenants/{id}/users` - List tenant users
- `POST /api/v1/tenants/{id}/users` - Create tenant user
- `GET /api/v1/tenants/{id}/statistics` - Tenant statistics

## 🔧 Configuration

### Environment Variables (.env.local)

```bash
# Database
DATABASE_URL=sqlite:///./trajectorie.db
# For PostgreSQL: postgresql://user:password@localhost:5432/trajectorie

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage
STORAGE_PROVIDER=local  # or 's3'
STORAGE_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=trajectorie-uploads
AWS_S3_REGION=us-east-1

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Database Migration

For PostgreSQL:
```bash
# Install PostgreSQL and create database
createdb trajectorie

# Update DATABASE_URL in .env.local
DATABASE_URL=postgresql://username:password@localhost:5432/trajectorie

# The application will automatically create tables on startup
python main.py
```

## 🧪 Testing

### Run API Tests
```bash
# Make sure server is running on localhost:8000
python test_api.py
```

### Development Tools
```bash
# Access interactive API documentation
http://127.0.0.1:8000/docs

# Check health status
curl http://127.0.0.1:8000/health

# Test login (default superadmin)
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@gmail.com", "password": "superadmin123"}'
```

## 🔐 Default Users

The system creates default users on first startup:

- **Superadmin**: `superadmin@gmail.com` / `superadmin123`
- **Admin**: `admin@gmail.com` / `admin123`

**⚠️ Change these passwords in production!**

## 🚀 Deployment

### Production Checklist

1. **Security**:
   - Change default passwords
   - Use strong SECRET_KEY
   - Enable HTTPS
   - Configure proper CORS origins
   - Set up rate limiting

2. **Database**:
   - Use PostgreSQL in production
   - Set up database backups
   - Configure connection pooling

3. **Storage**:
   - Use S3 for file storage
   - Configure CDN for media delivery
   - Set up proper IAM policies

4. **Monitoring**:
   - Set up application logging
   - Configure health checks
   - Monitor database performance

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🛠️ Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── auth.py          # Authentication & authorization
│   ├── database.py      # Database configuration
│   ├── models.py        # SQLAlchemy models & Pydantic schemas
│   ├── storage.py       # File storage management
│   └── api/
│       ├── __init__.py
│       ├── submissions.py   # Submission endpoints
│       ├── configurations.py # Configuration endpoints
│       └── tenants.py       # Tenant management
├── database/
│   └── schema.sql       # PostgreSQL schema
├── main.py              # FastAPI application
├── run.py               # Development server script
├── test_api.py          # API test suite
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── README.md
```

### Adding New Features

1. **Models**: Add to `app/models.py`
2. **API Endpoints**: Create new router in `app/api/`
3. **Business Logic**: Add service functions
4. **Tests**: Update `test_api.py`
5. **Documentation**: Update this README

## 🔄 Migration from Firebase

This backend replaces the Firebase/Firestore backend with equivalent functionality:

### Data Migration
- Export data from Firebase using the admin SDK
- Transform Firestore documents to PostgreSQL rows
- Migrate file URLs from Firebase Storage to S3/local

### API Compatibility
- Maintains similar response structures
- Preserves existing data relationships
- Supports same authentication flows

### Performance Improvements
- Reduced latency with dedicated database
- Better query performance with SQL
- Optimized for concurrent users (1000+)

## 📞 Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Run the test suite with `python test_api.py`
3. Check application logs for errors
4. Verify database connectivity with `/health`

## 📈 Roadmap

- [ ] Background task processing with Celery
- [ ] Advanced analytics and reporting
- [ ] Real-time notifications
- [ ] API versioning
- [ ] GraphQL endpoint
- [ ] Advanced caching with Redis