import { useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { ImageFallback, ProductImage } from "../components/ProductCard";
import Feedback from "../components/Feedback";
import ConfirmAction from "../components/ConfirmAction";

const qtyButton =
  "flex h-[34px] w-[30px] items-center justify-center bg-[#f5f8ef] text-[#38653d] disabled:cursor-not-allowed disabled:opacity-[0.35]";

export default function CartPage() {
  const {
    cart,
    loading,
    error: loadError,
    refresh,
    update,
    remove,
    clear,
  } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="empty-state">Loading your cart…</div>;
  return (
    <section className="page">
      <span className="eyebrow">YOUR EVERYDAY GOODNESS</span>
      <h1 className="page-title">Your basket</h1>
      <Feedback error={error || loadError} />
      {loadError && (
        <button className="text-btn" onClick={() => act(refresh)}>
          Retry loading cart
        </button>
      )}
      {cart.items.length ? (
        <div className="mt-[30px] grid gap-[30px] md:grid-cols-[minmax(0,1fr)_310px]">
          <div>
            {cart.items.map((item) => (
              <article
                className="mb-3 grid grid-cols-[60px_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-soft transition duration-300 hover:shadow-lift sm:grid-cols-[80px_1fr_auto_auto] sm:gap-5 sm:p-4"
                key={item.id}
              >
                <a
                  className="size-[60px] overflow-hidden rounded-[10px] sm:size-20"
                  href={`#/products/${item.product.id}`}
                >
                  <ProductImage product={item.product} />
                  <ImageFallback />
                </a>
                <div className="col-span-2 sm:col-span-1">
                  <h3 className="mb-1.5 text-[15px]">
                    <a href={`#/products/${item.product.id}`}>
                      {item.product.name}
                    </a>
                  </h3>
                  <p className="mb-2 text-[11px] text-[#7b8873]">
                    ${Number(item.product.price).toFixed(2)} each
                  </p>
                  <button
                    className="text-btn"
                    disabled={busy}
                    onClick={() => act(() => remove(item.product))}
                  >
                    Remove
                  </button>
                </div>
                <div className="col-start-2 row-start-2 flex items-center justify-self-start overflow-hidden rounded-lg border border-[#e0e7d9] text-xs sm:col-auto sm:row-auto sm:justify-self-auto">
                  <button
                    className={qtyButton}
                    disabled={busy || item.quantity <= 1}
                    aria-label={`Decrease ${item.product.name}`}
                    onClick={() =>
                      act(() => update(item.product, item.quantity - 1))
                    }
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[30px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    className={qtyButton}
                    disabled={
                      busy ||
                      item.quantity >= item.product.stock ||
                      !item.product.in_stock
                    }
                    aria-label={`Increase ${item.product.name}`}
                    onClick={() =>
                      act(() => update(item.product, item.quantity + 1))
                    }
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <b className="text-xs sm:text-sm">
                  ${Number(item.subtotal).toFixed(2)}
                </b>
              </article>
            ))}
            <div className="flex items-center justify-between gap-2.5 py-[25px] text-[11px] sm:gap-5 sm:text-xs">
              <a href="#/products" className="inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Continue shopping
              </a>
              <ConfirmAction
                label="Clear cart"
                message="Clear all products from your cart?"
                disabled={busy}
                onConfirm={() => act(clear)}
              />
            </div>
          </div>
          <aside className="order-summary">
            <h3>Basket summary</h3>
            <div>
              <span>Items</span>
              <b>{cart.count}</b>
            </div>
            <div>
              <span>Subtotal</span>
              <b>${Number(cart.total).toFixed(2)}</b>
            </div>
            <p>Delivery is calculated at checkout.</p>
            <a className="btn mt-5 w-full py-3 text-xs" href="#/checkout">
              Proceed to checkout <ArrowRight size={14} />
            </a>
          </aside>
        </div>
      ) : (
        !loadError && (
          <div className="empty-state">
            <h3>Your cart is empty.</h3>
            <p className="mb-5">Fill it with something fresh.</p>
            <a className="btn" href="#/products">
              Explore products <ArrowRight size={14} />
            </a>
          </div>
        )
      )}
    </section>
  );
}
