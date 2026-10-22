import { useEffect, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import Feedback from "../../components/Feedback";
import ConfirmAction from "../../components/ConfirmAction";
import {
  AdminHeading,
  Field,
  ProductThumb,
  StockBadge,
} from "../../components/AdminUI";
import {
  adminMessage,
  buildProductPayload,
  createAdminProduct,
  deleteAdminProduct,
  emptyProductForm,
  listAdminProducts,
  listCategories,
  money,
  productToFormValues,
  updateAdminProduct,
  validateProduct,
} from "../../services/adminApi";

// Add a product, or edit an existing one (US-21).
export function ProductForm({ product = null, categories, onSaved, onCancel }) {
  const creating = !product;
  const [values, setValues] = useState(() =>
    product ? productToFormValues(product) : emptyProductForm(),
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function field(name) {
    return {
      value: values[name],
      onChange: (event) => {
        setValues((current) => ({ ...current, [name]: event.target.value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
      },
      "aria-invalid": !!errors[name],
    };
  }

  async function submit(event) {
    event.preventDefault();
    const found = validateProduct(values, { creating });
    setErrors(found);
    if (Object.keys(found).length) {
      setError("");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildProductPayload(values, { creating });
      const saved = creating
        ? await createAdminProduct(payload)
        : await updateAdminProduct(product.id, payload);
      onSaved(saved, creating);
    } catch (failure) {
      setError(adminMessage(failure));
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="card mb-8 grid gap-4 sm:grid-cols-2"
      aria-label={creating ? "Add a product" : "Edit product"}
    >
      <h2 className="text-xl sm:col-span-2">
        {creating ? "Add a product" : `Edit ${product.name}`}
      </h2>
      <div className="sm:col-span-2">
        <Feedback error={error} />
      </div>
      <Field label="Product name" error={errors.name}>
        <input className="input" maxLength={150} {...field("name")} />
      </Field>
      <Field label="Category" error={errors.category}>
        <select className="input" {...field("category")}>
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price ($)" error={errors.price}>
        <input
          className="input"
          inputMode="decimal"
          placeholder="2.50"
          {...field("price")}
        />
      </Field>
      <Field
        label="Unit"
        error={errors.unit}
        hint="For example each, per kg or 1 L."
      >
        <input className="input" maxLength={30} {...field("unit")} />
      </Field>
      {creating ? (
        <Field label="Stock quantity" error={errors.stock}>
          <input className="input" inputMode="numeric" {...field("stock")} />
        </Field>
      ) : (
        <p className="self-end text-xs text-muted">
          Stock now: <b className="text-forest">{product.stock}</b>. Change
          quantities on the <a href="#/admin/inventory">Inventory</a> page.
        </p>
      )}
      <Field
        label="Emoji"
        error={errors.emoji}
        hint="Shown in the shop when the product has no picture."
      >
        <input className="input" placeholder="🍎" {...field("emoji")} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea className="input min-h-24" rows={3} {...field("description")} />
      </Field>
      <label className="flex items-center gap-2.5 text-xs font-semibold text-leaf-900/80 sm:col-span-2">
        <input
          type="checkbox"
          className="size-4 accent-leaf-600"
          checked={values.is_active}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              is_active: event.target.checked,
            }))
          }
        />
        Visible in the shop
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : creating ? "Add product" : "Save changes"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ProductsTable({ products, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>In the shop</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="flex items-center gap-3">
                  <ProductThumb product={product} />
                  <div>
                    <b className="block text-[13px] text-forest">
                      {product.name}
                    </b>{" "}
                    <small>
                      {product.category_name} · {product.unit}
                    </small>
                  </div>
                </div>
              </td>
              <td>{money(product.price)}</td>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  <b>{product.stock}</b>
                  <StockBadge product={product} />
                </div>
              </td>
              <td>
                {product.is_active ? (
                  <span className="tag">Visible</span>
                ) : (
                  <span className="inline-block rounded-full bg-[#f1f0e3] px-2.5 py-0.5 text-[10px] font-semibold text-[#7c7a4a]">
                    Hidden
                  </span>
                )}
              </td>
              <td>
                <div className="flex flex-wrap items-start gap-4">
                  <button
                    type="button"
                    className="text-btn"
                    aria-label={`Edit ${product.name}`}
                    onClick={() => onEdit(product)}
                  >
                    <Pencil size={12} aria-hidden="true" /> Edit
                  </button>
                  <ConfirmAction
                    danger
                    label="Delete"
                    message={`Delete ${product.name}? It leaves the shop and customers' carts. Past orders keep their details. This cannot be undone.`}
                    onConfirm={() => onDelete(product)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductsAdminPage() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(null); // null, "new", or the product being edited
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([listAdminProducts(), listCategories()])
      .then(([productList, categoryList]) => {
        if (!active) return;
        setProducts(productList);
        setCategories(categoryList);
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function retry() {
    setError("");
    setReload((count) => count + 1);
  }

  function saved(product, created) {
    setProducts((list) =>
      created
        ? [product, ...list]
        : list.map((item) => (item.id === product.id ? product : item)),
    );
    setForm(null);
    setError("");
    setMessage(
      created ? `${product.name} was added.` : `${product.name} was updated.`,
    );
  }

  async function remove(product) {
    setError("");
    setMessage("");
    try {
      await deleteAdminProduct(product.id);
      setProducts((list) => list.filter((item) => item.id !== product.id));
      setForm((current) =>
        current && current !== "new" && current.id === product.id
          ? null
          : current,
      );
      setMessage(`${product.name} was deleted.`);
    } catch (failure) {
      setError(adminMessage(failure));
    }
  }

  const needle = search.trim().toLowerCase();
  const shown = (products ?? []).filter((product) =>
    `${product.name} ${product.category_name}`.toLowerCase().includes(needle),
  );

  return (
    <>
      <AdminHeading
        eyebrow="PRODUCT MANAGEMENT"
        title="Products"
        intro="Add, edit and remove the products customers see in the shop."
      >
        <button
          type="button"
          className="btn"
          onClick={() => {
            setMessage("");
            setForm("new");
          }}
        >
          <Plus size={15} aria-hidden="true" /> Add product
        </button>
      </AdminHeading>
      <Feedback error={error} message={message} />
      {form && (
        <ProductForm
          key={form === "new" ? "new" : form.id}
          product={form === "new" ? null : form}
          categories={categories}
          onSaved={saved}
          onCancel={() => setForm(null)}
        />
      )}
      {!products ? (
        error ? (
          <button type="button" className="text-btn text-sm" onClick={retry}>
            Try again
          </button>
        ) : (
          <div className="empty-state">Loading products…</div>
        )
      ) : (
        <>
          <label className="field mb-5 max-w-[420px]">
            Search products
            <span className="relative block">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                className="input pl-10"
                type="search"
                placeholder="Name or category"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>
          {shown.length ? (
            <>
              <p className="mb-3 text-xs font-medium text-muted">
                {shown.length} of {products.length} products
              </p>
              <ProductsTable
                products={shown}
                onEdit={(product) => {
                  setMessage("");
                  setForm(product);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={remove}
              />
            </>
          ) : (
            <div className="empty-state">
              <h3>{products.length ? "No products match." : "No products yet."}</h3>
              <p>
                {products.length
                  ? "Try another search."
                  : "Use Add product to create the first one."}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
