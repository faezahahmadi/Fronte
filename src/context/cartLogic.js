// Cart rules, kept free of React so they are easy to read and test.
// The Django API has no cart endpoints: the cart lives in the browser (one per customer)
// and is sent to the API as a list of products and quantities when an order is placed.

const cents = (price) => Math.round(Number(price) * 100);
const format = (value) => (value / 100).toFixed(2);

// Only what the interface needs from a product is stored in the cart.
export function snapshot(product) {
  const { id, name, price, stock, in_stock, is_active, image_src, image_url, emoji, category_name } = product;
  return { id, name, price, stock, in_stock, is_active, image_src, image_url, emoji, category_name };
}

export function buildCart(lines) {
  const items = lines.map(({ product, quantity }) => ({
    id: product.id,
    product,
    quantity,
    subtotal: format(cents(product.price) * quantity),
  }));
  const total = lines.reduce((sum, { product, quantity }) => sum + cents(product.price) * quantity, 0);
  return {
    items,
    count: lines.reduce((sum, { quantity }) => sum + quantity, 0),
    total: format(total),
  };
}

export function addLine(lines, product, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new Error("Choose a valid quantity.");
  if (!product.in_stock) throw new Error(`${product.name} is out of stock.`);
  const existing = lines.find((line) => line.product.id === product.id);
  const wanted = (existing?.quantity || 0) + quantity;
  if (wanted > product.stock)
    throw new Error(`Only ${product.stock} of ${product.name} available.`);
  if (!existing) return [...lines, { product: snapshot(product), quantity }];
  return lines.map((line) =>
    line === existing ? { product: snapshot(product), quantity: wanted } : line,
  );
}

export function setQuantity(lines, product, quantity) {
  const line = lines.find((item) => item.product.id === product.id);
  if (!line) return lines;
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new Error("Choose a valid quantity.");
  if (quantity > line.product.stock)
    throw new Error(`Only ${line.product.stock} of ${line.product.name} available.`);
  return lines.map((item) => (item === line ? { ...item, quantity } : item));
}

export function removeLine(lines, product) {
  return lines.filter((line) => line.product.id !== product.id);
}

// Brings saved lines up to date with fresh product data from the API.
// fresh: Map(productId -> product, or null when the product no longer exists).
export function reconcile(lines, fresh) {
  return lines.flatMap((line) => {
    if (!fresh.has(line.product.id)) return [line];
    const latest = fresh.get(line.product.id);
    if (!latest || latest.is_active === false) return [];
    const product = snapshot(latest);
    const quantity = product.stock > 0 ? Math.min(line.quantity, product.stock) : line.quantity;
    return [{ product, quantity }];
  });
}

const key = (userId) => `freshmart_cart_${userId}`;

export function loadLines(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(userId)));
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (line) => line?.product?.id && Number.isInteger(line.quantity) && line.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveLines(userId, lines) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(lines));
  } catch {
    // Storage full or blocked: the cart still works for this visit.
  }
}
