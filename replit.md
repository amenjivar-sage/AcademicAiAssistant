# Sage Educational Writing Platform

## Overview

Sage is a comprehensive educational writing platform designed to support students and teachers in the academic writing process while maintaining academic integrity. The platform integrates AI-powered assistance with robust monitoring and feedback systems to create a balanced learning environment.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and building
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom educational theme
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express-session with PostgreSQL store for persistence
- **Authentication**: Username/password based with session-based auth
- **File Structure**: Monorepo with shared schemas between client/server

### Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for schema management
- **Session Storage**: Database-backed sessions for multi-user support

## Key Components

### User Management System
- **Role-based Access Control**: Student, Teacher, Admin, School Admin, and Sage Admin roles
- **User Registration**: Email-based registration with username auto-generation
- **Password Management**: Includes forgot credentials functionality with email recovery

### Writing Workspace
- **Real-time Editor**: Rich text editing with auto-save functionality
- **Page Constraints**: Academic formatting with proper page layout and constraints
- **Copy/Paste Detection**: Configurable monitoring of external content insertion
- **Word Count Tracking**: Real-time word count and writing analytics

### AI Integration
- **OpenAI Integration**: GPT-4 powered writing assistance through secure API
- **Restricted Prompts**: Filtering system to prevent academic dishonesty
- **Conversation History**: Persistent AI interaction logging for transparency
- **Configurable Permissions**: Per-assignment AI assistance controls

### Assignment Management
- **Assignment Creation**: Template-based and custom assignment creation
- **Classroom Organization**: Teacher-managed classrooms with student enrollment
- **Due Date Management**: Automatic status tracking and overdue detection
- **Submission System**: Student work submission with timestamp tracking

### Grading and Feedback
- **Inline Comments**: Contextual feedback within student writing
- **Rubric-based Grading**: Structured evaluation criteria
- **Teacher Dashboard**: Comprehensive view of student submissions
- **Analytics Integration**: Writing progress and performance tracking

### Communication System
- **Internal Messaging**: Platform-native messaging between users
- **Email Integration**: SendGrid for external communications
- **Feedback Collection**: Platform improvement feedback system

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Server validates against database user records
3. Session created and stored in PostgreSQL
4. User redirected to role-appropriate dashboard

### Writing Session Flow
1. Student selects assignment from dashboard
2. New writing session created or existing session loaded
3. Real-time content synchronization with auto-save
4. AI interactions logged with conversation history
5. Final submission triggers status update and notification

### Assignment Lifecycle
1. Teacher creates assignment with AI permission settings
2. Assignment distributed to selected classrooms
3. Students access and begin writing sessions
4. Teachers monitor progress and provide feedback
5. Final grading and analytics compilation

## External Dependencies

### Third-party Services
- **OpenAI API**: Language model integration for writing assistance
- **SendGrid**: Email delivery service for notifications and communications
- **Neon Database**: Serverless PostgreSQL hosting

### Key Libraries
- **Authentication**: express-session with connect-pg-simple
- **Database**: Drizzle ORM with pg (PostgreSQL driver)
- **AI Integration**: OpenAI SDK
- **Email**: SendGrid Mail API
- **UI Components**: Radix UI primitives with Shadcn/ui
- **Validation**: Zod for runtime type checking
- **Development**: Vite with React and TypeScript support

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20 environment
- **Database**: PostgreSQL 16 module provisioned automatically
- **Development Server**: Concurrent client/server with hot reloading
- **Port Configuration**: Server on port 5000, client dev server integrated

### Production Build
- **Client Build**: Vite production build to dist/public
- **Server Build**: ESBuild bundle to dist/index.js
- **Deployment Target**: Autoscale deployment on Replit
- **Static Assets**: Served from built client directory

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `SENDGRID_API_KEY`: Email service authentication
- `SESSION_SECRET`: Session encryption key

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.