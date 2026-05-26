# Bertrandt — Electronic Parts Inventory & Reservation Dashboard

> Internal inventory management platform for engineering and development teams.

---

## Brand & Design System

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--bertrandt-yellow` | `#F5C800` | Primary accent, CTAs, active states, badges |
| `--bertrandt-black` | `#1A1A1A` | Sidebar background, headings, text |
| `--bertrandt-white` | `#FFFFFF` | Card surfaces, main background |
| `--bertrandt-gray-100` | `#F5F5F5` | Page background, secondary surfaces |
| `--bertrandt-gray-300` | `#D0D0D0` | Borders, dividers |
| `--bertrandt-gray-500` | `#888888` | Secondary text, muted labels |
| `--status-green` | `#1A7A3E` | Available, success states |
| `--status-amber` | `#B06000` | Low stock, warnings |
| `--status-blue` | `#185FA5` | Borrowed, informational |
| `--status-red` | `#C0392B` | Overdue, danger alerts |

### Typography

- **Display / Headings**: Bold, black — used for page titles and stat values
- **Body**: Regular weight, `--bertrandt-black` — used for table content and descriptions
- **Labels / Captions**: 11–12px, `--bertrandt-gray-500` — used for field labels and metadata

### Component Tokens

```css
:root {
  --color-primary:       #F5C800;
  --color-primary-light: #FFF8CC;
  --color-primary-dark:  #C9A400;
  --color-surface:       #FFFFFF;
  --color-bg:            #F5F5F5;
  --color-text:          #1A1A1A;
  --color-text-muted:    #888888;
  --color-border:        #D0D0D0;
  --border-radius-sm:    6px;
  --border-radius-md:    8px;
  --border-radius-lg:    12px;
}
```

---

## Project Overview

The **Bertrandt Electronic Parts Inventory & Reservation Dashboard** is an internal web application designed to centralize the management and tracking of electronic components across engineering labs and development teams.

### Managed Component Types

- Microprocessors & Microcontrollers
- PCBs & Development Boards
- Sensors & Actuators
- Communication Modules
- Cables & Connectors
- Power Modules
- Electronic Tools & Accessories

---

## Objectives

- Centralize all electronic inventory management in one platform
- Track parts in real time with collaborator ownership visibility
- Reduce inventory loss through traceability
- Simplify the reservation and borrowing workflow
- Monitor low stock levels and trigger alerts
- Generate usage analytics and exportable reports

---

## Core Features

### 1. Inventory Management

Administrators and inventory managers can:

- Add, edit, and delete electronic parts
- Search and filter inventory by category, status, or location
- Upload part images and attach datasheets
- Manage stock quantities, categories, and storage locations

#### Part Record Fields

| Field | Type | Required |
|---|---|---|
| Part Name | Text | Yes |
| Category | Dropdown (13 types) | Yes |
| Manufacturer | Text | No |
| Part Number / Reference | Text | Yes |
| Description | Textarea | No |
| Quantity Total | Integer | Yes |
| Quantity Available | Integer | Yes |
| Storage Location | Dropdown | Yes |
| Datasheet URL | URL | No |
| Image | File upload | No |
| Status | Enum | Yes |
| Created At | Timestamp | Auto |
| Updated At | Timestamp | Auto |

#### Supported Categories

`Microprocessors` `Microcontrollers` `PCBs` `Sensors` `Actuators` `Development Boards` `Communication Modules` `Connectors` `Cables` `Power Modules` `Test Equipment` `Tools` `Other`

---

### 2. Reservation & Borrowing System

Collaborators can search and reserve available parts through a structured workflow.

#### Reservation Workflow

```
Available → Reserved → Borrowed → Returned → Available
```

#### Reservation Record Fields

| Field | Type |
|---|---|
| Collaborator Name | Text |
| Collaborator ID | Text |
| Department | Text |
| Reserved Part | FK → parts |
| Quantity | Integer |
| Reservation Date | Date |
| Expected Return Date | Date |
| Actual Return Date | Date (nullable) |
| Status | Enum |
| Comments | Textarea |

#### Reservation Statuses

| Status | Color | Description |
|---|---|---|
| Pending | `--status-amber` | Awaiting manager approval |
| Approved | `--bertrandt-yellow` | Confirmed, not yet collected |
| Reserved | `--status-blue` | Part set aside |
| Borrowed | `--status-blue` | Part in collaborator's possession |
| Returned | `--status-green` | Part back in stock |
| Overdue | `--status-red` | Past expected return date |
| Cancelled | `--bertrandt-gray-500` | Request withdrawn |

---

### 3. Collaborator Tracking

The dashboard provides full visibility on:

- Who currently holds a component
- Borrow duration and time remaining
- Full reservation history per collaborator
- Overdue return flags
- Most frequently borrowed parts
- Per-department activity summary

---

### 4. Dashboard & Analytics

#### Main Dashboard Widgets

| Widget | Description |
|---|---|
| Total Components | Count of all registered parts |
| Available | Parts currently in stock |
| Reserved / Borrowed | Parts checked out |
| Low Stock Alerts | Parts below threshold |
| Overdue Returns | Highlight badge count |
| Damaged Components | Flagged items |
| Most Borrowed Parts | Top 5 by usage |

#### Charts

- Inventory distribution by category (horizontal bar)
- Monthly reservation volume (bar chart)
- Borrowing trends over time (line chart)
- Low stock monitoring (threshold indicator)

---

### 5. User Roles & Permissions

| Role | Permissions |
|---|---|
| **Admin** | Full system access |
| **Inventory Manager** | Add/edit parts, approve reservations, manage returns, monitor stock |
| **Collaborator** | Search inventory, reserve parts, view own history |
| **Viewer** | Read-only access |

