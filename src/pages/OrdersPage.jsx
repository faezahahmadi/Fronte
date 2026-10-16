import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { deliveryLabel, paymentLabel } from "../services/checkoutRules";
import Feedback from "../components/Feedback";

const money = (value) => `$${Number(value).toFixed(2)}`;
const when = (value) => new Date(value).toLocaleString();

// "2 × Apple · 1 × Milk · +3 more"
function itemSummary(items) {
  const shown = items.slice(0, 3).map((item) => `${item.quantity} × ${item.product_name}`);
  const more = items.length - shown.length;
  return more > 0 ? `${shown.join(" · ")} · +${more} more` : shown.join(" · ");
}

// Order history: the signed-in customer's own orders, newest first.
export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/orders/")
      .then(setOrders)
      .catch((failure) => setError(failure.message));
  }, []);
  return (
    <section className="page">
      <span className="eyebrow">YOUR FRESH MART JOURNEY</span>
      <h1 className="page-title">My orders</h1>
      <Feedback error={error} />
      {!orders && !error ? (
        <div className="empty-state">Loading orders…</div>
      ) : orders?.length ? (
        <div>
          {orders.map((order) => (
            <article
              className="my-4 grid gap-3 rounded-2xl border border-line bg-white p-[18px] shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-[22px]"
              key={order.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-5">
                <div>
                  <h3 className="text-base">Order #{order.id}</h3>
                  <p className="text-xs text-[#809074]">{when(order.created_at)}</p>
                </div>
                <span className={`status-pill ${order.status}`}>{order.status}</span>
                <b>{money(order.total)}</b>
                <a className="text-btn" href={`#/orders/${order.id}`}>
                  View details <ArrowRight size={12} />
                </a>
              </div>
              <p className="text-xs text-muted">{itemSummary(order.items)}</p>
            </article>
          ))}
        </div>
      ) : (
        !error && (
          <div className="empty-state">
            <h3>You have no previous orders.</h3>
            <a className="btn mt-4" href="#/products">
              Start shopping <ArrowRight size={14} />
            </a>
          </div>
        )
      )}
    </section>
  );
}

// One order: shown right after checkout (confirmation) and from the order history.
export function OrderDetails({ id, confirmation = false }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setOrder(null);
    setError("");
    api(`/orders/${id}/`)
      .then(setOrder)
      .catch((failure) => setError(failure.message));
  }, [id]);

  return (
    <section className="page">
      <span className="eyebrow">
        {confirmation ? "THANK YOU FOR SHOPPING FRESH" : "ORDER DETAILS"}
      </span>
      <h1 className="page-title">
        {confirmation ? "Order successfully placed" : `Order #${id}`}
      </h1>
      <Feedback error={error} />
      {error && (
        <a className="text-btn text-sm" href="#/orders">
          Back to my orders <ArrowRight size={14} />
        </a>
      )}
      {!order && !error ? (
        <div className="empty-state">Loading order…</div>
      ) : (
        order && (
          <>
            {confirmation && (
              <div className="notice-success">
                We received your order. Your order number is <b>#{order.id}</b>.
                Payment is collected on delivery.
              </div>
            )}
            <div className="flex items-center justify-between gap-5">
              <p className="text-xs text-[#809074]">
                Order #{order.id} · {when(order.created_at)}
              </p>
              <span className={`status-pill ${order.status}`}>{order.status}</span>
            </div>
            <div className="mt-[30px] grid gap-[30px] md:grid-cols-[minmax(0,1fr)_310px]">
              <div className="card">
                <h3 className="mb-3 text-[17px]">Products</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.unit_price)}</td>
                          <td>{money(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="mt-6 text-[17px]">Delivery information</h3>
                <p className="my-4 text-[13px] text-[#75836e]">
                  {order.full_name}
                  <br />
                  {order.email} · {order.phone}
                </p>
                <p className="my-4 text-[13px] text-[#75836e]">
                  {order.address}, {order.city}
                  {order.notes && (
                    <>
                      <br />
                      Notes: {order.notes}
                    </>
                  )}
                </p>
                <p className="my-4 text-[13px] text-[#75836e]">
                  {deliveryLabel(order.delivery_option)}
                  <br />
                  {paymentLabel(order.payment_method)}
                </p>
              </div>
              <aside className="order-summary">
                <h3>Order total</h3>
                <div>
                  <span>Subtotal</span>
                  <b>{money(order.subtotal)}</b>
                </div>
                <div>
                  <span>Delivery</span>
                  <b>{money(order.delivery_fee)}</b>
                </div>
                <div className="border-t border-[#dce6d3] pt-[18px] text-[17px]">
                  <span>Total</span>
                  <b>{money(order.total)}</b>
                </div>
                <p>Paid on delivery. No online payment was taken.</p>
                <a className="btn mt-5 w-full py-3 text-xs" href="#/orders">
                  My orders <ArrowRight size={14} />
                </a>
                {confirmation && (
                  <a className="btn-ghost mt-3 w-full py-3 text-xs" href="#/products">
                    Continue shopping
                  </a>
                )}
              </aside>
            </div>
          </>
        )
      )}
    </section>
  );
}
