import { useEffect, useState } from "react";
import { api } from "../services/api";
import ProductCard from "../components/ProductCard";
import Feedback from "../components/Feedback";
import { ProductGridSkeleton } from "../components/Skeleton";

export default function CatalogPage({ onAdd, initialCategory = "" }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    category: initialCategory,
    available: "",
    min_price: "",
    max_price: "",
    ordering: "name",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/categories/")
      .then(setCategories)
      .catch((error) => setError(error.message));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== ""),
      );
      api(`/products/?${query}`, { signal: controller.signal })
        .then(setProducts)
        .catch((error) => {
          if (error.name !== "AbortError") setError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters]);
  function field(name) {
    return {
      value: filters[name],
      onChange: (event) =>
        setFilters({ ...filters, [name]: event.target.value }),
    };
  }
  return (
    <section className="page">
      <span className="eyebrow">GOOD INGREDIENTS. GOOD DAYS.</span>
      <h1 className="page-title">Shop fresh</h1>
      <p className="text-sm text-[#788473]">
        Find your everyday favorites, one aisle at a time.
      </p>
      <div className="my-[30px] flex flex-col gap-5 sm:flex-row sm:justify-between">
        <label className="field flex-1 sm:max-w-[600px]">
          Search products
          <input
            className="input"
            type="search"
            placeholder="Try apples, milk, bread…"
            {...field("search")}
          />
        </label>
        <label className="field sm:min-w-[190px]">
          Sort by
          <select className="input" {...field("ordering")}>
            <option value="name">Name A–Z</option>
            <option value="-name">Name Z–A</option>
            <option value="price">Price low to high</option>
            <option value="-price">Price high to low</option>
          </select>
        </label>
      </div>
      <div className="grid gap-[18px] md:grid-cols-[180px_1fr] lg:grid-cols-[210px_1fr] lg:gap-7">
        <aside className="grid gap-3 self-start rounded-2xl border border-line bg-white p-5 shadow-soft max-md:grid-cols-2 md:sticky md:top-28 lg:gap-[17px]">
          <h3 className="col-span-full mb-1 text-sm">Filter your basket</h3>
          <label className="field">
            Category
            <select className="input" {...field("category")}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Availability
            <select className="input" {...field("available")}>
              <option value="">All products</option>
              <option value="true">In stock</option>
              <option value="false">Out of stock</option>
            </select>
          </label>
          <label className="field">
            Minimum price
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              {...field("min_price")}
            />
          </label>
          <label className="field">
            Maximum price
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              {...field("max_price")}
            />
          </label>
          <button
            className="text-btn justify-self-start"
            onClick={() =>
              setFilters({
                search: "",
                category: "",
                available: "",
                min_price: "",
                max_price: "",
                ordering: "name",
              })
            }
          >
            Reset filters
          </button>
        </aside>
        <div>
          <Feedback error={error} />
          {loading ? (
            <ProductGridSkeleton />
          ) : error ? null : products.length ? (
            <>
              <p className="mb-3 text-xs font-medium text-muted">
                {products.length} products
              </p>
              <div className="stagger grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={onAdd}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No products found.</h3>
              <p>Try another search or clear your filters.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
