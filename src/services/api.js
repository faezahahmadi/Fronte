import { mockRequest } from "./mockApi";
const Use_Mock = import.meta.env.VITE_USE_MOCK === "true";
const baseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

// Django answers 401 "Invalid token" even on public endpoints when a stale token
// is sent, so the token is only attached to endpoints that need it.
const PUBLIC_PATHS = [
  "/products",
  "/categories",
  "/auth/login",
  "/auth/register",
];
const isPublic = (path) =>
  PUBLIC_PATHS.some((prefix) => path.startsWith(prefix));

function friendlyError(data) {
  if (typeof data === "string")
    return "The server could not complete this request.";
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(
      ([field, message]) =>
        `${field.replaceAll("_", " ")}: ${Array.isArray(message) ? message.join(" ") : message}`,
    )
    .join(" • ");
}

async function request(path, { method = "GET", body, signal } = {}) {
  if (Use_Mock) return mockRequest(path, { method, body, signal });
  const token = isPublic(path) ? null : localStorage.getItem("freshmart_token");
  const isFile = body instanceof FormData;
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: signal || AbortSignal.timeout(15000),
      headers: {
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(!isFile && body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? (isFile ? body : JSON.stringify(body)) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError" && signal) throw error;
    if (error.name === "TimeoutError")
      throw new Error("Fresh Mart took too long to respond. Please try again.");
    throw new Error(
      "Cannot reach Fresh Mart. Check that the backend is running and try again.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server could not complete this request. Please try again.",
    );
  }
  if (!response.ok) {
    const error = new Error(friendlyError(data));
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getHealth(signal) {
  if (Use_Mock)
    return {
      api: "online",
      database: "connected",
      message: "show sample data",
    };
  const response = await fetch(`${baseUrl}/health/`, { signal });
  const data = await response.json();
  if (!response.ok && response.status !== 503)
    throw new Error("Unable to check the API.");
  // Backend answers {status, database}; the home page shows api/database/message.
  return data.status === "ok" && data.database === "ok"
    ? {
        api: "online",
        database: "connected",
        message: "React, Django and PostgreSQL are connected.",
      }
    : {
        api: "online",
        database: "unavailable",
        message: "The API is running but cannot reach its database.",
      };
}

/* ------------------------------------------------------------------ *
 * Catalog adapter
 * The pages ask for products the way the interface needs them; this part
 * translates those requests to the Django API and shapes the answers.
 * ------------------------------------------------------------------ */

// Interface sort value -> backend `sort` value ("-name" is reversed below).
const SORT = {
  name: "name",
  "-name": "name",
  price: "price_asc",
  "-price": "price_desc",
};

let categoryCache = null;
async function loadCategories(signal) {
  if (!categoryCache) categoryCache = await request("/categories/", { signal });
  return categoryCache;
}

// Products without a picture get a small emoji picture so the shop looks complete.
function emojiPicture(emoji) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#eef6e2"/><stop offset="1" stop-color="#dcebd0"/>` +
    `</linearGradient></defs><rect width="400" height="300" fill="url(#g)"/>` +
    `<text x="200" y="200" font-size="140" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function toProduct(product) {
  return {
    ...product,
    in_stock: product.is_active && product.stock > 0,
    image_src:
      product.image_url || (product.emoji ? emojiPicture(product.emoji) : ""),
  };
}

async function listProducts(params, signal) {
  const query = new URLSearchParams();
  const search = params.get("search");
  if (search) query.set("search", search);
  const categoryId = params.get("category");
  if (categoryId) {
    const match = (await loadCategories(signal)).find(
      (category) => String(category.id) === categoryId,
    );
    if (!match) return [];
    query.set("category", match.slug);
  }
  query.set("sort", SORT[params.get("ordering")] || "name");

  let products = (await request(`/products/?${query}`, { signal })).map(
    toProduct,
  );

  // Availability and price range are applied here; the backend returns every active product.
  const available = params.get("available");
  if (available === "true") products = products.filter((p) => p.in_stock);
  if (available === "false") products = products.filter((p) => !p.in_stock);
  const min = params.get("min_price");
  const max = params.get("max_price");
  if (min) products = products.filter((p) => Number(p.price) >= Number(min));
  if (max) products = products.filter((p) => Number(p.price) <= Number(max));
  if (params.get("ordering") === "-name") products.reverse();
  return products;
}

export async function api(path, options = {}) {
  const [pathname, queryString = ""] = path.split("?");
  if (pathname === "/products/")
    return listProducts(new URLSearchParams(queryString), options.signal);
  if (/^\/products\/\d+\/$/.test(pathname))
    return toProduct(await request(path, options));
  if (pathname === "/categories/") {
    categoryCache = await request(path, options);
    return categoryCache;
  }
  return request(path, options);
}
