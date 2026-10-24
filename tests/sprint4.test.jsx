// SPRINT 4: admin panel, products, inventory, orders and customers (11 tests)
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import {
  buildProductPayload,
  createAdminProduct,
  deleteAdminProduct,
  getCustomer,
  getStats,
  listAdminOrders,
  listAdminProducts,
  listCustomers,
  nextStatuses,
  setCustomerActive,
  stockStatus,
  updateOrderStatus,
  updateStock,
  validPrice,
  validStock,
  validateProduct,
} from "../src/services/adminApi";
import AdminLayout from "../src/pages/admin/AdminLayout";
import OrdersAdminPage from "../src/pages/admin/OrdersAdminPage";
import CustomersAdminPage from "../src/pages/admin/CustomersAdminPage";
import { api } from "../src/services/api";

const state = vi.hoisted(() => ({ auth: null }));
vi.mock("../src/context/AuthContext", () => ({ useAuth: () => state.auth }));
vi.mock("../src/context/CartContext", () => ({
  useCart: () => ({
    cart: { total_items: 0, items: [], total_price: "0.00" },
    add: async () => {},
  }),
}));
vi.mock("../src/services/api", () => ({ api: vi.fn() }));

// ---------------------------------------------------------------- fixtures
// Shaped like the answers of the Sprint 4 Django API.
const categories = [
  { id: 1, name: "Fruits & Vegetables", slug: "fruits-vegetables" },
  { id: 2, name: "Dairy & Eggs", slug: "dairy-eggs" },
];
const apple = {
  id: 1, name: "Apple", description: "", price: "1.50", unit: "per lb", stock: 50,
  stock_status: "in_stock", emoji: "🍎", image_url: "", is_active: true, sold_count: 0,
  category: 1, category_name: "Fruits & Vegetables", category_slug: "fruits-vegetables",
};
const milk = {
  ...apple, id: 2, name: "Milk", price: "2.00", unit: "1 L", stock: 4,
  stock_status: "low_stock", emoji: "🥛", category: 2,
  category_name: "Dairy & Eggs", category_slug: "dairy-eggs",
};
const eggs = {
  ...milk, id: 3, name: "Eggs", price: "3.20", unit: "12", stock: 0,
  stock_status: "out_of_stock", emoji: "🥚",
};
const order = (id, status) => ({
  id, customer_email: "sam@example.com", full_name: "Sam Shopper", email: "sam@example.com",
  phone: "0700000000", address: "12 Garden Street", city: "Kabul", notes: "",
  payment_method: "cash", delivery_option: "standard", status, subtotal: "5.00",
  delivery_fee: "2.00", total: "7.00", created_at: "2026-10-19T10:00:00Z",
  items: [{ id: 1, product: 1, product_name: "Apple", unit_price: "1.50", quantity: 2, line_total: "3.00" }],
});
const sam = {
  id: 2, email: "sam@example.com", full_name: "Sam Shopper", is_active: true,
  date_joined: "2026-10-01T08:00:00Z", order_count: 1, total_spent: "7.00",
};
const lina = { ...sam, id: 3, email: "lina@example.com", full_name: "Lina Noor", order_count: 0, total_spent: "0.00" };

window.scrollTo = vi.fn();

// The table row that holds a given name (shown in bold in its first cell).
const rowOf = (name) => screen.getByText(name, { selector: "b" }).closest("tr");

