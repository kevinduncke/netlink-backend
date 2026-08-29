# NETLINK — Backend
REST API for the Netlink social platform. Built with Node.js, Express 5, TypeScript, Prisma, and PostgreSQL.

## Tech Stack
- Node.js & Express.js (v5)
- TypeScript
- Zod (Runtime Schema Validation)
- Prisma ORM & PostgreSQL
- JWT Authentication
- Rate Limiting & Helmet Security Headers

## Project Structure
```text
netlink-api/
├── src/
│   ├── config/          # Prisma client & database configuration
│   ├── controllers/     # Route controllers & business orchestration
│   ├── middleware/      # Auth, Rate limit, Validation & Centralized Error Handler
│   ├── routes/          # Express route definitions
│   ├── schemas/         # Shared Zod validation schemas
│   ├── services/        # Business logic, JWT & hashing services
│   ├── utils/           # AppError class hierarchy & test suites
│   ├── app.ts           # Express application setup
│   └── server.ts        # Server entry point
```

## Request Validation Architecture (Zod)

Netlink uses declarative **Zod schemas** and an Express validation middleware to validate, sanitize, and type-check incoming HTTP request bodies before they reach controllers.

### 1. Core Schemas (Part 1)
- **`registerSchema` (`src/schemas/auth.schema.ts`)**: Enforces valid email, name length/characters, and strict password complexity (min 8 chars, uppercase, lowercase, digits, symbols).
- **`loginSchema` (`src/schemas/auth.schema.ts`)**: Validates presence and format of login credentials.
- **`createPostSchema` (`src/schemas/post.schema.ts`)**: Validates post body, trim enforcement on non-empty content, allowed visibility states, and conditional follower requirements for `SPECIFIC` visibility via `.superRefine()`.

### 2. Validation Middleware (`validateRequest`)
Located at `src/middleware/validate.ts`:
- Validates `req.body` using `schema.safeParse()`.
- On success: Replaces `req.body` with parsed, trimmed, and default-applied data, then calls `next()`.
- On failure: Extracts structured field-level errors (`{ field, message }`) and passes a `BadRequestError` (400) to the centralized error middleware.

> **Note:** Route integration and inferred TypeScript type exports (`z.infer`) across all remaining endpoints are scheduled for **Part 2**.

## Error Handling Architecture

Netlink uses a **Centralized Error Handling Architecture** powered by a custom `AppError` hierarchy and Express 5 error middleware:

### 1. Error Classification
- **Operational Errors (`AppError`):** Predictable runtime errors (e.g. invalid inputs, expired tokens, resource conflicts). Handled with explicit HTTP status codes and user-friendly error messages.
  - `BadRequestError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `InternalServerError` (500)
- **Programmer Errors:** Unexpected bugs (e.g. `TypeError`, database connection loss). Logged with full stack traces in server logs, but sanitized to safe `500 Internal Server Error` responses in production.

### 2. Standardized Error Response Format

```json
{
  "status": "fail",
  "error": "Email: Invalid email address format.",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address format."
    }
  ]
}
```

- In **Development Mode** (`NODE_ENV !== 'production'`), error responses include verbose debugging information (`statusCode`, `stack`, and error `details`).
- In **Production Mode** (`NODE_ENV === 'production'`), stack traces are completely stripped and internal error messages are sanitized.

### 3. Automatic Third-Party Error Mapping
The centralized error middleware automatically converts:
- **Prisma P2002** (Unique constraint failure) $\rightarrow$ `409 Conflict`
- **Prisma P2025** (Record not found) $\rightarrow$ `404 Not Found`
- **JsonWebTokenError / TokenExpiredError** $\rightarrow$ `401 Unauthorized`
- **Express Body-Parser SyntaxError** $\rightarrow$ `400 Bad Request`

## Setup & Running

```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Run error-handling and validation test suites
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables
Create a `.env` file in `netlink-api/`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secure-jwt-secret"
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

## License
MIT
