import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import {
  addLine,
  buildCart,
  loadLines,
  reconcile,
  removeLine,
  saveLines,
  setQuantity,
} from "./cartLogic";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // `state.userId` says whose lines these are, so one customer's basket is never shown to another.
  const [state, setState] = useState({ userId: null, lines: [] });
  const [error, setError] = useState("");
  const stateRef = useRef(state);
  const userRef = useRef(userId);
  userRef.current = userId;

  const loading = userId != null && state.userId !== userId;
  const lines = state.userId === userId ? state.lines : [];

  function current() {
    return stateRef.current.userId === userRef.current ? stateRef.current.lines : [];
  }
  function commit(next) {
    const value = { userId: userRef.current, lines: next };
    stateRef.current = value;
    setState(value);
    saveLines(userRef.current, next);
  }
  function requireUser() {
    if (userRef.current == null) throw new Error("Please log in to use your cart.");
  }

  // Load the saved cart whenever a customer signs in or out.
  useEffect(() => {
    setError("");
    const value = { userId, lines: userId == null ? [] : loadLines(userId) };
    stateRef.current = value;
    setState(value);
  }, [userId]);

  async function refresh() {
    const owner = userRef.current;
    const saved = current();
    if (owner == null || !saved.length) return;
    setError("");
    try {
      const results = await Promise.all(
        saved.map((line) =>
          api(`/products/${line.product.id}/`)
            .then((product) => [line.product.id, product])
            .catch((failure) => {
              if (failure.status === 404) return [line.product.id, null];
              throw failure;
            }),
        ),
      );
      // The customer may have signed out while the prices were loading.
      if (userRef.current !== owner) return;
      commit(reconcile(current(), new Map(results)));
    } catch (failure) {
      if (userRef.current === owner)
        setError("Product prices could not be refreshed. Check your connection.");
    }
  }

  // Prices and stock may have changed since the cart was saved.
  useEffect(() => {
    if (userId != null && state.userId === userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.userId]);

  const value = useMemo(
    () => ({
      cart: buildCart(lines),
      loading,
      error,
      refresh,
      async add(product, quantity) {
        requireUser();
        commit(addLine(current(), product, Number(quantity)));
      },
      async update(product, quantity) {
        requireUser();
        commit(setQuantity(current(), product, Number(quantity)));
      },
      async remove(product) {
        requireUser();
        commit(removeLine(current(), product));
      },
      async clear() {
        requireUser();
        commit([]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, loading, error, userId],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