// ---------------------------------------------------------------- rules and requests
describe("Sprint 4: admin rules (same rules as the backend)", () => {
  it("an order can only move along the allowed status steps", () => {
    expect(nextStatuses("pending")).toEqual(["processing", "cancelled"]);
    expect(nextStatuses("processing")).toEqual(["shipped", "cancelled"]);
    expect(nextStatuses("shipped")).toEqual(["delivered"]);
    expect(nextStatuses("delivered")).toEqual([]); // final
    expect(nextStatuses("cancelled")).toEqual([]); // final
  });

  it("stock status, stock quantity and price follow the backend rules", () => {
    expect(stockStatus({ stock: 0 })).toBe("out_of_stock");
    expect(stockStatus({ stock: 1 })).toBe("low_stock");
    expect(stockStatus({ stock: 10 })).toBe("low_stock");
    expect(stockStatus({ stock: 11 })).toBe("in_stock");
    expect(stockStatus({ stock: 99, stock_status: "low_stock" })).toBe("low_stock"); // the API's word wins
    expect(validStock("0")).toBe(true);
    expect(validStock(" 25 ")).toBe(true);
    expect(validStock("-1")).toBe(false);
    expect(validStock("2.5")).toBe(false);
    expect(validStock("abc")).toBe(false);
    expect(validStock("2147483648")).toBe(false); // above the database limit
    expect(validPrice("2.5")).toBe(true);
    expect(validPrice("0")).toBe(true);
    expect(validPrice("999999.99")).toBe(true);
    expect(validPrice("1000000")).toBe(false); // max 8 digits, 2 decimals
    expect(validPrice("1.234")).toBe(false);
    expect(validPrice("-1")).toBe(false);
  });

  it("builds exactly the body the products API reads (no stock when editing)", () => {
    const values = {
      name: " Banana ", category: "1", price: "2.5", unit: " each ", stock: "30",
      emoji: " 🍌 ", description: " Sweet ", is_active: true,
    };
    const created = buildProductPayload(values, { creating: true });
    expect(Object.keys(created).sort()).toEqual([
      "category", "description", "emoji", "is_active", "name", "price", "stock", "unit",
    ]);
    expect(created).toMatchObject({
      name: "Banana", category: 1, price: "2.50", unit: "each", stock: 30, emoji: "🍌", description: "Sweet", is_active: true,
    });
    expect("stock" in buildProductPayload(values, { creating: false })).toBe(false);
    expect(validateProduct({ ...values, name: " ", price: "x", category: "" }, { creating: true })).toMatchObject({
      name: "Enter the product name.",
      category: "Choose a category.",
    });
    expect(validateProduct({ ...values, unit: "u".repeat(31) })).toHaveProperty("unit");
    expect(validateProduct({ ...values, name: "n".repeat(151) })).toHaveProperty("name");
  });

  it("calls exactly the documented admin endpoints", async () => {
    api.mockReset();
    api.mockResolvedValue(null);
    await getStats();
    await listAdminProducts();
    await createAdminProduct({ name: "Banana" });
    await updateStock(2, "25");
    await deleteAdminProduct(3);
    await listAdminOrders();
    await listAdminOrders("pending");
    await updateOrderStatus(12, "shipped");
    await listCustomers();
    await getCustomer(2);
    await setCustomerActive(2, false);
    expect(api.mock.calls).toEqual([
      ["/admin/stats/"],
      ["/admin/products/"],
      ["/admin/products/", { method: "POST", body: expect.any(FormData) }],
      [
        "/admin/products/2/",
        { method: "PATCH", body: expect.any(FormData) },
      ],
      ["/admin/products/3/", { method: "DELETE" }],
      ["/admin/orders/"],
      ["/admin/orders/?status=pending"],
      [
        "/admin/orders/12/",
        { method: "PATCH", body: expect.any(FormData) },
      ],
      ["/admin/customers/"],
      ["/admin/customers/2/"],
      [
        "/admin/customers/2/",
        { method: "PATCH", body: expect.any(FormData) },
      ],
    ]);
    expect(api.mock.calls[2][1].body.get("name")).toBe("Banana");
    expect(api.mock.calls[3][1].body.get("stock")).toBe("25");
    expect(api.mock.calls[7][1].body.get("status")).toBe("shipped");
    expect(api.mock.calls[10][1].body.get("is_active")).toBe("false");
  });
});

