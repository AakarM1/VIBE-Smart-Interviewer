"""
API Router initialization
Combines all API endpoints
"""

from fastapi import APIRouter

from app.api import submissions, configurations, tenants, statistics, competencies, reports

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include all sub-routers
api_router.include_router(submissions.router)
api_router.include_router(configurations.router)
api_router.include_router(tenants.router)
api_router.include_router(statistics.router)
api_router.include_router(competencies.router)
api_router.include_router(reports.router)