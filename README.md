# NETLINK — Backend
REST API for the Netlink social platform. Built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## Tech Stack
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Cloudinary / Supabase Storage

## Project Structure
- src/
  - controllers/
  - routes/
  - middleware/
  - config/
  - utils/
  - types/

## Setup
npm install
npm run dev

## Environment Variables
Create a `.env` file:

DATABASE_URL="postgresql://..."
JWT_SECRET="secret"
CORS_ORIGIN="http://localhost:5173"
STORAGE_URL="..."

## Database
Prisma is used for schema and migrations.

npx prisma migrate dev
npx prisma studio

## Testing
npm run test

## Deployment
This project is deployed via Render.

## License
MIT
