import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import ConfirmAction from "../../components/ConfirmAction";
import Feedback from "../../components/Feedback";
import { AdminHeading } from "../../components/AdminUI";
import {
  adminMessage,
  day,
  getCustomer,
  listCustomers,
  money,
  setCustomerActive,
} from "../../services/adminApi";

function AccountStatus({ customer }) {
  return (
    <span className={`status-pill ${customer.is_active ? "delivered" : "cancelled"}`}>
      {customer.is_active ? "Active" : "Blocked"}
    </span>
  );
}

// The one allowed account operation: block, or unblock again.
export function BlockControl({ customer, onChange, busy = false }) {
  return customer.is_active ? (
    <ConfirmAction
      danger
      label="Block"
      message={`Block ${customer.full_name}? They will not be able to log in until you unblock them.`}
      disabled={busy}
      onConfirm={() => onChange(customer, false)}
    />
  ) : (
    <button
      type="button"
      className="text-btn"
      disabled={busy}
      onClick={() => onChange(customer, true)}
    >
      Unblock
    </button>
  );
}

export function CustomersTable({ customers, onView, onChange, busyId }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Joined</th>
            <th>Orders</th>
            <th>Total spent</th>
            <th>Account</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <b className="block text-[13px] text-forest">{customer.full_name}</b>{" "}
                <small>{customer.email}</small>
              </td>
              <td>{day(customer.date_joined)}</td>
              <td>{customer.order_count}</td>
              <td>{money(customer.total_spent)}</td>
              <td>
                <AccountStatus customer={customer} />
              </td>
              <td>
                <div className="flex flex-wrap items-start gap-4">
                  <button
                    type="button"
                    className="text-btn"
                    aria-label={`View ${customer.full_name}`}
                    onClick={() => onView(customer)}
                  >
                    View
                  </button>
                  <BlockControl
                    customer={customer}
                    onChange={onChange}
                    busy={busyId === customer.id}
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

function CustomerDetail({ customer, onChange, onClose, busy }) {
  const rows = [
    ["Email", customer.email],
    ["Joined", day(customer.date_joined)],
    ["Orders placed", customer.order_count],
    ["Total spent", money(customer.total_spent)],
  ];
  return (
    <section className="card mb-8" aria-label={`Details for ${customer.full_name}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{customer.full_name}</h2>
          <div className="mt-2">
            <AccountStatus customer={customer} />
          </div>
        </div>
        <button
          type="button"
          className="text-btn"
          aria-label="Close customer details"
          onClick={onClose}
        >
          <X size={14} aria-hidden="true" /> Close
        </button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-bold uppercase tracking-[1.2px] text-leaf-800/70">
              {label}
            </dt>
            <dd className="mt-1 break-words text-[13px] text-forest">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <BlockControl customer={customer} onChange={onChange} busy={busy} />
      </div>
    </section>
  );
}

// Registered customers and their account status (US-29).
export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    listCustomers()
      .then((list) => {
        if (active) setCustomers(list);
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [reload]);

  // Opening a customer asks the API for that one record, so the counts are fresh.
  useEffect(() => {
    if (selectedId == null) return;
    let active = true;
    getCustomer(selectedId)
      .then((fresh) => {
        if (!active) return;
        setCustomers((list) =>
          list ? list.map((item) => (item.id === fresh.id ? fresh : item)) : list,
        );
      })
      .catch((failure) => {
        if (active) setError(adminMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  function retry() {
    setError("");
    setReload((count) => count + 1);
  }

  async function changeAccess(customer, isActive) {
    setError("");
    setMessage("");
    setBusyId(customer.id);
    try {
      const saved = await setCustomerActive(customer.id, isActive);
      setCustomers((list) =>
        list.map((item) => (item.id === saved.id ? saved : item)),
      );
      setMessage(
        `${saved.full_name} was ${saved.is_active ? "unblocked" : "blocked"}.`,
      );
    } catch (failure) {
      setError(adminMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  const needle = search.trim().toLowerCase();
  const shown = (customers ?? []).filter((customer) =>
    `${customer.full_name} ${customer.email}`.toLowerCase().includes(needle),
  );
  const selected = customers?.find((customer) => customer.id === selectedId);

  return (
    <>
      <AdminHeading
        eyebrow="CUSTOMER ACCOUNTS"
        title="Customers"
        intro="See who has registered, how much they have ordered, and block an account if needed."
      />
      <Feedback error={error} message={message} />
      {selected && (
        <CustomerDetail
          customer={selected}
          busy={busyId === selected.id}
          onChange={changeAccess}
          onClose={() => setSelectedId(null)}
        />
      )}
      {!customers ? (
        error ? (
          <button type="button" className="text-btn text-sm" onClick={retry}>
            Try again
          </button>
        ) : (
          <div className="empty-state">Loading customers…</div>
        )
      ) : (
        <>
          <label className="field mb-5 max-w-[420px]">
            Search customers
            <span className="relative block">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                className="input pl-10"
                type="search"
                placeholder="Name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>
          {shown.length ? (
            <>
              <p className="mb-3 text-xs font-medium text-muted">
                {shown.length} of {customers.length} customers
              </p>
              <CustomersTable
                customers={shown}
                busyId={busyId}
                onView={(customer) => setSelectedId(customer.id)}
                onChange={changeAccess}
              />
            </>
          ) : (
            <div className="empty-state">
              <h3>
                {customers.length ? "No customers match." : "No customers yet."}
              </h3>
              <p>
                {customers.length
                  ? "Try another search."
                  : "Customers appear here after they register."}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
