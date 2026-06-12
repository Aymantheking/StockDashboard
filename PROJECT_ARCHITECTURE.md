# StockDashboard Project Architecture

## 1. Project Overview

StockDashboard is an internal inventory management application . It tracks stock availability, reservations, borrowing, returns, damaged
items, missing-item requests, suppliers, procurement, notifications, and
operational and financial analytics.

The application supports four roles:

- **Admin**: system administration, user verification, inventory control,
  procurement approval and execution, reporting, and settings.
- **Inventory Manager**: operational stock visibility, request processing,
  reservations, returns, and purchase requests.
- **Collaborator**: inventory browsing, part requests, missing-item requests,
  and return declarations.
- **Viewer**: read-only access to the permitted dashboard, inventory,
  reservation, and analytics views.

The principal workflows are authentication and verification, inventory
tracking, part requests, reservations and borrowing, returns, missing-item
requests, purchases, notifications, analytics, and report generation.

## 2. Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS utility classes
- Lucide React icons
- Recharts for charts
- jsPDF and jspdf-autotable for PDF reports
- SheetJS (`xlsx` and `xlsx-js-style`) for XLSX exports

### Backend

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- JWT authentication with an eight-hour token lifetime
- bcryptjs password hashing
- Class Validator and Class Transformer

## 3. High-Level Architecture

The React frontend calls the NestJS REST API. NestJS authenticates requests,
applies role guards, runs business rules, persists data through TypeORM, and
creates notifications when workflow events occur. PostgreSQL is the persistent
system of record.

```text
User Browser
    |
    v
React Frontend
    |
    v
REST API (JSON over HTTP)
    |
    v
NestJS Backend
    |
    v
TypeORM
    |
    v
PostgreSQL Database
```

## 4. Frontend Architecture

The frontend is organized around three top-level areas:

```text
frontend/src/
  app/
    App.tsx
    StockDashboardApp.tsx
    routes.tsx
    layout/
  shared/
    api/
    components/
    hooks/
    types/
    utils/
  features/
    auth/
    dashboard/
    inventory/
    requests/
    reservations/
    purchases/
    collaborators/
    suppliers/
    analytics/
    settings/
    notifications/
```

### `app/`

`app/App.tsx` is the small application entry component. `routes.tsx` owns the
role-aware page list. `layout/` contains the fixed header, collapsible sidebar,
and application shell. `StockDashboardApp.tsx` is the compatibility
orchestration container for global state and the remaining workflow composition;
feature logic can be moved from it incrementally without changing APIs or
behavior.

### `shared/`

- `api/`: API base URL, endpoint constants, and the authenticated client
  factory. `VITE_API_BASE_URL` can override the local backend URL.
- `components/`: reusable controls including modal shells, confirmations,
  pagination, icon buttons, table text truncation, selection cells, bulk action
  bars, priority badges, status badges, filters, and report download choices.
- `hooks/`: pagination, filter evaluation, and current-page table selection.
- `types/`: cross-feature organization types such as divisions and groups.
- `utils/`: date formatting, currency formatting, permissions, logo/chart
  capture, and PDF footer helpers.

### `features/`

- `auth`: login/signup UI, auth endpoint helper, and authenticated-user types.
- `dashboard`: statistic cards and quick analytics presentation components.
- `inventory`: part listing, stock controls, purchase-from-inventory actions,
  and inventory API boundary.
- `requests`: part requests, missing-item requests, approval/rejection,
  details, and return reports.
- `reservations`: reservation creation, borrowing, return declaration, and
  return confirmation.
- `purchases`: purchase types, priority/status workflow, procurement details,
  reports, and purchase API boundary.
- `collaborators`: collaborator administration, ratings, and rating history.
- `suppliers`: supplier CRUD and supplier selection for purchases.
- `analytics`: analytics API boundary, charts, tables, and downloadable report.
- `settings`: low-stock threshold, manager assignments, and user verification.
- `notifications`: notification types, dropdown UI, and notification API
  boundary.

