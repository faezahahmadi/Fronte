import { useEffect, useState } from "react";
import { ArrowRight, Boxes, ClipboardList, Package, Users } from "lucide-react";
import Feedback from "../../components/Feedback";
import {
  AdminHeading,
  ProductThumb,
  StatCard,
  StockBadge,
} from "../../components/AdminUI";
import {
  LOW_STOCK_LIMIT,
  adminMessage,
  getStats,
  listAdminOrders,
  listAdminProducts,
  money,
  stockStatus,
  when,
} from "../../services/adminApi";

// Main admin screen: the four counts, products that need restocking, and the newest orders.
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getStats(), listAdminProducts(), listAdminOrders()]).then(
      (results) => {
        if (!active) return;
        const [stats, products, orders] = results;
        setData({
          stats: stats.value ?? null,
          products: products.value ?? null,
          orders: orders.value ?? null,
        });
        const failures = results
          .filter((result) => result.status === "rejected")
          .map((result) => adminMessage(result.reason));
        setError([...new Set(failures)].join(" "));
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const { stats, products, orders } = data ?? {};
  // Same rule as the backend's low_stock count: visible products only.
  const alerts = (products ?? [])
    .filter((product) => product.is_active && stockStatus(product) !== "in_stock")
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <>
      <AdminHeading
        eyebrow="FRESH MART ADMIN"
        title="Dashboard"
        intro="A quick look at your shop today."
      />
      <Feedback error={error} />
      {!data ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
          aria-label="Loading dashboard"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              href="#/admin/products"
              icon={Package}
              label="Products"
              value={stats?.total_products}
              hint="In the catalog, including hidden ones"
            />
            <StatCard
              href="#/admin/orders"
              icon={ClipboardList}
              label="Orders"
              value={stats?.total_orders}
              hint="Placed by customers"
            />
            <StatCard
              href="#/admin/customers"
              icon={Users}
              label="Customers"
              value={stats?.total_customers}
              hint="Registered shoppers"
            />
            <StatCard
              href="#/admin/inventory"
              icon={Boxes}
              label="Low or out of stock"
              value={stats?.low_stock}
              hint={`Visible products with ${LOW_STOCK_LIMIT} or fewer left`}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="card" aria-labelledby="dash-stock">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="dash-stock" className="text-xl">
                  Needs restocking
                </h2>
                <a className="text-btn" href="#/admin/inventory">
                  Manage inventory <ArrowRight size={12} />
                </a>
              </div>
              {!products ? (
                <p className="text-sm text-muted">
                  The product list could not be loaded.
                </p>
              ) : alerts.length ? (
                <ul className="grid gap-3">
                  {alerts.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ProductThumb product={product} />
                        <span className="min-w-0">
                          <b className="block truncate text-[13px] text-forest">
                            {product.name}
                          </b>
                          <small className="text-[11px] text-muted">
                            {product.stock} left
                          </small>
                        </span>
                      </span>
                      <StockBadge product={product} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Every visible product has enough stock.
                </p>
              )}
            </section>

            <section className="card" aria-labelledby="dash-orders">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="dash-orders" className="text-xl">
                  Latest orders
                </h2>
                <a className="text-btn" href="#/admin/orders">
                  All orders <ArrowRight size={12} />
                </a>
              </div>
              {!orders ? (
                <p className="text-sm text-muted">
                  The orders could not be loaded.
                </p>
              ) : orders.length ? (
                <ul className="grid gap-3">
                  {orders.slice(0, 5).map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                    >
                      <span>
                        <b className="block text-[13px] text-forest">
                          Order #{order.id} · {order.full_name}
                        </b>
                        <small className="text-[11px] text-muted">
                          {when(order.created_at)}
                        </small>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={`status-pill ${order.status}`}>
                          {order.status}
                        </span>
                        <b className="text-[13px]">{money(order.total)}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No orders have been placed yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
