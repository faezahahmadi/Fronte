from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("admin/products", views.AdminProductViewSet, basename="admin-product")
router.register("admin/orders", views.AdminOrderViewSet, basename="admin-order")
# ✅ SPRINT 4 ADDED — US-29: Customer Account Management
router.register("admin/customers", views.AdminCustomerViewSet, basename="admin-customer")

# Cart action mappings (Sprint 2)
cart_list = views.CartViewSet.as_view({"get": "list"})
cart_add = views.CartViewSet.as_view({"post": "add_item"})
cart_update = views.CartViewSet.as_view({"patch": "update_item"})
cart_remove = views.CartViewSet.as_view({"delete": "remove_item"})
cart_clear = views.CartViewSet.as_view({"delete": "clear"})

urlpatterns = [
    path("health/", views.HealthView.as_view()),
    # auth
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    # public catalog
    path("categories/", views.CategoryListView.as_view()),
    path("products/", views.ProductListView.as_view()),
    path("products/<int:pk>/", views.ProductDetailView.as_view()),
    # customer orders
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<int:pk>/", views.OrderDetailView.as_view()),
    # cart (Sprint 2)
    path("cart/", cart_list, name="cart-list"),
    path("cart/add/", cart_add, name="cart-add"),
    path("cart/items/<int:pk>/", cart_update, name="cart-item-update"),
    path("cart/items/<int:pk>/remove/", cart_remove, name="cart-item-remove"),
    path("cart/clear/", cart_clear, name="cart-clear"),
    # admin
    path("admin/stats/", views.AdminStatsView.as_view()),
] + router.urls