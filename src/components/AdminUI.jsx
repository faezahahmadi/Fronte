import { useState } from "react";
import { Leaf } from "lucide-react";
import { STOCK_STATUS_LABELS, stockStatus } from "../services/adminApi";

// Small pieces shared by the admin pages.

const STOCK_TONE = {
  in_stock: "bg-[#e1f3d9] text-[#2f7a3c]",
  low_stock: "bg-[#fbefd5] text-[#94621a]",
  out_of_stock: "bg-[#fae9e3] text-[#9a4f3c]",
};

// Green / amber / red badge driven by the backend's stock_status.
export function StockBadge({ product }) {
  const status = stockStatus(product);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold before:size-1.5 before:rounded-full before:bg-current ${STOCK_TONE[status]}`}
    >
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

// The product picture, or its emoji, or a leaf when it has neither.
export function ProductThumb({ product }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-mist text-2xl">
      {product.image_url && !failed ? (
        <img
          className="size-full object-cover"
          src={product.image_url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : product.emoji ? (
        <span aria-hidden="true">{product.emoji}</span>
      ) : (
        <Leaf size={22} className="text-leaf-500" aria-hidden="true" />
      )}
    </span>
  );
}

export function AdminHeading({ eyebrow, title, intro, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-title mb-2">{title}</h1>
        {intro && <p className="text-sm text-[#788473]">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ href, icon: Icon, label, value, hint }) {
  return (
    <a
      href={href}
      className="card block transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-leaf-800/70">
          {label}
        </span>
        <span className="grid size-9 place-items-center rounded-xl bg-leaf-100 text-leaf-800">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <b className="mt-4 block font-display text-4xl text-forest">
        {value ?? "–"}
      </b>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </a>
  );
}

// A labelled form field with its message underneath, like the login and checkout forms.
export function Field({ label, error, hint, className = "", children }) {
  return (
    <label className={`field ${className}`}>
      {label}
      {children}
      {hint && !error && (
        <small className="font-normal text-faint">{hint}</small>
      )}
      {error && (
        <small role="alert" className="font-semibold text-clay">
          {error}
        </small>
      )}
    </label>
  );
}
