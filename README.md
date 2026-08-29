# NETLINK — Backend
REST API for the Netlink social platform. Built with Node.js, Express 5, TypeScript, Prisma, and PostgreSQL.

## Tech Stack
- Node.js & Express.js (v5)
- TypeScript
- Prisma ORM & PostgreSQL
- JWT Authentication
- Rate Limiting & Helmet Security Headers

## Project Structure
```text
netlink-api/
├── src/
│   ├── config/          # Prisma client & database configuration
│   ├── controllers/     # Route controllers & business orchestration
│   ├── middleware/      # Auth, Rate limiting & Centralized Error Handler
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic, JWT & hashing services
│   ├── utils/           # AppError class hierarchy & test runners
│   ├── app.ts           # Express application setup
│   └── server.ts        # Server entry point
```

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
  "error": "Invalid login credentials."
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

# Run error-handling and API tests
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
