import { useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import Feedback from "../../components/Feedback";
import {
  AdminHeading,
  ProductThumb,
  StockBadge,
} from "../../components/AdminUI";
import {
  LOW_STOCK_LIMIT,
  adminMessage,
  listAdminProducts,
  stockStatus,
  updateStock,
  validStock,
} from "../../services/adminApi";

const FILTERS = [
  ["all", "All products"],
  ["low_stock", "Low stock"],
  ["out_of_stock", "Out of stock"],
];

const names = (products) => products.map((product) => product.name).join(", ");

// Warnings for visible products that are running low or sold out (same rule as the dashboard count).
export function StockAlerts({ products }) {
  const visible = products.filter((product) => product.is_active);
  const out = visible.filter((product) => stockStatus(product) === "out_of_stock");
  const low = visible.filter((product) => stockStatus(product) === "low_stock");
  if (!out.length && !low.length) return null;
  return (
    <div className="mb-6 grid gap-3" role="region" aria-label="Stock alerts">
      {out.length > 0 && (
        <div className="notice-error my-0" role="alert">
          <b className="inline-flex items-center gap-1.5">
            <TriangleAlert size={14} aria-hidden="true" />
            {out.length} {out.length === 1 ? "product is" : "products are"} out of
            stock:
          </b>{" "}
          {names(out)}
        </div>
      )}
      {low.length > 0 && (
        <div
          className="my-0 rounded-xl border border-[#f1ddc8] bg-[#fff5ed] px-4 py-[13px] text-[13px] text-[#8b684e]"
          role="alert"
        >
          <b className="inline-flex items-center gap-1.5">
            <TriangleAlert size={14} aria-hidden="true" />
            {low.length} {low.length === 1 ? "product is" : "products are"} running
            low ({LOW_STOCK_LIMIT} or fewer left):
          </b>{" "}
          {names(low)}
        </div>
      )}
      <p className="text-[11px] text-muted">
        Hidden products are left out of these alerts.
      </p>
    </div>
  );
}

// One product summary with a separate inventory editor page.
export function StockRow({ product }) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <ProductThumb product={product} />
          <div>
            <b className="block text-[13px] text-forest">{product.name}</b>{" "}
            <small>
              {product.category_name}
              {!product.is_active && " · Hidden from the shop"}
            </small>
          </div>
        </div>
      </td>
      <td>
        <b className="text-[15px]">{product.stock}</b>{" "}
        <small>{product.unit}</small>
      </td>
      <td>
        <StockBadge product={product} />
      </td>
      <td>
        <a className="text-btn" href={`#/admin/inventory/${product.id}`}>
          Update stock
        </a>
      </td>
    </tr>
  );
}

// Stock quantities, availability status and low-stock warnings (US-22).
export default function InventoryPage() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(() => {
    const savedMessage = sessionStorage.getItem("freshmart_inventory_message");
    if (savedMessage) sessionStorage.removeItem("freshmart_inventory_message");
    return savedMessage || "";
  });
  const [filter, setFilter] = useState("all");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    listAdminProducts()
      .then((list) => {
        if (active) setProducts(list);
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function refresh() {
    setError("");
    setMessage("");
    setReload((count) => count + 1);
  }

  const sorted = [...(products ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const count = (status) =>
    sorted.filter((product) => stockStatus(product) === status).length;
  const shown =
    filter === "all"
      ? sorted
      : sorted.filter((product) => stockStatus(product) === filter);

  return (
    <>
      <AdminHeading
        eyebrow="INVENTORY MANAGEMENT"
        title="Inventory"
        intro="Keep stock quantities up to date. Customers can only order what is in stock."
      >
        <button type="button" className="btn-ghost" onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </AdminHeading>
      <Feedback error={error} message={message} />
      {!products ? (
        !error && <div className="empty-state">Loading inventory…</div>
      ) : (
        <>
          <StockAlerts products={products} />
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by stock">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  filter === value
                    ? "border-leaf-800 bg-leaf-800 text-white"
                    : "border-line bg-white text-leaf-800 hover:bg-mist"
                }`}
              >
                {label} ({value === "all" ? sorted.length : count(value)})
              </button>
            ))}
          </div>
          {shown.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>In stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((product) => (
                    <StockRow
                      key={`${product.id}-${product.stock}`}
                      product={product}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Nothing to show here.</h3>
              <p>No products match this filter.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function StockEditorPage({ route }) {
  const productId = route.match(/^\/admin\/inventory\/(\d+)$/)?.[1];
  const [product, setProduct] = useState(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    listAdminProducts()
      .then((products) => {
        if (!active) return;
        const found = products.find((item) => item.id === Number(productId));
        if (found) {
          setProduct(found);
          setValue(String(found.stock));
        } else {
          setError("Product not found.");
        }
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [productId, reload]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!validStock(value)) {
      setError("Enter a whole number, 0 or more.");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateStock(product.id, value);
      sessionStorage.setItem(
        "freshmart_inventory_message",
        `${saved.name} now has ${saved.stock} in stock.`,
      );
      window.location.hash = "/admin/inventory";
    } catch (failure) {
      setError(adminMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeading
        eyebrow="INVENTORY MANAGEMENT"
        title={product ? `Update ${product.name}` : "Update stock"}
        intro="Set the available quantity for this product."
      >
        <a className="btn-ghost" href="#/admin/inventory">Back to inventory</a>
      </AdminHeading>
      <Feedback error={error} message={message} />
      {product ? (
        <form onSubmit={save} noValidate className="card grid max-w-xl gap-4">
          <div className="flex items-center gap-3">
            <ProductThumb product={product} />
            <div>
              <b className="text-forest">{product.name}</b>
              <p className="text-xs text-muted">
                Current stock: {product.stock} {product.unit}
              </p>
            </div>
          </div>
          <label className="field">
            New stock quantity
            <input
              className="input"
              inputMode="numeric"
              aria-label="New stock quantity"
              aria-invalid={!!error}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn" disabled={saving}>
              {saving ? "Saving…" : "Save stock"}
            </button>
            <a className="btn-ghost" href="#/admin/inventory">Cancel</a>
          </div>
        </form>
      ) : error ? (
        <button
          type="button"
          className="text-btn text-sm"
          onClick={() => {
            setError("");
            setReload((count) => count + 1);
          }}
        >
          Try again
        </button>
      ) : (
        <div className="empty-state">Loading inventory item…</div>
      )}
    </>
  );
}
