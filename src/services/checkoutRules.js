// Checkout rules, written to mirror the Django API exactly (store/serializers.py).
// If the backend changes a rule, change it here too.

export const DELIVERY_OPTIONS = [
  { value: "standard", label: "Standard delivery", detail: "2 to 3 days", fee: 2 },
  { value: "express", label: "Express delivery", detail: "Next day", fee: 5 },
];

export const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash on delivery" },
  { value: "card", label: "Card on delivery" },
];

export const deliveryLabel = (value) =>
  DELIVERY_OPTIONS.find((option) => option.value === value)?.label ?? value;
export const paymentLabel = (value) =>
  PAYMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;

// The API ignores spaces and hyphens, then needs digits only, at least 6 of them.
export function validPhone(value) {
  return /^\p{Nd}{6,}$/u.test(String(value).trim().replace(/[ -]/g, ""));
}

export function orderTotals(subtotal, deliveryOption) {
  const fee = DELIVERY_OPTIONS.find((option) => option.value === deliveryOption)?.fee ?? 2;
  const cents = Math.round(Number(subtotal) * 100) + fee * 100;
  return { fee, total: (cents / 100).toFixed(2) };
}

// Exactly the body POST /orders/ expects. The server recalculates prices and totals itself.
export function buildOrderPayload(values, items) {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    notes: (values.notes || "").trim(),
    payment_method: values.payment_method,
    delivery_option: values.delivery_option,
    items: items.map((item) => ({ product: item.product_id, quantity: item.quantity })),
  };
}
