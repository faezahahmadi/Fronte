import {
  ArrowRight,
  Boxes,
  ClipboardList,
  LogOut,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";
import Brand from "../../components/Brand";
import { useAuth } from "../../context/AuthContext";
import AuthPage from "../AuthPage";
import DashboardPage from "./DashboardPage";
import ProductsAdminPage from "./ProductsAdminPage";
import InventoryPage from "./InventoryPage";
import OrdersAdminPage from "./OrdersAdminPage";
import CustomersAdminPage from "./CustomersAdminPage";

const TABS = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/products", label: "Products", icon: Package },
  { path: "/admin/inventory", label: "Inventory", icon: Boxes },
  { path: "/admin/orders", label: "Orders", icon: ClipboardList },
  { path: "/admin/customers", label: "Customers", icon: Users },
];

const PAGES = {
  "/admin": DashboardPage,
  "/admin/products": ProductsAdminPage,
  "/admin/inventory": InventoryPage,
  "/admin/orders": OrdersAdminPage,
  "/admin/customers": CustomersAdminPage,
};

// The admin area is private to staff: signed-out visitors see the admin login form,
// and signed-in customers are told it is for administrators only.
export default function AdminLayout({ route }) {
  const { user, ready, logout } = useAuth();
  const path = route.split("?")[0].replace(/\/+$/, "") || "/admin";

  if (!ready) return <div className="empty-state">Loading your account…</div>;
  if (!user) return <AuthPage admin />;
  if (!user.is_staff)
    return (
      <section className="page">
        <div className="empty-state">
          <h2>Administrators only</h2>
          <p className="mb-5">This account does not have administrator access.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a href="#/admin/login" className="text-btn text-sm">
              Log in as an administrator <ArrowRight size={14} />
            </a>
            <a href="#/" className="text-btn text-sm">
              Return home <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>
    );

  const Page = PAGES[path];
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-linear-to-b from-leaf-900 to-forest text-white shadow-[0_12px_30px_-20px_rgba(15,46,27,0.8)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5 md:px-10 md:py-4">
          <Brand light className="text-2xl sm:text-[26px]" />
          <nav
            aria-label="Admin navigation"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white max-sm:order-3 max-sm:w-full max-sm:justify-between sm:gap-x-2 md:gap-x-3 md:text-[13px]"
          >
            {TABS.map(({ path: tabPath, label, icon: Icon }) => (
              <a
                key={tabPath}
                href={`#${tabPath}`}
                aria-current={path === tabPath ? "page" : undefined}
                className={`nav-link gap-1.5 ${path === tabPath ? "is-active" : ""}`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-white/90">
            <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[12px] font-bold uppercase text-lime ring-1 ring-white/15">
              {user.full_name?.[0]}
            </span>
            <span className="font-medium max-sm:hidden">{user.full_name}</span>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-lime/60 hover:bg-white/10"
              onClick={() => logout()}
            >
              <LogOut size={13} aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </header>
      <section className="page">
        {Page ? (
          <Page />
        ) : (
          <div className="empty-state">
            <h2>Admin page not found</h2>
            <a href="#/admin" className="text-btn text-sm">
              Back to the dashboard <ArrowRight size={14} />
            </a>
          </div>
        )}
      </section>
    </>
  );
}
