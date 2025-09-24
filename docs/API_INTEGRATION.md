# API Integration Documentation

## Overview

This document describes the API integration structure for the courses management system, which has been migrated from mock data to real API endpoints. The system now uses the existing generated API client functions (`getApiV1Courses` and `getApiV1CoursesDrafts`) through Next.js 15 route handlers.

## Architecture

### Route Handlers → API Client → External API
```
Frontend → /api/courses → getApiV1Courses() → External API
Frontend → /api/courses/drafts → getApiV1CoursesDrafts() → External API
```

### Key Components
- **Route Handlers**: Next.js 15 API routes in `/api/courses/` and `/api/courses/drafts/`
- **API Client**: Generated functions from `@/http-gorio/courses/courses.ts` (Orval)
- **Custom Fetch**: `custom-fetch.ts` handles authentication and base URL configuration
- **Data Transformers**: `@/lib/api-transformers.ts` converts API responses to frontend format

## API Endpoints

### 1. List Courses
- **Route**: `/api/courses`
- **Method**: `GET`
- **Description**: Fetches all published courses from the external API using `getApiV1Courses()`
- **Query Parameters**:
  - `page`: Page number
  - `per_page`: Items per page
  - `status`: Course status filter
  - `search`: Text search
  - `provider`: Organization filter
  - `date_from` / `date_to`: Date range filters
  - `vacancies_min` / `vacancies_max`: Vacancy range filters
  - `duration_min` / `duration_max`: Duration range filters
- **Response**: Transformed course data with pagination

### 2. List Draft Courses
- **Route**: `/api/courses/drafts`
- **Method**: `GET`
- **Description**: Fetches all draft courses from the external API using `getApiV1CoursesDrafts()`
- **Query Parameters**:
  - `page`: Page number
  - `per_page`: Items per page
  - `search`: Text search
  - `provider`: Organization filter
  - `date_from` / `date_to`: Date range filters
- **Response**: Transformed draft course data with pagination

### 3. Get Course by ID
- **Route**: `/api/courses/[course-id]`
- **Method**: `GET`
- **Description**: Fetches a specific course by ID from the external API
- **Response**: Course details

### 4. Create New Course
- **Route**: `/api/courses/new`
- **Method**: `POST`
- **Description**: Creates a new published course via the external API using `postApiV1Courses()`
- **Body**: Course data in `ModelsCursoBody` format
- **Response**: Created course data with success status
- **Status**: Returns 201 on successful creation

### 5. Create Draft Course
- **Route**: `/api/courses/draft`
- **Method**: `POST`
- **Description**: Creates a new draft course via the external API using `postApiV1CoursesDraft()`
- **Body**: Course data in `ModelsCursoBody` format
- **Response**: Created draft course data with success status
- **Status**: Returns 201 on successful creation

### 6. Update Course
- **Route**: `/api/courses/[course-id]`
- **Method**: `PUT`
- **Description**: Updates an existing course via the external API
- **Body**: Updated course data
- **Response**: Updated course data

### 7. Delete Course
- **Route**: `/api/courses/[course-id]`
- **Method**: `DELETE`
- **Description**: Deletes a course via the external API
- **Response**: Success message and deleted course data

## Course Creation Flow

### Frontend to API Flow
1. **Form Submission**: User fills out course form and clicks "Criar Curso" or "Salvar Rascunho"
2. **Form Validation**: React Hook Form validates the data using Zod schema
3. **Confirm Dialog**: User confirms the action in a confirmation dialog
4. **API Call**: Frontend calls the appropriate route handler (`/api/courses/new` or `/api/courses/draft`)
5. **Route Handler**: Next.js route handler receives the request and calls the external API
6. **External API**: Uses `postApiV1Courses()` or `postApiV1CoursesDraft()` from the generated client
7. **Response**: Returns success/error response to frontend
8. **Redirect**: On success, user is redirected to the courses list

### Form Components
- **NewCourseForm**: Main form component with validation and submission logic
- **FieldsCreator**: Dynamic custom fields creation component
- **ImageUpload**: File upload component for course images
- **Location Management**: Support for both physical and remote class locations

## Data Transformation

The system uses transformer functions to convert between the external API format and the frontend format. The transformation happens in the route handlers using `transformApiCourseToCourseListItem()` from `@/lib/api-transformers.ts`.

### External API Format (ModelsCurso)
```typescript
interface ModelsCurso {
  id?: number
  title?: string
  description?: string
  organization?: string
  modalidade?: { nome: string }
  status?: string | { nome: string }
  created_at?: string
  updated_at?: string
  enrollment_start_date?: string
  enrollment_end_date?: string
  carga_horaria?: number
  numero_vagas?: number
  facilitator?: string
  orgao?: { nome: string }
  // ... additional fields
}
```

### Frontend Format (CourseListItem)
```typescript
interface CourseListItem {
  id: string
  title: string
  provider: string
  duration: number
  vacancies: number
  status: CourseStatus
  created_at: Date
  registration_start: Date | null
  registration_end: Date | null
  modalidade: string
  organization: string
}
```