Important reusable components include:

- `Modal`: accessible common modal shell.
- `ConfirmModal`: destructive or workflow confirmation with optional comment.
- `Pagination`: current-page navigation and result range.
- `StatusBadge`: compact status display.
- `PriorityBadge`: icon and color representation of purchase criticality.
- `IconButton`: consistent labeled action button.
- `BulkActionBar`: selected-row count and bulk actions.
- `TableTextCell`: ellipsis plus full-text tooltip.
- `DownloadChoiceModal`: PDF/XLSX report selection.

## 5. Backend Architecture

The backend follows NestJS modules. Controllers define HTTP contracts, services
contain business rules, and TypeORM repositories persist entities.

### AuthModule

Responsible for registration, login, profile authentication, password hashing,
and JWT creation.

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- Entity: `User`

### UsersModule

Lists users, assigns roles/divisions, and handles account verification.

- `GET /users`
- `PUT /users/:id/assignment`
- `PUT /users/:id/verify`
- `PUT /users/:id/reject`
- Entity: `User`

### PartsModule

Owns inventory parts and enforces inventory modification permissions.

- `GET /parts`, `GET /parts/:id`
- `POST /parts`
- `PUT /parts/:id`
- `DELETE /parts/:id`
- Entity: `Part`

### RequestsModule

Owns collaborator part requests, approval/rejection, return declarations, return
confirmation, and damage processing.

- `GET /requests`, `GET /requests/my`, `POST /requests`
- `PUT /requests/:id/approve`, `/reject`
- `PUT /requests/:id/declare-return`, `/confirm-return`
- Legacy operational actions: `/return`, `/mark-damaged`
- Entities: `PartRequest`, `Part`, `Collaborator`, `RatingHistory`

### MissingItemRequestsModule

Handles requests for unavailable or unknown items.

- `GET /missing-item-requests`, `GET /missing-item-requests/my`
- `POST /missing-item-requests`
- `PUT /missing-item-requests/:id/approve`
- `PUT /missing-item-requests/:id/reject`
- Entity: `MissingItemRequest`

### ReservationsModule

Provides direct reservation CRUD and stock transitions.

- `GET /reservations`, `GET /reservations/:id`
- `POST /reservations`, `PUT /reservations/:id`
- `PUT /reservations/:id/mark-borrowed`, `/return`
- `DELETE /reservations/:id`
- Entity: `Reservation`

### PurchasesModule

Owns purchase requests, approval and procurement transitions, receive
validation, inventory updates, cancellation, deletion, and reminders.

- `GET /purchases`, `GET /purchases/:id`
- `POST /purchases`, `PUT /purchases/:id`
- `PUT /purchases/:id/approve`, `/order`, `/in-transit`, `/receive`, `/cancel`
- `DELETE /purchases/:id`
- Entities: `Purchase`, `Part`, `User`

### CollaboratorsModule

Owns collaborator records, division/group details, ratings, and rating history.

- CRUD under `/collaborators`
- `GET /collaborators/:id/rating-history`
- `PUT /collaborators/:id/rating`
- Entities: `Collaborator`, `RatingHistory`

### SuppliersModule

Owns supplier contact and status data through CRUD endpoints under `/suppliers`.

- Entity: `Supplier`

### AnalyticsModule

Provides `GET /analytics/summary`, including inventory, request, collaborator,
division/group, and purchase financial analytics.

- Entities read: `Part`, `Collaborator`, `PartRequest`, `Purchase`

### SettingsModule

Provides application settings and the configurable low-stock threshold.

- `GET /settings`
- `PUT /settings/low-stock-threshold`
- Entity: `AppSetting`

### NotificationsModule

Stores workflow notifications, returns the current user's summary, and handles
read/delete operations.

