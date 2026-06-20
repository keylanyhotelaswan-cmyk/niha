# Product Architecture Proposal

## Core Principles

- Modular monolith from day one.
- Arabic-first RTL responsive UX for desktop, tablet, and phone.
- Ledger-based treasury and inventory.
- Clear separation between operating expenses, setup costs, and inventory purchasing.
- Full traceability and auditability for sensitive operations.

## Technology Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, MUI.
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, class-validator.
- Database: Supabase PostgreSQL.
- Deployment: Vercel for web, managed Node hosting for API.

## Modules

- Auth and access control.
- POS and order lifecycle.
- Shifts and treasury.
- Catalog and pricing.
- Inventory and warehouses.
- Recipes and recipe revisions.
- Vendors and purchasing.
- Operating expenses.
- Setup costs before launch.
- Reporting and audit.

## Deployment Topology

- Browser clients connect to the React app.
- React app connects to NestJS API.
- API connects to Supabase PostgreSQL using pooled connections.
- Reports read from domain tables and dedicated SQL views.
