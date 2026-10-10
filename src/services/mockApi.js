// TEMPORARY: pretends to be the Django API so the interface can be checked without a backend.
// Delete this file when the real backend is connected.
import { CATEGORIES, PRODUCTS } from "./mockData";

const DELAY = 500; // milliseconds, so the loading skeletons are visible
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  price_asc: (a, b) => a.price - b.price || a.name.localeCompare(b.name),
  price_desc: (a, b) => b.price - a.price || a.name.localeCompare(b.name),
  popular: (a, b) => b.sold_count - a.sold_count || a.name.localeCompare(b.name),
};

function userFor(email) {
  const name = email.split("@")[0];
  return {
    id: email.includes("admin") ? 1 : 2,
    email,
    full_name: name.charAt(0).toUpperCase() + name.slice(1),
    is_staff: email.includes("admin"), // any email containing "admin" is an administrator
  };
}

export async function mockRequest(path, { method = "GET", body, signal } = {}) {
  await wait(DELAY);
  if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");

  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);

  if (pathname === "/categories/") return copy(CATEGORIES);

  if (pathname === "/products/") {
    let list = PRODUCTS.filter((product) => product.is_active);
    const search = (params.get("search") || "").trim().toLowerCase();
    if (search)
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search),
      );
    const category = params.get("category");
    if (category) list = list.filter((product) => product.category_slug === category);
    const sort = SORTS[params.get("sort")] || SORTS.popular;
    return copy([...list].sort(sort));
  }

  const detail = pathname.match(/^\/products\/(\d+)\/$/);
  if (detail) {
    const product = PRODUCTS.find((item) => item.id === Number(detail[1]));
    if (!product) throw fail(404, "No Product matches the given query.");
    return copy(product);
  }

  if (pathname === "/auth/login/" && method === "POST") {
    if (!body?.email || body.password === "wrong")
      throw fail(400, "Incorrect email or password.");
    const user = userFor(body.email.toLowerCase());
    localStorage.setItem("freshmart_mock_user", JSON.stringify(user));
    return { token: "mock-token", user };
  }

  if (pathname === "/auth/register/" && method === "POST") {
    if (body?.email?.toLowerCase() === "taken@test.com")
      throw fail(400, "email: An account with this email already exists.");
    return { token: "mock-token", user: userFor(body.email.toLowerCase()) };
  }

  if (pathname === "/auth/me/") {
    const saved = localStorage.getItem("freshmart_mock_user");
    if (localStorage.getItem("freshmart_token") !== "mock-token" || !saved)
      throw fail(401, "Invalid token.");
    return JSON.parse(saved);
  }

  throw fail(404, "Not found. This page is not part of the mock data.");
}
