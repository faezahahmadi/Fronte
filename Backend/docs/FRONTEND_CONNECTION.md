# Connecting a frontend to the FreshMart API

## 1. Address

| | |
|---|---|
| API base URL | `http://localhost:8000/api` |
| Health check | `GET /api/health/` returns `{"status":"ok","database":"ok"}` |

Put the base URL in the frontend's environment file, then restart the dev server:

- **Next.js** (`.env.local`): `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- **Vite + React** (`.env`): `VITE_API_URL=http://localhost:8000/api`

## 2. CORS

The browser only lets the frontend call the API if the frontend's address is allowed. By default the backend allows `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173` and `http://127.0.0.1:5173`. For another address, add it to `CORS_ALLOWED_ORIGINS` in the backend `.env` (comma-separated, no trailing slash) and restart Django.

`localhost` and `127.0.0.1` count as different addresses. Open the frontend on one of the allowed ones.

## 3. Authentication

Register or log in to get a token, store it (e.g. `localStorage`), and send it on every protected request:

```
Authorization: Token <token>
```

Public endpoints (catalog) need no token. Don't send an old or invalid token to them: Django answers `401 Invalid token` even on public pages.

## 4. Endpoints

| Method | URL | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register/` | none | body: `full_name`, `email`, `password` (8+ characters, not too common). Returns `201 {token, user}` |
| POST | `/auth/login/` | none | body: `email`, `password`. Returns `{token, user}`. Wrong details: `400 {"detail": "Incorrect email or password."}` |
| GET | `/auth/me/` | token | returns `{id, email, full_name, is_staff}` |
| GET | `/categories/` | none | `[{id, name, slug}]` |
| GET | `/products/` | none | query: `search`, `category` (slug), `sort` = `popular` / `price_asc` / `price_desc` / `name` |
| GET | `/products/<id>/` | none | one product |
| POST | `/orders/` | token | place an order (below) |
| GET | `/orders/` | token | the logged-in customer's orders, newest first |
| GET | `/orders/<id>/` | token | one of their own orders |
| GET | `/admin/stats/` | admin | `{total_products, total_orders, total_customers, low_stock}` |
| GET, POST | `/admin/products/` | admin | all products including hidden ones / create |
| GET, PATCH, DELETE | `/admin/products/<id>/` | admin | PATCH `{"stock": 25}` updates stock only |
| GET | `/admin/orders/` | admin | all orders |
| PATCH | `/admin/orders/<id>/` | admin | body `{"status": "shipped"}`; statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled` |

An admin is a user with `is_staff: true`. Check it after login to decide whether to show the admin area.

### Product shape

```json
{
  "id": 1, "name": "Apple", "description": "...", "price": "1.50", "unit": "per lb",
  "stock": 50, "emoji": "🍎", "image_url": "", "is_active": true, "sold_count": 0,
  "category": 1, "category_name": "Fruits & Vegetables", "category_slug": "fruits-vegetables"
}
```
`price` is a string. Convert with `Number(product.price)`.

### Placing an order

`POST /orders/` with a token:

```json
{
  "full_name": "Sam Shopper",
  "email": "sam@example.com",
  "phone": "0700000000",
  "address": "12 Garden Street",
  "city": "Kabul",
  "notes": "Ring the bell",
  "payment_method": "cash",
  "items": [ { "product": 1, "quantity": 3 }, { "product": 5, "quantity": 1 } ]
}
```

- `payment_method`: `cash` or `card` (both are paid on delivery)
- `notes` is optional
- The server uses its own prices, adds the flat delivery fee (`2.00`) and reduces stock
- Success: `201` with the order (`id`, `subtotal`, `delivery_fee`, `total`, `status`, `items`, ...)
- Not enough stock: `400 {"items": ["Only 2 of Milk left in stock."]}`

## 5. Errors

| Status | Meaning |
|---|---|
| 400 | Validation problem. Body is `{"detail": "..."}` or `{"field": ["message"]}` |
| 401 | Missing or invalid token. Log the user in again |
| 403 | Logged in but not an admin |
| 404 | Not found, or someone else's order |
| 503 | `/health/` only: the API can't reach its database |

## 6. A small fetch helper

```js
const API_URL = import.meta.env.VITE_API_URL;          // Next.js: process.env.NEXT_PUBLIC_API_URL

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("freshmart_token");
  if (auth && token) headers.Authorization = `Token ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || JSON.stringify(data) || "Request failed");
  return data;
}

// Examples
// const products = await api("/products/?sort=price_asc", { auth: false });
// const { token, user } = await api("/auth/login/", { method: "POST", body: { email, password }, auth: false });
```

The Next.js frontend from the first FreshMart zip already uses exactly this API. It only needs `NEXT_PUBLIC_API_URL` set.

## 7. Quick checks when something fails

1. Open `http://localhost:8000/api/health/` in the browser. If that fails, the backend or database is the problem, not the frontend.
2. Browser console says "CORS": see section 2.
3. Network tab shows `401`: the token is missing, expired or invalid. Log in again.
4. Network tab shows the wrong URL: the environment variable has a typo, or the dev server wasn't restarted after editing it.
