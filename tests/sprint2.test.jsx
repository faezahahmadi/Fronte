// SPRINT 2: the shopping cart page (5 tests)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartPage from "../src/pages/CartPage";

// The cart page reads everything from useCart(), so the tests hand it a ready-made cart.
const state = vi.hoisted(() => ({ value: null }));
vi.mock("../src/context/CartContext", () => ({ useCart: () => state.value }));

const apple = { id: 11, product_id: 1, name: "Apple", price: "1.50", unit: "per lb", stock: 5, emoji: "🍎", image_url: "", quantity: 2, subtotal: "3.00" };
const milk = { id: 12, product_id: 2, name: "Milk", price: "2.00", unit: "1 L", stock: 9, emoji: "🥛", image_url: "", quantity: 1, subtotal: "2.00" };

function setCart(items, extra = {}) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2);
  state.value = {
    cart: { items, total_items: count, total_price: total },
    loading: false,
    error: "",
    refresh: vi.fn().mockResolvedValue(),
    update: vi.fn().mockResolvedValue(),
    remove: vi.fn().mockResolvedValue(),
    clear: vi.fn().mockResolvedValue(),
    ...extra,
  };
}

describe("Sprint 2: cart page", () => {
  beforeEach(() => setCart([]));

  it("shows a friendly message when the cart is empty", () => {
    render(<CartPage />);
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("lists the items with their totals and links to checkout", () => {
    setCart([apple, milk]);
    render(<CartPage />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument(); // basket subtotal
    expect(screen.getByRole("link", { name: /proceed to checkout/i })).toHaveAttribute("href", "#/checkout");
  });

  it("stops the plus button at the stock limit and the minus button at one", () => {
    setCart([{ ...apple, quantity: 5, subtotal: "7.50" }, milk]);
    render(<CartPage />);
    expect(screen.getByRole("button", { name: "Increase Apple" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease Milk" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase Milk" })).toBeEnabled();
  });

  it("asks the cart to change the quantity when plus is pressed", async () => {
    setCart([apple]);
    render(<CartPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Increase Apple" }));
    expect(state.value.update).toHaveBeenCalledWith(11, 3);
  });

  it("only clears the cart after the customer confirms", async () => {
    setCart([apple]);
    const user = userEvent.setup();
    render(<CartPage />);
    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByText("Clear all products from your cart?")).toBeInTheDocument();
    expect(state.value.clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(state.value.clear).toHaveBeenCalledTimes(1);
  });
});