- `GET /notifications`, `GET /notifications/summary`
- `PUT /notifications/:id/read`, `PUT /notifications/read-all`
- `DELETE /notifications/:id`, `DELETE /notifications/clear-read`
- Entities: `Notification`, `NotificationSeen`

## 6. Database Design

### User

Important fields: `id`, `name`, `email`, `passwordHash`, `role`, `division`,
`group`, `managedDivision`, `emailVerificationStatus`,
`verificationComment`, `createdAt`, and `updatedAt`.

### Collaborator

Important fields: `id`, `name`, `email`, `division`, `group`, `role`, and
`rating`. A collaborator has many reservations and rating-history records.

### Part

Important fields: `id`, `name`, `category`, `manufacturer`, `reference`,
`totalQuantity`, `availableQuantity`, `reservedQuantity`, `borrowedQuantity`,
`damagedQuantity`, `location`, `description`, `stockAllocationNote`, and
`status`.

### PartRequest

Important fields: collaborator and part foreign keys, quantity, request type,
reason, start/usage/due/return dates, status, manager comment, declaration and
confirmation timestamps, good quantity, damaged quantity, and return comments.
It has many-to-one relationships to `Collaborator` and `Part`.

### MissingItemRequest

Important fields: collaborator, optional source part, item name, category,
manufacturer, reference, quantity, reason, needed date, status, and manager
comment.

### Purchase

Important fields: item identity, quantity, reason, priority, status,
`requestedById`, optional `sourcePartId`, division, supplier and contact, unit
and total prices, expected and received dates, admin comment,
`lastReminderAt`, `createdAt`, and `updatedAt`.

A purchase may reference an existing inventory part. If it does not, receiving
the purchase creates or resolves the corresponding inventory item.

### Supplier

Important fields: name, contact person, email, phone, website, country, notes,
status, and timestamps.

### AppSetting

Stores key/value application settings, currently including the low-stock
threshold.

### Notification

Important fields: recipient user, title, message, type, target page/section/id,
read state, actionable state, and timestamps.

### NotificationSeen

Stores `userId`, a unique `notificationKey`, and `createdAt`. It prevents
generated summary notifications and reminders from repeatedly appearing.

### RatingHistory

Stores collaborator, previous rating, new rating, reason, actor, and timestamp.

### Relationships

- Users and collaborators belong to a division/group; managers may be assigned
  a managed division.
- Part requests link one collaborator to one part.
- Reservations link one collaborator to one part.
- Purchases identify their requesting user and may link to an existing part.
- Notifications identify one recipient user and a navigable workflow target.

## 7. Role-Based Access Control

- **Admin**: full user verification and assignment, inventory CRUD, request and
  return decisions, supplier CRUD, purchase approval/procurement/receipt,
  settings, deletion, analytics, and reports.
- **Inventory Manager**: inventory visibility, purchase-request creation,
  collaborator and supplier visibility, request handling for managed work,
  reservations and returns. Managers cannot directly edit/delete stock identity
  or approve/order purchases.
- **Collaborator**: inventory visibility, part and missing-item requests, own
  request history, and return declarations.
- **Viewer**: read-only access to explicitly exposed pages.

The frontend hides forbidden controls for usability. Backend JWT and role guards,
plus service-level ownership/status checks, remain the security authority.

## 8. Main Business Workflows

### 8.1 Inventory Stock Tracking

Each part tracks:

- `totalQuantity`
- `availableQuantity`
- `reservedQuantity`
- `borrowedQuantity`
- `damagedQuantity`

The stock invariant is:

```text
totalQuantity =
  availableQuantity +
  reservedQuantity +
  borrowedQuantity +
  damagedQuantity
```

Workflow services transfer quantities between buckets instead of directly
overwriting total stock.

### 8.2 Part Request Workflow

```text
Pending -> Approved | Rejected
```

For an approved reservation request, stock moves to `Reserved`. For an approved
borrow request, stock moves to `Borrowed`. Approval validates available stock.

