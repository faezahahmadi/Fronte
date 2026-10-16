import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import {
  DELIVERY_OPTIONS,
  PAYMENT_OPTIONS,
  buildOrderPayload,
  deliveryLabel,
  orderTotals,
  paymentLabel,
  validPhone,
} from "../services/checkoutRules";
import Feedback from "../components/Feedback";

const fieldset =
  "mb-6 grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6";
const legend = "px-2.5 font-display text-base font-semibold text-forest";
const choice =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-leaf-400 has-[:checked]:border-leaf-500 has-[:checked]:bg-mist has-[:checked]:shadow-soft";
const money = (value) => `$${Number(value).toFixed(2)}`;

function FieldError({ error }) {
  return error ? (
    <small role="alert" className="text-clay">
      {error.message}
    </small>
  ) : null;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, loading, refresh, error: cartError } = useCart();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    shouldUnregister: false,
    mode: "onTouched",
    defaultValues: {
      // Account details are filled in for the customer; they can still be changed.
      full_name: user.full_name || "",
      email: user.email || "",
      phone: "",
      address: "",
      city: "",
      notes: "",
      delivery_option: "standard",
      payment_method: "",
    },
  });
  const [review, setReview] = useState(false);
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderFailed, setOrderFailed] = useState(false);

  const items = cart?.items || [];
  const subtotal = cart?.total_price || "0.00";
  const selectedDelivery = review ? details.delivery_option : watch("delivery_option");
  const { fee, total } = orderTotals(subtotal, selectedDelivery);

  function reviewOrder(values) {
    setDetails(values);
    setReview(true);
    setError("");
    setOrderFailed(false);
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    setOrderFailed(false);
    try {
      const order = await api("/orders/", {
        method: "POST",
        body: buildOrderPayload(details, items),
      });
      // The server has saved the order and emptied the cart; bring the screen up to date.
      await refresh().catch(() => {});
      window.location.hash = `/orders/${order.id}/confirmation`;
    } catch (failure) {
      setError(failure.message);
      setOrderFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !items.length)
    return <div className="empty-state">Loading your cart…</div>;
  if (!items.length)
    return (
      <section className="page">
        <Feedback error={cartError} />
        <div className="empty-state">
          <h3>Your cart is empty.</h3>
          <a href="#/products" className="text-btn text-sm">
            Continue shopping <ArrowRight size={14} />
          </a>
        </div>
      </section>
    );

  return (
    <section className="page">
      <span className="eyebrow">FRESH GOODNESS, ON ITS WAY</span>
      <h1 className="page-title">{review ? "Review your order" : "Checkout"}</h1>
      <Feedback error={error || cartError} />
      {orderFailed && (
        <p className="-mt-2 mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <a className="text-btn" href="#/cart">
            <ArrowLeft size={12} /> Check your cart
          </a>
          <a className="text-btn" href="#/orders">
            See my orders <ArrowRight size={12} />
          </a>
        </p>
      )}
      <div className="mt-[30px] grid gap-[30px] md:grid-cols-[minmax(0,1fr)_310px]">
        <div>
          {!review ? (
            <form onSubmit={handleSubmit(reviewOrder)} noValidate>
              <fieldset className={fieldset}>
                <legend className={legend}>1 · Contact information</legend>
                <label className="field">
                  Full name
                  <input
                    className="input"
                    aria-invalid={!!errors.full_name}
                    autoComplete="name"
                    maxLength={150}
                    {...register("full_name", {
                      required: "Enter your full name.",
                      minLength: { value: 3, message: "Name must be at least 3 characters." },
                      maxLength: { value: 150, message: "Name must be 150 characters or fewer." },
                    })}
                  />
                  <FieldError error={errors.full_name} />
                </label>
                <label className="field">
                  Email
                  <input
                    className="input"
                    type="email"
                    aria-invalid={!!errors.email}
                    autoComplete="email"
                    {...register("email", {
                      required: "Enter your email address.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address.",
                      },
                    })}
                  />
                  <FieldError error={errors.email} />
                </label>
                <label className="field">
                  Phone number
                  <input
                    className="input"
                    type="tel"
                    aria-invalid={!!errors.phone}
                    autoComplete="tel"
                    maxLength={30}
                    {...register("phone", {
                      required: "Enter a phone number so we can reach you.",
                      validate: (value) =>
                        validPhone(value) ||
                        "Enter a valid phone number (digits only, at least 6).",
                    })}
                  />
                  <FieldError error={errors.phone} />
                </label>
              </fieldset>

              <fieldset className={fieldset}>
                <legend className={legend}>2 · Shipping address</legend>
                <label className="field">
                  Address
                  <input
                    className="input"
                    aria-invalid={!!errors.address}
                    autoComplete="street-address"
                    maxLength={255}
                    {...register("address", {
                      required: "Enter your delivery address.",
                      minLength: { value: 5, message: "Address must be at least 5 characters." },
                      maxLength: { value: 255, message: "Address must be 255 characters or fewer." },
                    })}
                  />
                  <FieldError error={errors.address} />
                </label>
                <label className="field">
                  City
                  <input
                    className="input"
                    aria-invalid={!!errors.city}
                    autoComplete="address-level2"
                    maxLength={100}
                    {...register("city", {
                      required: "Enter your city.",
                      minLength: { value: 2, message: "City must be at least 2 characters." },
                      maxLength: { value: 100, message: "City must be 100 characters or fewer." },
                    })}
                  />
                  <FieldError error={errors.city} />
                </label>
                <label className="field">
                  Delivery notes (optional)
                  <textarea
                    className="input min-h-[85px] resize-y"
                    {...register("notes")}
                  />
                </label>
              </fieldset>

              <fieldset className={fieldset}>
                <legend className={legend}>3 · Delivery option</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DELIVERY_OPTIONS.map((option) => (
                    <label key={option.value} className={choice}>
                      <input
                        type="radio"
                        value={option.value}
                        className="mt-1 accent-leaf-600"
                        {...register("delivery_option", { required: "Choose a delivery option." })}
                      />
                      <span className="grid text-[13px]">
                        <b className="text-forest">{option.label}</b>
                        <span className="text-muted">
                          {option.detail} · {money(option.fee)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError error={errors.delivery_option} />
              </fieldset>

              <fieldset className={fieldset}>
                <legend className={legend}>4 · Payment information</legend>
                <div className="notice-success my-0">
                  Both options are paid when your order arrives. No money is
                  taken online, so please do not enter card details anywhere.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label key={option.value} className={choice}>
                      <input
                        type="radio"
                        value={option.value}
                        className="mt-1 accent-leaf-600"
                        {...register("payment_method", { required: "Choose how you will pay." })}
                      />
                      <span className="text-[13px] font-semibold text-forest">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError error={errors.payment_method} />
              </fieldset>
              <button className="btn">
                Review order <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <div className="card">
              <h3 className="text-[17px]">Contact & delivery</h3>
              <p className="my-4 text-[13px] text-[#75836e]">
                {details.full_name}
                <br />
                {details.email}
                <br />
                {details.phone}
              </p>
              <p className="my-4 text-[13px] text-[#75836e]">
                {details.address}
                <br />
                {details.city}
                {details.notes.trim() && (
                  <>
                    <br />
                    Notes: {details.notes.trim()}
                  </>
                )}
              </p>
              <p className="my-4 text-[13px] text-[#75836e]">
                {deliveryLabel(details.delivery_option)}
                <br />
                {paymentLabel(details.payment_method)}
              </p>
              <div className="notice-success">
                Payment is collected when your order arrives.
              </div>
              <div className="flex items-center justify-between gap-2.5 py-[25px] text-[11px] sm:gap-5 sm:text-xs">
                <button
                  type="button"
                  disabled={busy}
                  className="text-btn"
                  onClick={() => setReview(false)}
                >
                  <ArrowLeft size={14} /> Edit information
                </button>
                <button className="btn" disabled={busy} onClick={placeOrder}>
                  {busy ? (
                    "Placing order…"
                  ) : (
                    <>
                      Place order <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className="order-summary">
          <h3>{review ? "5 · Review order" : "Order summary"}</h3>
          {items.map((item) => (
            <div key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <b>{money(item.subtotal)}</b>
            </div>
          ))}
          <hr />
          <div>
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </div>
          <div>
            <span>Delivery</span>
            <b>{money(fee)}</b>
          </div>
          <div className="border-t border-[#dce6d3] pt-[18px] text-[17px]">
            <span>Total</span>
            <b>{money(total)}</b>
          </div>
          <p>Final prices and stock are confirmed by Fresh Mart when you place your order.</p>
        </aside>
      </div>
    </section>
  );
}
