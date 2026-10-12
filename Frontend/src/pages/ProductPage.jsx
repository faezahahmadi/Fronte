import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { api } from "../services/api";
import { ImageFallback, ProductImage } from "../components/ProductCard";
import Feedback from "../components/Feedback";

export default function ProductPage({ id, onAdd }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    setProduct(null);
    setError("");
    setQuantity(1);
    api(`/products/${id}/`)
      .then(setProduct)
      .catch((error) => setError(error.message));
  }, [id]);
  if (error && !product)
    return (
      <section className="page">
        <Feedback error={error} />
        <a href="#/products" className="text-btn text-sm">
          Back to products <ArrowRight size={14} />
        </a>
      </section>
    );
  if (!product) return <div className="empty-state">Loading product…</div>;
  return (
    <section className="page">
      <Feedback error={error} />
      <a className="text-btn" href="#/products">
        <ArrowLeft size={14} /> All products
      </a>
      <div className="mt-[30px] grid items-center gap-6 md:grid-cols-2 md:gap-[50px]">
        <div className="h-[300px] overflow-hidden rounded-[2rem] bg-mist shadow-lift md:h-[460px]">
          <ProductImage product={product} />
          <ImageFallback />
        </div>
        <div>
          <span className="eyebrow">{product.category_name}</span>
          <h1 className="my-5 text-[36px] tracking-[-1.2px] md:text-[48px]">
            {product.name}
          </h1>
          <p className="my-4 text-[#76846f]">{product.description}</p>
          <p className="my-4 font-display text-[32px] font-semibold text-leaf-600">
            ${Number(product.price).toFixed(2)}
          </p>
          <p
            className={`my-4 ${product.in_stock ? "text-leaf-500" : "text-sand"}`}
          >
            {product.in_stock
              ? `In stock · ${product.stock} available`
              : "Out of stock"}
          </p>
          {onAdd && (
            <>
              <label className="field mb-5 w-[100px]">
                Quantity
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    setError("");
                  }}
                />
              </label>
              <button
                className="btn"
                disabled={!product.in_stock}
                onClick={() => {
                  const count = Number(quantity);
                  if (
                    !Number.isInteger(count) ||
                    count < 1 ||
                    count > product.stock
                  ) {
                    setError("Choose a valid quantity within available stock.");
                    return;
                  }
                  setError("");
                  onAdd(product, count);
                }}
              >
                Add to cart <Plus size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
