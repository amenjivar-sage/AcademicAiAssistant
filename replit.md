# Sage Educational Platform

## Overview

Sage is a comprehensive educational writing platform that combines traditional writing tools with AI assistance to help students improve their writing skills while maintaining academic integrity. The platform serves teachers, students, administrators, and school administrators with role-based dashboards and features.

## System Architecture

This is a full-stack TypeScript application built with:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API endpoints
- **Session Management**: express-session with PostgreSQL session store
- **Authentication**: Session-based authentication with role-based access control

### Database Architecture
- **Database**: PostgreSQL with Neon serverless provider
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Comprehensive educational schema with users, assignments, writing sessions, classrooms, and AI interactions
- **Migrations**: Drizzle Kit for schema management

## Key Components

### User Management System
- Multi-role authentication (student, teacher, admin, school_admin, sage_admin)
- Automatic username generation with fallback strategies
- Password recovery with temporary password email system
- FERPA/COPPA compliance features for educational data protection

### Writing System
- Real-time writing sessions with auto-save functionality
- AI-powered writing assistance with OpenAI integration
- Plagiarism detection through copy-paste monitoring
- Grammar and spell checking capabilities
- Citation assistant for academic references
- Page-constrained editor mimicking traditional paper format

### Assignment Management
- Template-based assignment creation
- Classroom-based assignment distribution
- Due date tracking and overdue detection
- Submission and grading workflows
- Teacher feedback and inline commenting system

### AI Integration
- OpenAI GPT-4 integration for writing assistance
- Restricted prompt detection to prevent academic dishonesty
- Conversation history tracking for transparency
- AI disclosure compliance for educational use

### Analytics and Progress Tracking
- Writing streak tracking and gamification
- Word count analytics and progress metrics
- Achievement system with badges and milestones
- Teacher insights dashboard for student progress

## Data Flow

1. **Authentication Flow**: Users log in through session-based auth, with role-based routing to appropriate dashboards
2. **Writing Flow**: Students create writing sessions linked to assignments, with real-time auto-save and AI assistance
3. **Grading Flow**: Teachers access submissions, provide feedback through inline comments, and assign grades
4. **Analytics Flow**: System tracks writing metrics, calculates streaks, and generates progress reports

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting
- **OpenAI API**: GPT-4 language model for AI assistance
- **SendGrid**: Email service for notifications and password recovery

### Development Tools
- **Replit**: Primary development and hosting environment
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Production bundling for server-side code

### Frontend Libraries
- **Radix UI**: Accessible component primitives
- **TanStack Query**: Server state management
- **date-fns**: Date manipulation utilities
- **Wouter**: Lightweight React router

## Deployment Strategy

The application is configured for both Replit and Render deployment:

### Development Environment
- **Development**: `npm run dev` starts both frontend (Vite) and backend (Express) servers
- **Hot Reload**: Full HMR support for both frontend and backend development

### Production Deployment (Render)
- **Production Build**: `npm run build` creates optimized frontend assets and bundles server code
- **Production Server**: `npm run start` runs the bundled Node.js application
- **Database**: Automatic migrations run on startup via `runMigrations()`
- **Sessions**: PostgreSQL-backed session storage for production scalability
- **Environment Variables**: All secrets configured via Render dashboard
- **Spell Check**: Professional Merriam-Webster Dictionary API integration with fallback systems

### Production Deployment Checklist
- ✅ Spell check system fully functional with proper button behavior
- ✅ Data format consistency between API and UI resolved
- ✅ Merriam-Webster Dictionary API integration confirmed working
- ✅ Individual word correction vs. bulk correction features distinct and labeled
- ✅ Auto-save and session management stable
- ✅ Authentication system with personalized dashboard displays
- ✅ FERPA/COPPA compliance features implemented
- ✅ Email service (SendGrid) operational for password recovery
- ✅ Copy-paste detection for academic integrity
- ✅ Production build process tested and optimized

## Changelog

- June 28, 2025: Successfully resolved spell check system issues - "Fix This Word" button now functions correctly for individual word corrections while "Fix All" handles multiple errors
- June 28, 2025: Fixed spell check data format consistency - API responses and UI expectations now properly aligned with suggestions arrays
- June 28, 2025: Enhanced spell check button clarity - distinct labeling prevents user confusion between single-word and bulk correction actions
- June 28, 2025: Fixed personalized authentication display - Alexander's name now shows correctly in dashboard header instead of generic "Student"
- June 28, 2025: Optimized spell check performance with parallel batch processing - 15 words processed simultaneously instead of sequentially
- June 28, 2025: Confirmed Merriam-Webster Dictionary API fully operational with professional accuracy
- June 25, 2025: Email system fully operational on Render - SendGrid accepting emails with 202 status codes
- June 25, 2025: Added delivery tracking and improved email settings to enhance inbox delivery rates
- June 25, 2025: Diagnosed email delivery issues with Yahoo Mail - system working but emails filtered by recipient providers
- June 25, 2025: Password reset system working correctly in all environments - generates emails and updates passwords even without SendGrid configured
- June 25, 2025: Complete password reset flow implemented - users with temporary passwords are automatically redirected to password change page after login
- June 25, 2025: Added secure password change endpoint with proper validation and session handling
- June 25, 2025: Fixed temporary password detection logic to correctly identify system-generated passwords
- June 25, 2025: SendGrid email delivery confirmed working with verified sender sage.edu21@gmail.com - password reset emails now delivering
- June 25, 2025: Complete password reset system with automatic email delivery, secure temporary passwords, and professional branding
- June 25, 2025: Fixed forgot credentials API endpoint - resolved "Unexpected token" JSON parsing error on Render deployment
- June 25, 2025: Fixed student feedback submission issue - feedback now properly appears in Sage admin dashboard
- June 25, 2025: Added comprehensive school admin submissions access with read-only oversight
- June 25, 2025: Simplified student formatting toolbar to only include spell check functionality
- June 25, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.