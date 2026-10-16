import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, LogOut, ShoppingBasket } from "lucide-react";
import Brand from "./components/Brand";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import Feedback from "./components/Feedback";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage, { OrderDetails } from "./pages/OrdersPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function NavLink({ href, active, children, className = "" }) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-link ${active ? "is-active" : ""} ${className}`}
    >
      {children}
    </a>
  );
}

function currentRoute() {
  return window.location.hash.slice(1) || "/";
}
export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const { user, ready, logout } = useAuth();
  const { cart = { total_items: 0, items: [], total_price: "0.00" }, add } = useCart();
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function addToCart(product, quantity) {
    if (!product.in_stock) {
      setToast({ message: `${product.name} is out of stock.`, type: "error" });
      return;
    }
    if (!user) {
      window.location.hash = "/login";
      return;
    }
    try {
      await add(product.id, quantity);     // ← pass the id, not the product
      setToast({ message: `${product.name} added to your basket.`, type: "success" });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    }
  }
  useEffect(() => {
    const changed = () => {
      setRoute(currentRoute());
      setError("");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const productId = route.match(/^\/products\/(\d+)$/)?.[1];
  const orderId = route.match(/^\/orders\/(\d+)(?:\/confirmation)?$/)?.[1];
  const isAdmin = route.startsWith("/admin") && route !== "/admin/login";
  // Routes reserved for a later sprint (the admin area): they exist but stay empty for now.
  const isLaterSprint = isAdmin;
  // Cart, checkout and orders are private: signed-out visitors see the login form instead.
  const isPrivate =
    ["/cart", "/checkout", "/orders"].includes(route) || !!orderId;
  let page;
  if (isLaterSprint) page = <PlaceholderPage />;
  else if (isPrivate && !ready)
    page = <div className="empty-state">Loading your account…</div>;
  else if (isPrivate && !user) page = <AuthPage />;
  else if (route === "/") page = <HomePage />;
  else if (route.split("?")[0] === "/products")
    page = (
      <CatalogPage
        key={route}
        initialCategory={
          new URLSearchParams(route.split("?")[1] || "").get("category") || ""
        }
        onAdd={addToCart}
      />
    );
  else if (productId) page = <ProductPage id={productId} onAdd={addToCart} />;
  else if (route === "/cart") page = <CartPage />;
  else if (route === "/checkout") page = <CheckoutPage />;
  else if (route === "/orders") page = <OrdersPage />;
  else if (orderId)
    page = (
      <OrderDetails
        id={orderId}
        confirmation={route.endsWith("/confirmation")}
      />
    );
  else if (["/login", "/register", "/admin/login"].includes(route))
    page = (
      <AuthPage
        key={route}
        register={route === "/register"}
        admin={route === "/admin/login"}
      />
    );
  else
    page = (
      <section className="empty-state">
        <h2>Page not found</h2>
        <a href="#/" className="text-btn text-sm">
          Return home <ArrowRight size={14} />
        </a>
      </section>
    );
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 
      bg-linear-to-b from-leaf-900 to-forest text-white shadow-[0_12px_30px_-20px_rgba(15,46,27,0.8)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap 
        items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5 md:px-10 md:py-4">
          <Brand light className="text-2xl sm:text-[26px]" />
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] 
            text-white max-sm:order-3 max-sm:w-full max-sm:justify-between 
            sm:gap-x-2 md:gap-x-3 md:text-[13px]"
          >
            <NavLink href="#/" active={route === "/"}>
              Home
            </NavLink>
            <NavLink
              href="#/products"
              active={route.split("?")[0] === "/products" || !!productId}
            >
              Products
            </NavLink>
            <NavLink
              href="#/cart"
              active={route === "/cart"}
              className="inline-flex items-center gap-1.5"
            >
              <ShoppingBasket size={16} /> Cart
              <b
                key={cart.total_items}
                className="animate-pop rounded-full bg-lime px-[7px] py-0.5 text-[10px] text-forest"
                aria-label={`${cart.total_items} items`}
              >
                {cart.total_items}
              </b>
            </NavLink>
            <NavLink href="#/orders" active={route.startsWith("/orders")}>
              My orders
            </NavLink>
          </nav>
          <div className="flex items-center gap-3 text-xs text-white/90">
            {!ready ? (
              <span className="text-white/70">Loading account…</span>
            ) : user ? (
              <>
                <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[12px] font-bold uppercase text-lime ring-1 ring-white/15">
                  {user.full_name?.[0]}
                </span>
                <span className="font-medium max-sm:hidden">
                  {user.full_name}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-lime/60 hover:bg-white/10"
                  onClick={() =>
                    logout().catch((error) => setError(error.message))
                  }
                >
                  <LogOut size={13} /> Log out
                </button>
              </>
            ) : (
              <a
                href="#/login"
                className="btn-ghost gap-1.5 px-4 py-2 text-[12px] bg-white text-leaf-900"
              >
                Login / Account <ArrowRight size={14} />
              </a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-6 md:px-10">
        <Feedback error={error} />
        {page}
      </main>
      <footer className="mt-16 bg-linear-to-b from-leaf-900 to-forest text-white/75">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-14 sm:grid-cols-[1.4fr_1fr_1fr] md:px-10">
          <div>
            <Brand light className="text-[26px]" />
            <p className="mt-5 max-w-[300px] text-xs leading-relaxed">
              Fresh groceries and everyday essentials, brought to your door.
            </p>
          </div>
          <div className="grid content-start gap-2.5 text-xs">
            <b className="mb-1 font-display text-sm text-white">Shop</b>
            <a className="transition hover:text-lime" href="#/products">
              Products
            </a>
          </div>
          <div className="grid content-start gap-2.5 text-xs">
            <b className="mb-1 font-display text-sm text-white">Store</b>
            <a
              href="#/admin/login"
              className="inline-flex items-center gap-1 transition hover:text-lime"
            >
              Admin login <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-5 text-center text-[11px] text-white/50">
          Fresh Mart · Online Grocery Shop · University Software Engineering
          Project · Demo payment only
        </div>
      </footer>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div
            className={`animate-toast max-w-[90vw] rounded-full px-6 py-3 text-[13px] text-white shadow-lift ring-1 ring-white/10 ${toast.type === "error" ? "bg-red-700" : "bg-forest"}`}
            role="status"
            aria-live="polite"
          >
            <span className={`mr-2 inline-block size-2 rounded-full align-middle ${toast.type === "error" ? "bg-red-200" : "bg-lime"}`} />
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
