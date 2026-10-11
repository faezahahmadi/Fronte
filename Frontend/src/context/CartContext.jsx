import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [cart, setCart] = useState({
    id: null,
    items: [],
    total_items: 0,
    total_price: "0.00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the server-side cart whenever a customer signs in or out.
  useEffect(() => {
    if (userId == null) {
      setCart({ id: null, items: [], total_items: 0, total_price: "0.00" });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function refresh() {
    if (userId == null) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("/cart/");
      setCart(data);
    } catch (failure) {
      setError(failure.message || "Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }

  function requireUser() {
    if (userId == null) throw new Error("Please log in to use your cart.");
  }

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      refresh,
      async add(productId, quantity = 1) {
        requireUser();
        const data = await api("/cart/add/", {
          method: "POST",
          body: { product_id: productId, quantity: Number(quantity) },
        });
        setCart(data);
      },
      async update(cartItemId, quantity) {
        requireUser();
        const data = await api(`/cart/items/${cartItemId}/`, {
          method: "PATCH",
          body: { quantity: Number(quantity) },
        });
        setCart(data);
      },
      async remove(cartItemId) {
        requireUser();
        const data = await api(`/cart/items/${cartItemId}/remove/`, {
          method: "DELETE",
        });
        setCart(data);
      },
      async clear() {
        requireUser();
        const data = await api("/cart/clear/", { method: "DELETE" });
        setCart(data);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, loading, error, userId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}