// ---------------------------------------------------------------- screens
describe("Sprint 4: admin screens", () => {
  it("uses the admin shell without the customer navigation or footer", () => {
    api.mockReset();
    api.mockResolvedValue([]);
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/products";

    render(<App />);

    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo payment only/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("only administrators can open the admin area", () => {
    api.mockReset();
    state.auth = { user: { full_name: "Sam Shopper", is_staff: false }, ready: true };
    render(<AdminLayout route="/admin/products" />);
    expect(screen.getByRole("heading", { name: "Administrators only" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("the dashboard shows the counts, the products to restock and the latest orders", async () => {
    api.mockReset();
    api.mockImplementation(async (path) => {
      if (path === "/admin/stats/")
        return { total_products: 3, total_orders: 1, total_customers: 2, low_stock: 2 };
      if (path === "/admin/products/") return [apple, milk, eggs];
      if (path === "/admin/orders/") return [order(12, "pending")];
      throw new Error(`unexpected request ${path}`);
    });
    state.auth = { user: { full_name: "Store Admin", is_staff: true }, ready: true };
    render(<AdminLayout route="/admin" />);
    expect(await screen.findByText("Latest orders")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^products.*in the catalog/i })).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^low or out of stock/i })).getByText("2")).toBeInTheDocument();
    const restock = screen.getByRole("region", { name: "Needs restocking" });
    expect(within(restock).getByText("Eggs")).toBeInTheDocument();
    expect(within(restock).getByText("Milk")).toBeInTheDocument();
    expect(within(restock).queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText(/Order #12 · Sam Shopper/)).toBeInTheDocument();
  });

  it("the product list shows stock badges and deletes only after confirming", async () => {
    api.mockReset();
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/products/" && !options.method) return [eggs, milk, apple];
      if (path === "/categories/") return categories;
      if (path === "/admin/products/3/" && options.method === "DELETE") return null;
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/products";
    render(<App />);
    await screen.findByText("Eggs", { selector: "b" });
    const eggsRow = rowOf("Eggs");
    expect(within(eggsRow).getByText("Out of stock")).toBeInTheDocument();
    expect(within(rowOf("Milk")).getByText("Low stock")).toBeInTheDocument();
    expect(within(rowOf("Apple")).getByText("In stock")).toBeInTheDocument();

    await user.click(within(eggsRow).getByRole("button", { name: "Delete" }));
    expect(api).not.toHaveBeenCalledWith("/admin/products/3/", expect.anything());
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/admin/products/3/", { method: "DELETE" }),
    );
    expect(await screen.findByText("Eggs was deleted.")).toBeInTheDocument();
    expect(screen.queryByText("Eggs", { selector: "b" })).not.toBeInTheDocument();

    await user.click(within(rowOf("Apple")).getByRole("link", { name: "Edit Apple" }));
    expect(await screen.findByRole("form", { name: "Edit product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^product name/i)).toHaveValue("Apple");
  });

  it("the add form blocks an incomplete product and then posts the right body", async () => {
    api.mockReset();
    const banana = { ...apple, id: 9, name: "Banana", price: "2.50", stock: 30, stock_status: "in_stock", emoji: "🍌" };
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/products/" && !options.method) return [apple];
      if (path === "/categories/") return categories;
      if (path === "/admin/products/" && options.method === "POST") return banana;
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/products";
    render(<App />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("link", { name: /add product/i }));
    const form = await screen.findByRole("form", { name: "Add a product" });

    await user.click(within(form).getByRole("button", { name: "Add product" }));
    expect(within(form).getByText("Enter the product name.")).toBeInTheDocument();
    expect(within(form).getByText("Choose a category.")).toBeInTheDocument();
    expect(within(form).getByText("Enter the price.")).toBeInTheDocument();
    expect(api.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);

    await user.type(within(form).getByLabelText(/^product name/i), "Banana");
    await user.selectOptions(within(form).getByLabelText(/^category/i), "1");
    await user.type(within(form).getByLabelText(/^price/i), "2.5");
    await user.clear(within(form).getByLabelText(/^stock quantity/i));
    await user.type(within(form).getByLabelText(/^stock quantity/i), "30");
    await user.type(within(form).getByLabelText(/^emoji/i), "🍌");
    await user.click(within(form).getByRole("button", { name: "Add product" }));

    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([path, options]) =>
            path === "/admin/products/" &&
            options?.method === "POST" &&
            options.body instanceof FormData &&
            options.body.get("name") === "Banana" &&
            options.body.get("stock") === "30",
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Banana was added.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add product" })).toBeInTheDocument();
  });

  it("returns to the product list after saving an edit and clears the saving state", async () => {
    api.mockReset();
    const updatedApple = { ...apple, name: "Green Apple" };
    let saved = false;
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/categories/") return categories;
      if (path === "/admin/products/" && !options.method)
        return saved ? [updatedApple] : [apple];
      if (path === "/admin/products/1/" && options.method === "PATCH") {
        saved = true;
        return updatedApple;
      }
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/products/1/edit";
    render(<App />);

    const form = await screen.findByRole("form", { name: "Edit product" });
    const name = within(form).getByLabelText(/^product name/i);
    await user.clear(name);
    await user.type(name, "Green Apple");
    await user.click(within(form).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Green Apple was updated.")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/admin/products");
    expect(screen.queryByRole("form", { name: "Edit product" })).not.toBeInTheDocument();
    expect(await screen.findByText("Green Apple", { selector: "b" })).toBeInTheDocument();
  });

  it("inventory warns about low and sold-out products and edits stock on its own page", async () => {
    api.mockReset();
    let updatedMilk = milk;
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/products/" && !options.method)
        return [apple, updatedMilk, eggs];
      if (path === "/admin/products/2/" && options.method === "PATCH")
        return (updatedMilk = {
          ...milk,
          stock: Number(options.body.get("stock")),
          stock_status: "in_stock",
        });
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/inventory";
    render(<App />);
    await screen.findByRole("table");
    const alerts = screen.getByRole("region", { name: "Stock alerts" });
    expect(alerts).toHaveTextContent(/1 product is out of stock:\s*Eggs/);
    expect(alerts).toHaveTextContent(/1 product is running low \(10 or fewer left\):\s*Milk/);

    await user.click(within(rowOf("Milk")).getByRole("link", { name: "Update stock" }));
    const box = await screen.findByLabelText("New stock quantity");
    await user.clear(box);
    await user.type(box, "-3");
    await user.click(screen.getByRole("button", { name: "Save stock" }));
    expect(await screen.findByText("Enter a whole number, 0 or more.")).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(2); // list and selected item load; invalid value was not sent

    await user.clear(box);
    await user.type(box, "25");
    await user.click(screen.getByRole("button", { name: "Save stock" }));
    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([path, options]) =>
            path === "/admin/products/2/" &&
            options.method === "PATCH" &&
            options.body instanceof FormData &&
            options.body.get("stock") === "25",
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Milk now has 25 in stock.")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/admin/inventory");
    expect(within(rowOf("Milk")).getByText("25", { selector: "b" })).toBeInTheDocument();
    expect(screen.queryByLabelText("New stock quantity")).not.toBeInTheDocument();
  });

  it("orders offer only the allowed next steps, filter by status and save a change", async () => {
    api.mockReset();
    api.mockImplementation(async (path, options = {}) => {
      if (path.startsWith("/admin/orders/") && !options.method)
        return [order(12, "pending"), order(11, "delivered")];
      if (path === "/admin/orders/12/" && options.method === "PATCH")
        return order(12, options.body.get("status"));
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    render(<OrdersAdminPage />);
    const pending = (await screen.findByText("Order #12")).closest("article");
    const delivered = screen.getByText("Order #11").closest("article");
    expect(within(pending).getByRole("button", { name: "Start processing" })).toBeInTheDocument();
    expect(within(pending).getByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    expect(within(pending).queryByRole("button", { name: "Mark as delivered" })).not.toBeInTheDocument();
    expect(within(delivered).getByText(/can no longer be changed/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pending" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("/admin/orders/?status=pending"));
    await waitFor(() => expect(screen.queryByText("Order #11")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delivered" }));
    await waitFor(() => expect(screen.getByText("Order #11")).toBeInTheDocument());
    expect(screen.queryByText("Order #12")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pending" }));
    await waitFor(() => expect(screen.getByText("Order #12")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Start processing" }));
    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([path, options]) =>
            path === "/admin/orders/12/" &&
            options.method === "PATCH" &&
            options.body instanceof FormData &&
            options.body.get("status") === "processing",
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Order #12 is now processing.")).toBeInTheDocument();
    expect(screen.queryByText("Order #12")).not.toBeInTheDocument(); // no longer 'pending'
  });

  it("customers can be blocked only after confirming, and unblocked again", async () => {
    api.mockReset();
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/customers/" && !options.method) return [sam, lina];
      if (path === "/admin/customers/2/" && options.method === "PATCH")
        return { ...sam, is_active: options.body.get("is_active") === "true" };
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    const user = userEvent.setup();
    render(<CustomersAdminPage />);
    await screen.findByText("Sam Shopper", { selector: "b" });
    const row = rowOf("Sam Shopper");
    expect(within(row).getByText("$7.00")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Block" }));
    expect(api).toHaveBeenCalledTimes(1); // asking first: nothing sent yet
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([path, options]) =>
            path === "/admin/customers/2/" &&
            options.method === "PATCH" &&
            options.body instanceof FormData &&
            options.body.get("is_active") === "false",
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Sam Shopper was blocked.")).toBeInTheDocument();
    const blocked = rowOf("Sam Shopper");
    expect(within(blocked).getByText("Blocked")).toBeInTheDocument();

    await user.click(within(blocked).getByRole("button", { name: "Unblock" }));
    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([path, options]) =>
            path === "/admin/customers/2/" &&
            options.method === "PATCH" &&
            options.body instanceof FormData &&
            options.body.get("is_active") === "true",
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Sam Shopper was unblocked.")).toBeInTheDocument();
  });

  it("customer details open as a separate admin page", async () => {
    api.mockReset();
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/customers/" && !options.method) return [sam, lina];
      if (path === "/admin/customers/2/") return sam;
      throw new Error(`unexpected request ${options.method || "GET"} ${path}`);
    });
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/customers";
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Sam Shopper", { selector: "b" });

    await user.click(within(rowOf("Sam Shopper")).getByRole("link", { name: "View Sam Shopper" }));
    expect(await screen.findByRole("region", { name: "Details for Sam Shopper" })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/admin/customers/2/");
  });

  it("order details open as a separate admin page", async () => {
    api.mockReset();
    api.mockImplementation(async (path) => {
      if (path === "/admin/orders/12/") return order(12, "pending");
      throw new Error(`unexpected request ${path}`);
    });
    state.auth = {
      user: { full_name: "Store Admin", is_staff: true },
      ready: true,
      logout: vi.fn(),
    };
    window.location.hash = "#/admin/orders/12";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Order #12" })).toBeInTheDocument();
    expect(screen.getByText("Delivery information")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to orders" })).toBeInTheDocument();
  });
});
