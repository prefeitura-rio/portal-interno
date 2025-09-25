# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack)
- **Build**: `npm run build`
- **Start production**: `npm start`
- **Lint/Format**: `npm run lint` (uses Biome for both linting and formatting)

## Project Architecture

This is a Next.js 15.3.1 application with TypeScript, using the App Router. The project is an internal admin portal ("Portal Interno") with role-based access control and multiple service integrations.

### Key Technologies
- **Framework**: Next.js with App Router
- **UI**: Radix UI components with Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js with JWT tokens
- **Code Quality**: Biome (replaces ESLint + Prettier)
- **API Generation**: Orval for OpenAPI client generation

### Directory Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── (private)/          # Protected routes requiring authentication
│   │   ├── (app)/          # Main application routes
│   │   │   ├── gorio/      # Gorio system integration
│   │   │   └── servicos-municipais/  # Municipal services module
│   │   └── (public)/       # Public routes (when authenticated)
│   └── api/                # API routes
├── components/             # Reusable UI components
├── http-busca-search/      # Generated API client for search service
├── http-gorio/            # Generated API client for Gorio system
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── middleware.ts          # Next.js middleware for auth and CSP
```

### Authentication & Authorization

The application uses a sophisticated JWT-based authentication system with:

- **Role-based access control (RBAC)** - Users must have `admin:login` role
- **Route-level permissions** - Defined in `src/lib/route-permissions.ts`
- **JWT token management** - Automatic refresh, expiry handling
- **CSP headers** - Comprehensive Content Security Policy

Key files:
- `src/middleware.ts` - Authentication middleware and CSP configuration
- `src/lib/jwt-utils.ts` - JWT token utilities
- `src/lib/route-permissions.ts` - Route access control
- `src/lib/middleware-helpers.ts` - Helper functions for middleware

### API Integration

The project integrates with multiple external APIs:

1. **Busca Search API** - Search functionality
   - Generated client in `src/http-busca-search/`
   - Custom fetch wrapper: `custom-fetch-busca-search.ts`

2. **Gorio API** - Course and job management system
   - Generated client in `src/http-gorio/`
   - Custom fetch wrapper: `custom-fetch-gorio.ts`

3. **Serviços Municipais** - Municipal services
   - Currently uses mock data with API adapter pattern
   - See `MIGRATION_GUIDE.md` for API transition details

### Key Features

1. **Municipal Services Management** (`servicos-municipais/`)
   - Service creation, editing, approval workflow
   - Status management: draft, awaiting approval, published
   - Digital and physical channels configuration

2. **Gorio Integration** (`gorio/`)
   - Course management and enrollment
   - Job postings and applications
   - Dynamic form fields creation

3. **Role-Based Dashboard**
   - Different views based on user permissions
   - Secretariat-specific data filtering

### Configuration Files

- **orval.config.ts** - API client generation from OpenAPI specs
- **biome.json** - Code formatting and linting rules
- **next.config.ts** - Next.js configuration (standalone output)
- **.env** - Environment variables (not in repo)

### Development Patterns

1. **API Client Generation**: Use Orval to generate TypeScript clients from OpenAPI specs
2. **Component Architecture**: Radix UI primitives with custom styling
3. **State Management**: Zustand stores for global state
4. **Form Handling**: React Hook Form with Zod schemas
5. **Type Safety**: Strict TypeScript with conversion utilities between API and frontend models

### Environment Setup

The project uses environment variables for:
- API endpoints (NEXT_PUBLIC_BUSCA_SEARCH_API_URL, etc.)
- Authentication configuration (IDENTIDADE_CARIOCA_*)
- Feature flags and external service URLs

When working with this codebase:
1. Ensure environment variables are properly configured
2. Run `npm run dev` for development with hot reload
3. Use Biome for consistent code formatting
4. Follow the existing RBAC patterns for new features
5. Refer to `MIGRATION_GUIDE.md` for API integration patterns