### 8.3 Return Workflow

The collaborator declares a return:

```text
Borrowed/Reserved -> Return Pending
```

The manager/admin confirms quantities:

```text
Return Pending -> Returned | Damaged
```

Good quantity returns to `availableQuantity`; damaged quantity moves to
`damagedQuantity`. Damage or return-policy events can create collaborator rating
history and penalties.

### 8.4 Purchase Workflow

The standard manager-created workflow is:

```text
Pending -> Approved -> Ordered -> In Transit -> Received
```

A manager creates a pending request and an Admin approves and procures it. An
Admin-created pending request bypasses self-approval and can move directly to
`Ordered`. Receiving requires complete supplier, supplier contact, price,
arrival date, quantity, and item identity data. Receipt updates inventory.
Final PDF/XLSX reports are available after `Received`.

### 8.5 Missing Item Workflow

A collaborator requests an unavailable or unknown item. A manager/admin reviews
the request and can approve or reject it. Approved missing items can be used to
initiate a purchase while preserving the original collaborator as the eventual
notification recipient.

### 8.6 Notification Workflow

Workflow services generate actionable notifications for the responsible
managers/admins and informational notifications for collaborators/requesters.
Notifications include navigation targets so the frontend can open and highlight
the related row. Users can mark one/all as read and delete one/all read items.
`NotificationSeen` suppresses duplicate generated reminders.

## 9. Analytics and Reporting

The dashboard and analytics page include:

- Inventory totals and low-stock indicators
- Reserved, borrowed, returned, and damaged quantities
- Most borrowed parts
- Most active collaborators
- Division and group activity
- Financial totals based only on received purchases
- Pending purchase forecast value
- Monthly and yearly spending
- Spending by category, supplier, and division
- Top expensive purchases

PDF analytics reports contain executive, inventory, workflow, and financial
sections. Purchase and return reports support PDF and formatted XLSX downloads.
Purchase-table exports respect active filters.

## 10. Security

- Passwords are hashed with bcryptjs and never stored as plaintext.
- Login issues signed JWT access tokens.
- Protected controllers use JWT and role guards.
- Services enforce ownership, role, status-transition, and stock rules.
- Frontend permission checks improve UX but do not replace backend enforcement.
- TypeORM parameterization prevents ad hoc SQL interpolation in normal
  repository/query-builder operations.
- Production deployments must provide secure JWT and database secrets through
  environment variables.

## 11. Current Development Status

Implemented:

- Registration, login, JWT authentication, and user verification
- Role-based access control
- Inventory CRUD and stock-bucket tracking
- Part and missing-item requests
- Reservations, borrowing, returns, and damage handling
- Purchase approval and procurement workflow
- Supplier and collaborator management
- Rating history
- Persistent notifications and reminders
- Operational and financial analytics
- PDF and XLSX reporting
- Low-stock and manager-assignment settings
- Fixed/collapsible navigation and bulk table actions

The frontend now has a small application entry, extracted layout, shared API and
utility layers, shared table/modal controls, authentication and notification
features, and analytics/dashboard presentation components. The compatibility
orchestrator preserves the existing workflows while the remaining large page
implementations can continue moving feature-by-feature.

## 12. Next Steps / Deployment

1. Complete the final feature-page extraction from the compatibility
   orchestrator and add component-level tests.
2. Add backend unit/integration tests for stock and workflow invariants.
3. Add frontend workflow tests for role-specific actions.
4. Dockerize the React frontend, NestJS backend, and PostgreSQL database.
5. Move API URL, database credentials, JWT secret, and runtime options to
   environment-specific configuration.
6. Build optimized production assets and configure reverse proxy/TLS.
7. Add CI/CD for linting, builds, tests, migrations, and image publishing.
8. Add database backup, monitoring, audit logging, and retention policies.
9. Prepare company Software Center packaging and managed desktop deployment
   after the web production process is stable.
