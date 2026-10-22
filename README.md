# React + Vite

## Local cart demo

Add these settings to `.env` to start as a demo shopper and use the bundled
sample products without running the backend:

```env
VITE_MOCK_LOGIN=true
VITE_USE_MOCK=true
```

`VITE_MOCK_LOGIN` signs in a local demo user on app startup. `VITE_USE_MOCK`
switches product and API requests to the bundled mock data. Either setting can
be used independently. Restart the Vite dev server after changing environment
variables. The demo cart is saved in this browser's local storage.

## Sprint 4: Admin panel

The admin panel is built on top of Sprints 1 to 3 (the shop itself is unchanged) and talks to the Sprint 4 Django backend.

### Run it

1. Start the Sprint 4 backend, then create an administrator (once):
   `python manage.py create_admin admin@example.com YourPassword123 --name "Store Admin"`
2. Point the frontend at that backend in `.env` (the default address is an older deployment without the admin endpoints):
   `VITE_API_BASE_URL=http://127.0.0.1:8000/api`
3. `npm run dev`, open `http://127.0.0.1:5173/#/admin/login` and log in with the administrator account.
   Customers who open `#/admin` see "Administrators only". The demo settings above (`VITE_USE_MOCK`, `VITE_MOCK_LOGIN`) do not include the admin panel.

### Pages

| Page | Address | Backend endpoints |
|------|---------|-------------------|
| Dashboard | `#/admin` | `GET /admin/stats/`, `GET /admin/products/`, `GET /admin/orders/` |
| Products (US-21) | `#/admin/products` | `GET`, `POST /admin/products/`, `PATCH`, `DELETE /admin/products/<id>/` |
| Inventory (US-22) | `#/admin/inventory` | `GET /admin/products/`, `PATCH /admin/products/<id>/` with `{"stock": n}` |
| Orders (US-28) | `#/admin/orders` | `GET /admin/orders/`, `GET /admin/orders/?status=pending`, `PATCH /admin/orders/<id>/` |
| Customers (US-29) | `#/admin/customers` | `GET /admin/customers/`, `GET`, `PATCH /admin/customers/<id>/` with `{"is_active": false}` |

Every admin request sends `Authorization: Token <token>` (saved at login). All admin code lives in `src/pages/admin/`, `src/components/AdminUI.jsx` and `src/services/adminApi.js`, which also holds the rules copied from the backend.

### Good to know

- Low stock means 10 or fewer left, as the backend decides. The dashboard's "Low or out of stock" count and the inventory warnings only count products that are visible in the shop.
- Editing a product does not send its stock, so a stock quantity that changed in the meantime is never overwritten. Stock is changed on the Inventory page, and a new product asks for its first quantity.
- An order can only move pending, then processing, then shipped, then delivered. Pending and processing orders can also be cancelled, which puts their items back in stock. Delivered and cancelled orders are final.
- The products API cannot upload pictures, so new products show their emoji in the shop until a picture is attached on the backend.
- Customers can be blocked and unblocked, nothing else. Blocked customers cannot log in.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
