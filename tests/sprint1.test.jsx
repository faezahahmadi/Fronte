// SPRINT 1: accounts, home page, catalog and product display (5 tests)
import { describe, it, expect, vi } from "vitest";
import { api } from "../src/services/api";

function reply(data, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => data });
}
const categories = [
  { id: 1, name: "Fruits & Vegetables", slug: "fruits-vegetables" },
  { id: 2, name: "Dairy & Eggs", slug: "dairy-eggs" },
];
function fakeBackend(products = []) {
  return vi.fn((url) =>
    reply(String(url).includes("/categories/") ? categories : products),
  );
}
const apple = { id: 1, name: "Apple", price: "1.50", stock: 5, is_active: true, emoji: "🍎", image_url: "" };
const bread = { id: 2, name: "Bread", price: "2.00", stock: 0, is_active: true, emoji: "🍞", image_url: "" };
const cheese = { id: 3, name: "Cheddar", price: "4.20", stock: 9, is_active: true, emoji: "🧀", image_url: "http://example.com/c.jpg" };

describe("Sprint 1: catalog requests", () => {
  it("turns the category id and the sort option into what the backend expects", async () => {
    const fetchMock = fakeBackend([]);
    vi.stubGlobal("fetch", fetchMock);
    await api("/products/?category=2&ordering=-price&search=milk");
    const url = fetchMock.mock.calls.map(([u]) => u).find((u) => u.includes("/products/"));
    expect(url).toContain("category=dairy-eggs");
    expect(url).toContain("sort=price_desc");
    expect(url).toContain("search=milk");
  });

  it("adds stock status and pictures, and applies the availability and price filters", async () => {
    vi.stubGlobal("fetch", fakeBackend([apple, bread, cheese]));
    const all = await api("/products/?ordering=name");
    expect(all.map((p) => p.name)).toEqual(["Apple", "Bread", "Cheddar"]);
    expect(all[0].in_stock).toBe(true);
    expect(all[1].in_stock).toBe(false);
    expect(all[0].image_src).toMatch(/^data:image\/svg\+xml/); // emoji picture
    expect(all[2].image_src).toBe("http://example.com/c.jpg"); // real picture wins

    const cheapInStock = await api("/products/?available=true&max_price=3&ordering=name");
    expect(cheapInStock.map((p) => p.name)).toEqual(["Apple"]);
    const outOfStock = await api("/products/?available=false&ordering=name");
    expect(outOfStock.map((p) => p.name)).toEqual(["Bread"]);
  });

  it("sends the saved login token only to private endpoints", async () => {
    localStorage.setItem("freshmart_token", "abc123");
    const fetchMock = vi.fn(() => reply({}));
    vi.stubGlobal("fetch", fetchMock);
    await api("/auth/login/", { method: "POST", body: { email: "a@b.co", password: "x" } });
    await api("/cart/");
    const [login, cart] = fetchMock.mock.calls;
    expect(login[1].headers.Authorization).toBeUndefined();
    expect(cart[1].headers.Authorization).toBe("Token abc123");
  });
});

// ---------------------------------------------------------------- screens
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "../src/pages/AuthPage";
import ProductCard from "../src/components/ProductCard";

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe("Sprint 1: screens", () => {
  it("registration shows a message under each field that is wrong", async () => {
    const user = userEvent.setup();
    render(<AuthPage register />);
    await user.type(screen.getByLabelText(/full name/i), "Sa");
    await user.type(screen.getByLabelText(/email address/i), "sam@example.com");
    const [password, confirm] = screen.getAllByLabelText(/password/i);
    await user.type(password, "password123");
    await user.type(confirm, "different123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name must be at least 3 characters.")).toBeInTheDocument();
    expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();
  });

  it("a product card shows price and stock, and only offers Add to cart when allowed", async () => {
    const user = userEvent.setup();
    const product = { id: 1, name: "Apple", price: "1.50", category_name: "Fruits", in_stock: true, image_src: "" };

    const first = render(<ProductCard product={product} />);
    expect(screen.getByText("$1.50")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add to cart/i })).toBeNull();
    first.unmount();

    const onAdd = vi.fn();
    const second = render(<ProductCard product={product} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(onAdd).toHaveBeenCalledWith(product, 1);
    second.unmount();

    render(<ProductCard product={{ ...product, in_stock: false }} onAdd={onAdd} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    const outOfStockButton = screen.getByRole("button", { name: /add to cart/i });
    expect(outOfStockButton).toHaveAttribute("aria-disabled", "true");
    expect(outOfStockButton).toBeEnabled();
    await user.click(outOfStockButton);
    expect(onAdd).toHaveBeenLastCalledWith({ ...product, in_stock: false }, 1);
  });
});
