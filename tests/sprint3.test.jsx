// SPRINT 3: checkout, order confirmation and order history (6 tests)
import { describe, it, expect, vi } from "vitest";
import {
  buildOrderPayload,
  orderTotals,
  validPhone,
} from "../src/services/checkoutRules";

describe("Sprint 3: checkout rules (same rules as the backend)", () => {
  it("accepts digits (spaces and hyphens ignored) and rejects the rest", () => {
    expect(validPhone("0700000000")).toBe(true);
    expect(validPhone("070 000-0000")).toBe(true);
    expect(validPhone("۰۷۰۰۰۰۰۰۰۰")).toBe(true); // Persian digits
    expect(validPhone("+93700000000")).toBe(false); // the backend does not accept a plus sign
    expect(validPhone("12345")).toBe(false); // too short
    expect(validPhone("12a456")).toBe(false);
  });

  it("adds the delivery fee: $2.00 standard, $5.00 express", () => {
    expect(orderTotals("10.80", "standard")).toEqual({ fee: 2, total: "12.80" });
    expect(orderTotals("10.80", "express")).toEqual({ fee: 5, total: "15.80" });
  });

  it("builds exactly the body the orders API reads", () => {
    const body = buildOrderPayload(
      {
        full_name: " Sam Shopper ", email: " sam@example.com ", phone: " 0700000000 ",
        address: " 12 Garden Street ", city: " Kabul ", notes: "  ",
        payment_method: "cash", delivery_option: "express",
      },
      [{ id: 11, product_id: 1, quantity: 2 }, { id: 12, product_id: 2, quantity: 1 }],
    );
    expect(Object.keys(body).sort()).toEqual([
      "address", "city", "delivery_option", "email", "full_name",
      "items", "notes", "payment_method", "phone",
    ]);
    expect(body.full_name).toBe("Sam Shopper");
    expect(body.notes).toBe("");
    expect(body.items).toEqual([{ product: 1, quantity: 2 }, { product: 2, quantity: 1 }]);
  });
});

// ---------------------------------------------------------------- screens
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutPage from "../src/pages/CheckoutPage";
import OrdersPage from "../src/pages/OrdersPage";
import { api } from "../src/services/api";

const state = vi.hoisted(() => ({ cart: null }));
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({ user: { full_name: "Sam Shopper", email: "sam@example.com" } }),
}));
vi.mock("../src/context/CartContext", () => ({ useCart: () => state.cart }));
vi.mock("../src/services/api", () => ({ api: vi.fn() }));

function setCart() {
  state.cart = {
    cart: {
      items: [
        { id: 11, product_id: 1, name: "Apple", quantity: 2, subtotal: "3.00" },
        { id: 12, product_id: 2, name: "Milk", quantity: 1, subtotal: "2.00" },
      ],
      total_items: 3,
      total_price: "5.00",
    },
    loading: false,
    error: "",
    refresh: vi.fn().mockResolvedValue(),
  };
}

describe("Sprint 3: screens", () => {
  it("checkout will not continue until the required answers are given", async () => {
    setCart();
    api.mockReset();
    render(<CheckoutPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: /review order/i }));
    expect(await screen.findByText("Enter a phone number so we can reach you.")).toBeInTheDocument();
    expect(screen.getByText("Enter your delivery address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your city.")).toBeInTheDocument();
    expect(screen.getByText("Choose how you will pay.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("checkout reviews the order, places it and opens the confirmation", async () => {
    setCart();
    api.mockReset();
    api.mockResolvedValue({ id: 42 });
    const user = userEvent.setup();
    render(<CheckoutPage />);

    await user.type(screen.getByLabelText(/phone number/i), "0700000000");
    await user.type(screen.getByLabelText(/^address/i), "12 Garden Street");
    await user.type(screen.getByLabelText(/^city/i), "Kabul");
    await user.click(screen.getByLabelText(/express delivery/i));
    await user.click(screen.getByLabelText(/cash on delivery/i));
    await user.click(screen.getByRole("button", { name: /review order/i }));

    expect(await screen.findByRole("heading", { name: "Review your order" })).toBeInTheDocument();
    expect(screen.getByText(/12 Garden Street/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /place order/i }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const [path, options] = api.mock.calls[0];
    expect(path).toBe("/orders/");
    expect(options.method).toBe("POST");
    expect(options.body.delivery_option).toBe("express");
    expect(options.body.payment_method).toBe("cash");
    expect(options.body.items).toEqual([{ product: 1, quantity: 2 }, { product: 2, quantity: 1 }]);
    await waitFor(() => expect(window.location.hash).toBe("#/orders/42/confirmation"));
    expect(state.cart.refresh).toHaveBeenCalled();
  });

  it("the order history lists each order with its status, total and items", async () => {
    api.mockReset();
    api.mockResolvedValue([
      {
        id: 7,
        created_at: "2026-10-16T10:00:00Z",
        status: "pending",
        total: "7.00",
        items: [
          { id: 1, product_name: "Apple", quantity: 2 },
          { id: 2, product_name: "Milk", quantity: 1 },
        ],
      },
    ]);
    render(<OrdersPage />);
    expect(await screen.findByText("Order #7")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("$7.00")).toBeInTheDocument();
    expect(screen.getByText("2 × Apple · 1 × Milk")).toBeInTheDocument();
  });
});