### Transformation Process
1. **Route Handler** receives request and calls external API via `getApiV1Courses()` or `getApiV1CoursesDrafts()`
2. **API Client** (`custom-fetch.ts`) handles authentication and base URL configuration
3. **Response Processing** extracts courses array from various possible response structures
4. **Data Transformation** converts each course using `transformApiCourseToCourseListItem()`
5. **Error Handling** provides fallback values if transformation fails
6. **Response** returns standardized format to frontend

## Status Mapping

| API Status | Frontend Status | Display Label |
|------------|----------------|---------------|
| `draft` | `draft` | Rascunho |
| `opened` | `opened` | Aberto |
| `ABERTO` | `ABERTO` | Aberto |
| `closed` | `closed` | Fechado |
| `cancelled` | `cancelled` | Cancelado |

## Modality Mapping

| API Modality | Display Label |
|--------------|---------------|
| `ONLINE` | Online |
| `PRESENCIAL` | Presencial |
| `SEMIPRESENCIAL` | Semipresencial |

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_COURSES_BASE_API_URL=https://services.staging.app.dados.rio/go
```

## Caching

The system uses React state management for client-side caching and the existing API client infrastructure for server-side requests. No additional Next.js caching is implemented as the route handlers are designed to be stateless and forward requests to the external API.

## Error Handling

All API endpoints include comprehensive error handling:

### Route Handler Level
- **HTTP Status Mapping**: Proper status code handling from external API responses
- **Response Structure Validation**: Flexible parsing of different API response formats
- **Transformation Error Handling**: Fallback values if course transformation fails
- **Console Logging**: Extensive debugging information for troubleshooting

### API Client Level
- **Authentication**: Automatic token handling via `custom-fetch.ts`
- **Base URL Configuration**: Environment variable validation
- **Request/Response Logging**: Detailed request flow information

### Frontend Level
- **Loading States**: Proper loading indicators during API calls
- **Error Display**: User-friendly error messages
- **Fallback Data**: Graceful degradation when API calls fail

### Debugging Features
```typescript
// Route handlers log response structure
console.log('API Response structure:', JSON.stringify(response.data, null, 2))
console.log('Extracted courses:', courses)
console.log('Extracted pagination:', pagination)

// Transformation error logging
console.error('Error transforming course:', course, error)
```

## Security

- **Authentication**: Tokens are automatically included via cookies through `custom-fetch.ts`
- **Input Validation**: Query parameters are validated and sanitized
- **Error Handling**: Proper error responses prevent information leakage
- **Environment Variables**: Base URL configuration via `NEXT_PUBLIC_COURSES_BASE_API_URL`

## Troubleshooting

### Common Issues and Solutions

#### 1. "Failed to fetch" Errors
- **Check**: Browser console for network errors
- **Verify**: `NEXT_PUBLIC_COURSES_BASE_API_URL` environment variable is set correctly
- **Debug**: Look for console logs showing API response structure

#### 2. Empty Course Lists
- **Check**: Console logs for "Extracted courses" output
- **Verify**: API response structure matches expected format
- **Debug**: Check if transformation is failing with fallback values

#### 3. Authentication Issues
- **Check**: `access_token` cookie is present and valid
- **Verify**: External API is accessible and accepting requests
- **Debug**: Look for authorization errors in console

#### 4. Data Transformation Errors
- **Check**: Console logs for "Error transforming course" messages
- **Verify**: API response fields match expected `ModelsCurso` structure
- **Debug**: Fallback values should provide basic course information

### Debug Information Available

The system provides extensive debugging information:

```typescript
// Route handler logs
console.log('API Response structure:', JSON.stringify(response.data, null, 2))
console.log('Extracted courses:', courses)
console.log('Extracted pagination:', pagination)

// Transformation logs
console.error('Error transforming course:', course, error)

// API client logs (from custom-fetch.ts)
console.log('RequestInit:', requestInit)
```

### Testing API Endpoints

1. **Test Route Handlers**: Visit `/api/courses` and `/api/courses/drafts` directly
2. **Check Console**: Look for debug logs and error messages
3. **Verify Environment**: Ensure `NEXT_PUBLIC_COURSES_BASE_API_URL` is set correctly
4. **Monitor Network**: Use browser DevTools to track API requests

## Performance Considerations

### Request Optimization
- **Parallel API Calls**: Frontend fetches courses and drafts simultaneously using `Promise.all()`
- **Efficient Data Transformation**: Single-pass transformation with error handling
- **Flexible Response Parsing**: Handles multiple response structure variations

### Caching Strategy
- **Client-Side Caching**: React state management for course data
- **No Server-Side Caching**: Route handlers are stateless for real-time data
- **API Client Reuse**: Leverages existing `custom-fetch.ts` infrastructure

### Error Resilience
- **Graceful Degradation**: Fallback values when transformation fails
- **Request Retry**: Frontend can retry failed requests
- **Partial Data Display**: Shows available data even if some transformations fail

### Monitoring and Debugging
- **Extensive Logging**: Console output for troubleshooting
- **Response Structure Analysis**: Logs actual API response format
- **Transformation Tracking**: Monitors data conversion success/failure
