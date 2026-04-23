# Invoice App

A fully responsive invoice management application built with React, Vite, and Tailwind CSS, matching the Frontend Mentor Invoice App Figma design.

## Tech Stack

- **React 18** — UI framework
- **Vite** — build tool & dev server (port 5000)
- **Tailwind CSS v3** — utility-first styling with dark mode support
- **React Router DOM v6** — client-side routing
- **React Hook Form** — form state management and validation
- **date-fns** — date formatting

## Architecture

```
src/
  components/         # Reusable UI components
    Sidebar.jsx       # Left nav (desktop) / top bar (mobile) with theme toggle
    StatusBadge.jsx   # Colored status indicator (paid/pending/draft)
    FilterDropdown.jsx # Checkbox filter by invoice status
    InvoiceCard.jsx   # Invoice list item card
    InvoiceForm.jsx   # Create/edit invoice slide-in panel
    DeleteModal.jsx   # Confirmation modal with focus trap
  context/
    ThemeContext.jsx  # Dark/light mode state + localStorage persistence
    InvoiceContext.jsx # Invoice CRUD state + localStorage persistence
  data/
    invoices.json     # Seed data (7 sample invoices)
  pages/
    InvoiceListPage.jsx  # Main list view with filter and new invoice
    InvoiceDetailPage.jsx # Invoice detail view with actions
  utils/
    helpers.js        # generateId, formatDate, formatCurrency, addDays
```

## Features

- Full CRUD for invoices (Create, Read, Update, Delete)
- Save as Draft (bypasses validation)
- Mark pending invoices as Paid
- Filter by status (all, draft, pending, paid)
- Dark/light mode toggle with localStorage persistence
- Form validation with error states
- Delete confirmation modal with ESC key + focus trapping
- Fully responsive (mobile 320px, tablet 768px, desktop 1024px)
- Data persisted in localStorage

## Running the App

```bash
npm run dev
```

The app runs on port 5000.
