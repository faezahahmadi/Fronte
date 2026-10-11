from django.contrib.auth import authenticate, get_user_model
from django.db import connection, transaction
from django.db.models import F, Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cart, CartItem, Category, Order, Product

from .models import Category, Order, Product
from .serializers import (
    AddToCartSerializer,
    CartItemSerializer,
    CartSerializer,
    CategorySerializer,
    LoginSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer,
    ProductSerializer,
    RegisterSerializer,
    UpdateCartItemSerializer,
    UserSerializer,
)

User = get_user_model()

LOW_STOCK_LIMIT = 10


# ---------- Health ----------
class HealthView(APIView):
    """Tells the frontend (or you) whether the API and its database are up."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
        except Exception:
            return Response(
                {"status": "error", "database": "unreachable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "database": "ok"})


# ---------- Auth ----------
def auth_response(user, http_status=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data}, status=http_status)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return auth_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"].lower(),
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Incorrect email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return auth_response(user)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ---------- Public catalog ----------
class CategoryListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class ProductListView(ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    SORTS = {
        "popular": ("-sold_count", "name"),
        "price_asc": ("price", "name"),
        "price_desc": ("-price", "name"),
        "name": ("name",),
    }

    def get_queryset(self):
        params = self.request.query_params
        queryset = Product.objects.filter(is_active=True).select_related("category")

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        category = params.get("category", "").strip()
        if category:
            queryset = queryset.filter(category__slug=category)

        ordering = self.SORTS.get(params.get("sort", "popular"), self.SORTS["popular"])
        return queryset.order_by(*ordering)


class ProductDetailView(RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category")
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


# ---------- Customer orders ----------
class OrderListCreateView(ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("items")
        )

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


# ---------- Admin ----------
class AdminProductViewSet(viewsets.ModelViewSet):
    """List, create, edit (including stock) and delete products."""

    queryset = Product.objects.select_related("category").order_by("-created_at")
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None


class AdminOrderViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """View all customer orders and change their status."""

    queryset = Order.objects.select_related("user").prefetch_related("items")
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = OrderStatusSerializer(order, data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        with transaction.atomic():
            was_cancelled = order.status == Order.Status.CANCELLED
            order.status = new_status
            order.save(update_fields=["status"])

            # Put the items back on the shelf when an order is cancelled.
            if new_status == Order.Status.CANCELLED and not was_cancelled:
                for item in order.items.all():
                    if item.product_id:
                        Product.objects.filter(pk=item.product_id).update(
                            stock=F("stock") + item.quantity,
                            sold_count=F("sold_count") - item.quantity,
                        )

        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order).data)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response(
            {
                "total_products": Product.objects.count(),
                "total_orders": Order.objects.count(),
                "total_customers": User.objects.filter(is_staff=False).count(),
                "low_stock": Product.objects.filter(
                    is_active=True, stock__lte=LOW_STOCK_LIMIT
                ).count(),
            }
        )

# ---------- Cart (Sprint 2) ----------
def get_or_create_cart(user):
    """Every customer has exactly one cart; create it lazily on first use."""
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartViewSet(viewsets.GenericViewSet):
    """
    US-10: View shopping cart
    US-11: Change quantity
    US-12: Remove product
    US-13: Clear cart
    US-14: View cart total (returned inside the cart payload)
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "add_item":
            return AddToCartSerializer
        if self.action == "update_item":
            return UpdateCartItemSerializer
        return CartSerializer

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).prefetch_related(
            "items__product"
        )

    def _cart_response(self):
        cart = get_or_create_cart(self.request.user)
        cart = self.get_queryset().get(pk=cart.pk)
        return Response(CartSerializer(cart).data)

    # US-10 + US-14 — GET /api/cart/
    def list(self, request):
        return self._cart_response()

    # US-09 — POST /api/cart/add/
    def add_item(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product_id"]
        quantity = serializer.validated_data["quantity"]

        cart = get_or_create_cart(request.user)

        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=product_id)
            item, created = CartItem.objects.get_or_create(
                cart=cart, product=product, defaults={"quantity": 0}
            )
            new_quantity = item.quantity + quantity

            if new_quantity > product.stock:
                return Response(
                    {
                        "detail": f"Only {product.stock} of {product.name} left in stock."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.quantity = new_quantity
            item.save(update_fields=["quantity"])

        return self._cart_response()

    # US-11 — PATCH /api/cart/items/<id>/
    def update_item(self, request, pk=None):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]

        try:
            item = CartItem.objects.select_related("product").get(
                pk=pk, cart__user=request.user
            )
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Item not found in your cart."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quantity > item.product.stock:
            return Response(
                {
                    "detail": f"Only {item.product.stock} of {item.product.name} left in stock."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return self._cart_response()

    # US-12 — DELETE /api/cart/items/<id>/remove/
    def remove_item(self, request, pk=None):
        try:
            item = CartItem.objects.get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Item not found in your cart."},
                status=status.HTTP_404_NOT_FOUND,
            )
        item.delete()
        return self._cart_response()

    # US-13 — DELETE /api/cart/clear/
    def clear(self, request):
        CartItem.objects.filter(cart__user=request.user).delete()
        return self._cart_response()