---

### 6. Additional Features

#### QR Code Tracking

Each part auto-generates a QR code on creation (configurable in Settings). Print and attach to physical bins for fast scanning and reservation.

#### Notifications

- Reservation approved / rejected
- Return reminder (configurable days before due date)
- Overdue return alert
- Low stock alert (configurable threshold)

#### Export

- Excel (`.xlsx`) — full inventory snapshot
- CSV — raw data export
- PDF — formatted inventory report

#### Audit Logs

All system actions are recorded:

- Part added / edited / deleted
- Reservation created / approved / rejected
- Parts returned
- User role changes

#### Multi-location Support

Inventory can be tracked across multiple labs or storage rooms using location tags (e.g. `Shelf A1`, `Cabinet B2`, `Lab Storage 1`).

---

## System Architecture

### Recommended Stack

| Layer | Options |
|---|---|
| Frontend | React.js / Vue.js / Angular |
| Backend | Node.js (Express / NestJS) / Spring Boot / ASP.NET Core |
| Database | PostgreSQL / MySQL |
| Auth | LDAP / SSO / Company Email |
| Deployment | Internal server / Docker / Cloud (future) |

### Folder Structure

```
bertrandt-parts-inventory/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   │   ├── Inventory/
│   │   ├── Reservations/
│   │   ├── Collaborators/
│   │   ├── Analytics/
│   │   └── Shared/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── assets/
│       └── design-tokens.css
│
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── database/
│   └── utils/
│
├── docs/
├── docker/
├── scripts/
└── README.md
```

---

## Database Design

### Main Tables

`users` `roles` `parts` `categories` `reservations` `borrow_history` `locations` `audit_logs`

### Parts Table

```sql
CREATE TABLE parts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  category_id       UUID REFERENCES categories(id),
  manufacturer      VARCHAR(255),
  reference         VARCHAR(255) NOT NULL,
  description       TEXT,
  quantity_total    INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  location_id       UUID REFERENCES locations(id),
  status            VARCHAR(50) NOT NULL DEFAULT 'Available',
  datasheet_url     TEXT,
  image_url         TEXT,
  qr_code           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

### Reservations Table

```sql
CREATE TABLE reservations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id              UUID REFERENCES parts(id),
  user_id              UUID REFERENCES users(id),
  quantity             INTEGER NOT NULL,
  status               VARCHAR(50) NOT NULL DEFAULT 'Pending',
  reservation_date     DATE NOT NULL,
  expected_return_date DATE NOT NULL,
  actual_return_date   DATE,
  comments             TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
```

---

## UI Pages & Routes

### Authentication

| Route | Page |
|---|---|
| `/login` | Login |
| `/register` | Register |
| `/forgot-password` | Password reset |

### Main App

| Route | Page |
|---|---|
| `/dashboard` | Main dashboard with widgets & charts |
| `/inventory` | Full inventory table with filters |
| `/inventory/add` | Add new part form (4-step wizard) |
| `/inventory/:id` | Part detail view |
| `/inventory/edit/:id` | Edit part |
| `/reservations` | Reservation management |
| `/reservations/history` | Full history log |
| `/collaborators` | Team overview |
| `/collaborators/:id` | Individual collaborator profile |
| `/admin` | Admin panel |
| `/admin/users` | User management |
| `/admin/roles` | Role configuration |
| `/admin/settings` | System settings |

---

## UI Design Notes

### Sidebar Navigation

- Background: `--bertrandt-black` (`#1A1A1A`)
- Active nav item: `--bertrandt-yellow` highlight with yellow left border accent
- Logo: Bertrandt wordmark + yellow `b` icon on black

### Header / Topbar

- Background: white surface
- Primary action button (Add Part, New Reservation): `--bertrandt-yellow` background, black text
- Search input: gray surface with border

### Cards & Tables

- Card surface: white with `1px` border `--bertrandt-gray-300`
- Table header: `--bertrandt-gray-100` background, uppercase small caps
- Hover row: `--bertrandt-gray-100`
- Status badges: semantic color system (green / amber / blue / red)

### Stat Cards

- Accent strip (left or top border): `--bertrandt-yellow` for primary metrics
- Value: 26px, `font-weight: 500`
- Label: 12px, `--bertrandt-gray-500`

---

## MVP Roadmap

### Phase 1 — Core

- [ ] Authentication (LDAP / SSO)
- [ ] Dashboard with live widgets
- [ ] Inventory CRUD (with 4-step add form)
- [ ] Reservation workflow
- [ ] Return management
- [ ] Collaborator tracking
- [ ] Basic analytics

### Phase 2 — Enhancements

- [ ] Email / in-app notifications
- [ ] QR code generation & scanning
- [ ] Excel / CSV / PDF export
- [ ] Advanced analytics & charts
- [ ] Audit log viewer

### Phase 3 — Scale

- [ ] Mobile-responsive / PWA
- [ ] REST API for external integrations
- [ ] Multi-site / multi-lab inventory
- [ ] Predictive stock analytics
- [ ] Barcode scanner support

---

## Security Requirements

- Role-based access control (RBAC)
- Secure authentication (LDAP / SSO / JWT)
- Full activity audit logging
- HTTPS enforced
- Session management with timeout
- Encrypted backups

---

## Deployment Options

| Option | Notes |
|---|---|
| Internal server | Recommended for initial rollout |
| Docker | Containerized deployment, easy CI/CD |
| Cloud | Future phase — Azure / AWS |

---

*Bertrandt AG — Internal Engineering Tools*  
*Document version: 1.0 — Electronic Parts Inventory & Reservation Dashboard*
