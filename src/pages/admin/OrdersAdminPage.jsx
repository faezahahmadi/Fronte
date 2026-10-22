import { useEffect, useState } from "react";
import ConfirmAction from "../../components/ConfirmAction";
import Feedback from "../../components/Feedback";
import { AdminHeading } from "../../components/AdminUI";
import { deliveryLabel, paymentLabel } from "../../services/checkoutRules";
import {
  STATUS_ACTIONS,
  adminMessage,
  itemSummary,
  listAdminOrders,
  money,
  nextStatuses,
  updateOrderStatus,
  when,
} from "../../services/adminApi";

const FILTERS = [
  ["", "All"],
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

// One customer order: summary, the status controls, and the full details when opened.
export function OrderCard({ order, onStatus, busy = false }) {
  const [open, setOpen] = useState(false);
  const next = nextStatuses(order.status);
  return (
    <article className="my-4 grid gap-3 rounded-2xl border border-line bg-white p-[18px] shadow-soft sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-5">
        <div>
          <h3 className="text-base">Order #{order.id}</h3>
          <p className="text-xs text-[#809074]">{when(order.created_at)}</p>
        </div>
        <div className="text-xs">
          <b className="block text-forest">{order.full_name}</b>
          <span className="text-muted">{order.customer_email}</span>
        </div>
        <span className={`status-pill ${order.status}`}>{order.status}</span>
        <b>{money(order.total)}</b>
      </div>
      <p className="text-xs text-muted">{itemSummary(order.items)}</p>

      <div className="flex flex-wrap items-start gap-3 border-t border-[#edf1e4] pt-3">
        {next.length ? (
          next.map((status) =>
            status === "cancelled" ? (
              <ConfirmAction
                key={status}
                danger
                label={STATUS_ACTIONS[status]}
                message={`Cancel order #${order.id}? The items go back into stock. This cannot be undone.`}
                disabled={busy}
                onConfirm={() => onStatus(order, status)}
              />
            ) : (
              <button
                key={status}
                type="button"
                className="btn px-4 py-2 text-[11px]"
                disabled={busy}
                onClick={() => onStatus(order, status)}
              >
                {STATUS_ACTIONS[status]}
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-muted">
            This order is {order.status}. Its status can no longer be changed.
          </p>
        )}
        <button
          type="button"
          className="text-btn ml-auto"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide details" : "View details"}
        </button>
      </div>

      {open && (
        <div className="grid gap-5 border-t border-[#edf1e4] pt-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
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
            <h4 className="mb-1 mt-5 font-heading text-[15px] font-semibold text-forest">
              Delivery information
            </h4>
            <p className="my-2 text-[13px] text-[#75836e]">
              {order.full_name}
              <br />
              {order.email} · {order.phone}
            </p>
            <p className="my-2 text-[13px] text-[#75836e]">
              {order.address}, {order.city}
              {order.notes && (
                <>
                  <br />
                  Notes: {order.notes}
                </>
              )}
            </p>
            <p className="my-2 text-[13px] text-[#75836e]">
              {deliveryLabel(order.delivery_option)}
              <br />
              {paymentLabel(order.payment_method)}
            </p>
          </div>
          <aside className="order-summary md:static">
            <h3>Order total</h3>
            <div>
              <span>Subtotal</span>
              <b>{money(order.subtotal)}</b>
            </div>
            <div>
              <span>Delivery</span>
              <b>{money(order.delivery_fee)}</b>
            </div>
            <div className="border-t border-[#dce6d3] pt-[18px] text-[15px]">
              <span>Total</span>
              <b>{money(order.total)}</b>
            </div>
          </aside>
        </div>
      )}
    </article>
  );
}

// All customer orders, filtered by status, with the status controls (US-28).
export default function OrdersAdminPage() {
  const [filter, setFilter] = useState("");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [reload, setReload] = useState(0);
  const visibleOrders = (orders ?? []).filter(
    (order) => !filter || order.status === filter,
  );

  useEffect(() => {
    let active = true;
    listAdminOrders(filter)
      .then((list) => {
        if (active) setOrders(list);
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [filter, reload]);

  function choose(status) {
    if (status === filter) return;
    setOrders(null);
    setError("");
    setMessage("");
    setFilter(status);
  }

  function retry() {
    setError("");
    setReload((count) => count + 1);
  }

  async function changeStatus(order, status) {
    setError("");
    setMessage("");
    setUpdatingId(order.id);
    try {
      const saved = await updateOrderStatus(order.id, status);
      setOrders((list) =>
        filter && saved.status !== filter
          ? list.filter((item) => item.id !== saved.id)
          : list.map((item) => (item.id === saved.id ? saved : item)),
      );
      setMessage(`Order #${saved.id} is now ${saved.status}.`);
    } catch (failure) {
      setError(adminMessage(failure));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <AdminHeading
        eyebrow="ORDER MANAGEMENT"
        title="Orders"
        intro="Review customer orders and move them along: pending, processing, shipped, delivered."
      />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            aria-pressed={filter === value}
            onClick={() => choose(value)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              filter === value
                ? "border-leaf-800 bg-leaf-800 text-white"
                : "border-line bg-white text-leaf-800 hover:bg-mist"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Feedback error={error} message={message} />
      {!orders ? (
        error ? (
          <button type="button" className="text-btn text-sm" onClick={retry}>
            Try again
          </button>
        ) : (
          <div className="empty-state">Loading orders…</div>
        )
      ) : visibleOrders.length ? (
        <>
          <p className="text-xs font-medium text-muted">
            {visibleOrders.length} {visibleOrders.length === 1 ? "order" : "orders"}
          </p>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={updatingId === order.id}
              onStatus={changeStatus}
            />
          ))}
        </>
      ) : (
        <div className="empty-state">
          <h3>No orders found.</h3>
          <p>
            {filter
              ? `There are no ${filter} orders right now.`
              : "Orders appear here as soon as customers place them."}
          </p>
        </div>
      )}
    </>
  );
}
