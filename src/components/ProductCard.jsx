import { Leaf, Plus } from "lucide-react";

export function ProductImage({ product, className = "" }) {
  return product.image_src ? (
    <img
      className={`size-full object-cover ${className}`}
      src={product.image_src}
      alt={product.name}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
        event.currentTarget.nextElementSibling.style.display = "grid";
      }}
    />
  ) : (
    <div className={`image-placeholder ${className}`} aria-label={product.name}>
      <Leaf size={56} strokeWidth={1.5} />
    </div>
  );
}

// Hidden by default; ProductImage reveals it when the picture fails to load.
export function ImageFallback() {
  return (
    <div className="image-placeholder" style={{ display: "none" }}>
      <Leaf size={56} strokeWidth={1.5} />
    </div>
  );
}

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-leaf-400/40 hover:shadow-lift">
      <div className="relative">
        <a
          href={`#/products/${product.id}`}
          className="block aspect-[4/3] overflow-hidden bg-mist"
          aria-label={product.name}
        >
          <ProductImage
            product={product}
            className="transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <ImageFallback />
        </a>
        <span
          className={`glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.in_stock ? "text-leaf-800" : "text-sand"
            }`}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {product.in_stock ? "In stock" : "Out of stock"}
        </span>
        {onAdd && (
          <button
            className="btn absolute bottom-3 right-3 gap-1 px-3.5 py-2 text-[11px] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            type="button"
            aria-disabled={!product.in_stock}
            onClick={() => onAdd(product, 1)}
          >
            Add to cart<Plus size={13} />
          </button>
        )}
      </div>
      <div className="p-3.5 sm:p-[18px]">
        <span className="tag">{product.category_name}</span>
        <h3 className="mb-3 mt-2.5 text-base leading-tight sm:text-lg">
          <a href={`#/products/${product.id}`}>{product.name}</a>
        </h3>
        <div className="flex items-center justify-between">
          <b className="font-display text-lg text-leaf-800 sm:text-xl">
            ${Number(product.price).toFixed(2)}
          </b>
          <a
            href={`#/products/${product.id}`}
            className="text-[11px] font-semibold text-leaf-600 transition-colors hover:text-leaf-800"
          >
            Details →
          </a>
        </div>
      </div>
    </article>
  );
}
