import { api } from "./api";

// Admin calls and rules, written to mirror the Django API exactly
// (store/serializers.py and store/views.py, Sprint 4).
// If the backend changes a rule, change it here too.
// Every request carries the "Authorization: Token <admin_token>" header:
// api() adds the saved login token to every private path, and /admin/* is private.

// ---------------------------------------------------------------- stock

// Backend: stock_status is "out_of_stock" at 0, "low_stock" up to 10, else "in_stock".
export const LOW_STOCK_LIMIT = 10;
// Backend: stock is a PositiveIntegerField (PostgreSQL maximum).
export const MAX_STOCK = 2147483647;

export const STOCK_STATUS_LABELS = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

// Use the status the API sends; the fallback only protects against a missing field.
export function stockStatus(product) {
  if (product.stock_status) return product.stock_status;
  if (product.stock === 0) return "out_of_stock";
  return product.stock <= LOW_STOCK_LIMIT ? "low_stock" : "in_stock";
}

// Whole number, 0 or more, within the database limit.
export function validStock(value) {
  const text = String(value).trim();
  return /^\d+$/.test(text) && Number(text) <= MAX_STOCK;
}

// Backend price: DecimalField(max_digits=8, decimal_places=2), minimum 0.
export function validPrice(value) {
  return /^\d{1,6}(\.\d{1,2})?$/.test(String(value).trim());
}

// ---------------------------------------------------------------- orders

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// Backend OrderStatusSerializer.ALLOWED_TRANSITIONS: delivered and cancelled are final.
export const STATUS_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
export const nextStatuses = (status) => STATUS_TRANSITIONS[status] ?? [];

export const STATUS_ACTIONS = {
  processing: "Start processing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

// ---------------------------------------------------------------- products

export const emptyProductForm = () => ({
  name: "",
  category: "",
  price: "",
  unit: "each",
  stock: "0",
  emoji: "",
  description: "",
  is_active: true,
  image_file: null,
});

export const productToFormValues = (product) => ({
  name: product.name,
  category: String(product.category),
  price: Number(product.price).toFixed(2),
  unit: product.unit,
  stock: String(product.stock),
  emoji: product.emoji || "",
  description: product.description || "",
  is_active: product.is_active,
  image_file: null,
});

// Same limits as the Product model: name 150, unit 30, emoji 8, price and stock above.
export function validateProduct(values, { creating = true } = {}) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter the product name.";
  else if (name.length > 150)
    errors.name = "Name must be 150 characters or fewer.";

  if (!values.category) errors.category = "Choose a category.";

  const price = values.price.trim();
  if (!price) errors.price = "Enter the price.";
  else if (!validPrice(price))
    errors.price =
      "Enter a price such as 2.50: not negative, up to 6 digits before the point and 2 after.";

  const unit = values.unit.trim();
  if (!unit) errors.unit = "Enter the unit, for example each, per kg or 1 L.";
  else if (unit.length > 30) errors.unit = "Unit must be 30 characters or fewer.";

  if ([...values.emoji.trim()].length > 8)
    errors.emoji = "Use 8 characters or fewer.";

  if (creating) {
    const stock = values.stock.trim();
    if (!stock) errors.stock = "Enter the stock quantity.";
    else if (!validStock(stock))
      errors.stock = "Stock must be a whole number, 0 or more.";
  }
  return errors;
}

// Keep the JSON API contract unless an image needs a multipart upload.
export function buildProductPayload(values, { creating = true } = {}) {
  const payload = {
    name: values.name.trim(),
    description: values.description.trim(),
    price: Number(values.price.trim()).toFixed(2),
    unit: values.unit.trim(),
    emoji: values.emoji.trim(),
    category: Number(values.category),
    is_active: Boolean(values.is_active),
  };

  if (creating) {
    payload.stock = Number(values.stock.trim());
  }

  if (values.image_file) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("image", values.image_file);
    return formData;
  }

  return payload;
}

// ---------------------------------------------------------------- display helpers

export const money = (value) => `$${Number(value).toFixed(2)}`;
export const when = (value) => new Date(value).toLocaleString();
export const day = (value) => new Date(value).toLocaleDateString();

// "2 × Apple · 1 × Milk · +3 more"
export function itemSummary(items) {
  const shown = items
    .slice(0, 3)
    .map((item) => `${item.quantity} × ${item.product_name}`);
  const more = items.length - shown.length;
  return more > 0 ? `${shown.join(" · ")} · +${more} more` : shown.join(" · ");
}

// Backend answers: 401 = missing or invalid token, 403 = signed in but not an admin.
export function adminMessage(error) {
  if (error?.status === 401)
    return "Your session has expired. Log in again from the admin login page.";
  if (error?.status === 403)
    return "This account does not have administrator access.";
  return error?.message || "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------- API calls

function formPayload(payload) {
  if (payload instanceof FormData) return payload;
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  return formData;
}

export const getStats = () => api("/admin/stats/");

export const listCategories = () => api("/categories/");

export const listAdminProducts = () => api("/admin/products/");
export const createAdminProduct = (payload) =>
  api("/admin/products/", { method: "POST", body: formPayload(payload) });
export const updateAdminProduct = (id, payload) =>
  api(`/admin/products/${id}/`, {
    method: "PATCH",
    body: formPayload(payload),
  });
export const updateStock = (id, stock) =>
  updateAdminProduct(id, { stock: Number(stock) });
export const deleteAdminProduct = (id) =>
  api(`/admin/products/${id}/`, { method: "DELETE" });

export const listAdminOrders = (status = "") =>
  api(`/admin/orders/${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const getAdminOrder = (id) => api(`/admin/orders/${id}/`);
export const updateOrderStatus = (id, status) =>
  api(`/admin/orders/${id}/`, {
    method: "PATCH",
    body: formPayload({ status }),
  });

export const listCustomers = () => api("/admin/customers/");
export const getCustomer = (id) => api(`/admin/customers/${id}/`);
export const setCustomerActive = (id, isActive) =>
  api(`/admin/customers/${id}/`, {
    method: "PATCH",
    body: formPayload({ is_active: Boolean(isActive) }),
  });
