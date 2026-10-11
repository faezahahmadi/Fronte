from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Order, Product

User = get_user_model()

ORDER_FORM = {
    "full_name": "Sam Shopper",
    "email": "shopper@example.com",
    "phone": "0700000000",
    "address": "12 Garden Street",
    "city": "Kabul",
    "payment_method": "cash",
}


class FreshMartApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.fruit = Category.objects.create(name="Fruits & Vegetables")
        cls.dairy = Category.objects.create(name="Dairy & Eggs")
        cls.apple = Product.objects.create(
            category=cls.fruit, name="Apple", price="1.50", unit="per lb", stock=10, emoji="🍎"
        )
        cls.milk = Product.objects.create(
            category=cls.dairy, name="Milk", price="2.00", unit="1 L", stock=5
        )
        cls.hidden = Product.objects.create(
            category=cls.dairy, name="Hidden", price="1.00", stock=3, is_active=False
        )
        cls.customer = User.objects.create_user(
            "shopper@example.com", "shopper@example.com", "pass12345", first_name="Sam"
        )
        cls.other = User.objects.create_user(
            "other@example.com", "other@example.com", "pass12345"
        )
        cls.admin = User.objects.create_user(
            "admin@example.com",
            "admin@example.com",
            "pass12345",
            is_staff=True,
            is_superuser=True,
        )

    def place_order(self, items):
        return self.client.post("/api/orders/", {**ORDER_FORM, "items": items}, format="json")

    # ---------- health ----------
    def test_health(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["database"], "ok")

    # ---------- auth ----------
    def test_register_then_login(self):
        response = self.client.post(
            "/api/auth/register/",
            {"full_name": "Zed", "email": "Zed@Example.com", "password": "a-Strong-pass-77"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "zed@example.com")
        self.assertFalse(response.data["user"]["is_staff"])

        response = self.client.post(
            "/api/auth/login/",
            {"email": "ZED@example.com", "password": "a-Strong-pass-77"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_register_rejects_duplicate_email_and_weak_password(self):
        response = self.client.post(
            "/api/auth/register/",
            {"full_name": "Sam", "email": "shopper@example.com", "password": "a-Strong-pass-77"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            "/api/auth/register/",
            {"full_name": "New", "email": "new@example.com", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_wrong_password(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "shopper@example.com", "password": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "Sam")

    # ---------- catalog ----------
    def test_product_list_hides_inactive_products(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        names = {item["name"] for item in response.data}
        self.assertEqual(names, {"Apple", "Milk"})
        self.assertEqual(self.client.get(f"/api/products/{self.hidden.id}/").status_code, 404)

    def test_search_filter_and_sort(self):
        response = self.client.get("/api/products/?search=app")
        self.assertEqual([item["name"] for item in response.data], ["Apple"])

        response = self.client.get("/api/products/?category=dairy-eggs")
        self.assertEqual([item["name"] for item in response.data], ["Milk"])

        response = self.client.get("/api/products/?sort=price_desc")
        self.assertEqual([item["name"] for item in response.data], ["Milk", "Apple"])

        response = self.client.get("/api/products/?sort=price_asc")
        self.assertEqual([item["name"] for item in response.data], ["Apple", "Milk"])

    def test_categories(self):
        response = self.client.get("/api/categories/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual({item["slug"] for item in response.data}, {"fruits-vegetables", "dairy-eggs"})

    # ---------- orders ----------
    def test_order_requires_login(self):
        response = self.place_order([{"product": self.apple.id, "quantity": 1}])
        self.assertEqual(response.status_code, 401)

    def test_placing_an_order_reduces_stock_and_totals_correctly(self):
        self.client.force_authenticate(self.customer)
        response = self.place_order(
            [
                {"product": self.apple.id, "quantity": 3},
                {"product": self.milk.id, "quantity": 1},
            ]
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["subtotal"]), Decimal("6.50"))
        self.assertEqual(Decimal(response.data["delivery_fee"]), Decimal("2.00"))
        self.assertEqual(Decimal(response.data["total"]), Decimal("8.50"))
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(len(response.data["items"]), 2)

        self.apple.refresh_from_db()
        self.milk.refresh_from_db()
        self.assertEqual(self.apple.stock, 7)
        self.assertEqual(self.apple.sold_count, 3)
        self.assertEqual(self.milk.stock, 4)

    def test_order_cannot_exceed_stock(self):
        self.client.force_authenticate(self.customer)
        response = self.place_order([{"product": self.milk.id, "quantity": 6}])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.milk.refresh_from_db()
        self.assertEqual(self.milk.stock, 5)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_rejects_hidden_and_unknown_products(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(
            self.place_order([{"product": self.hidden.id, "quantity": 1}]).status_code, 400
        )
        self.assertEqual(self.place_order([{"product": 999999, "quantity": 1}]).status_code, 400)
        self.assertEqual(self.place_order([]).status_code, 400)

    def test_customers_only_see_their_own_orders(self):
        self.client.force_authenticate(self.customer)
        order_id = self.place_order([{"product": self.apple.id, "quantity": 1}]).data["id"]

        response = self.client.get("/api/orders/")
        self.assertEqual([order["id"] for order in response.data], [order_id])

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/orders/").data, [])
        self.assertEqual(self.client.get(f"/api/orders/{order_id}/").status_code, 404)

    # ---------- admin ----------
    def test_admin_endpoints_are_protected(self):
        self.assertEqual(self.client.get("/api/admin/products/").status_code, 401)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/admin/products/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/orders/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/stats/").status_code, 403)

    def test_admin_can_add_edit_update_stock_and_delete_products(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/products/",
            {
                "name": "Pear",
                "category": self.fruit.id,
                "price": "2.25",
                "unit": "per lb",
                "stock": 12,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pear_id = response.data["id"]

        response = self.client.patch(f"/api/admin/products/{pear_id}/", {"stock": 40}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["stock"], 40)

        response = self.client.patch(f"/api/admin/products/{pear_id}/", {"price": "2.50"}, format="json")
        self.assertEqual(Decimal(response.data["price"]), Decimal("2.50"))

        # Admins also see products that are hidden from the shop.
        response = self.client.get("/api/admin/products/")
        self.assertIn("Hidden", {item["name"] for item in response.data})

        self.assertEqual(self.client.delete(f"/api/admin/products/{pear_id}/").status_code, 204)
        self.assertFalse(Product.objects.filter(pk=pear_id).exists())

    def test_deleting_a_product_keeps_past_orders(self):
        self.client.force_authenticate(self.customer)
        order_id = self.place_order([{"product": self.apple.id, "quantity": 2}]).data["id"]

        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/admin/products/{self.apple.id}/").status_code, 204)

        response = self.client.get(f"/api/admin/orders/{order_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["items"][0]["product_name"], "Apple")
        self.assertIsNone(response.data["items"][0]["product"])

    def test_admin_changes_order_status_and_cancelling_restores_stock(self):
        self.client.force_authenticate(self.customer)
        order_id = self.place_order([{"product": self.apple.id, "quantity": 4}]).data["id"]
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 6)

        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/admin/orders/{order_id}/", {"status": "shipped"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "shipped")

        response = self.client.patch(f"/api/admin/orders/{order_id}/", {"status": "cancelled"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 10)
        self.assertEqual(self.apple.sold_count, 0)

        # A cancelled order is final.
        response = self.client.patch(f"/api/admin/orders/{order_id}/", {"status": "pending"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 10)

    def test_admin_stats(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_products"], 3)
        self.assertEqual(response.data["total_customers"], 2)
        self.assertEqual(response.data["total_orders"], 0)
