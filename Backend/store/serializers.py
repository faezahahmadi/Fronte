from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import (
    validate_password as run_password_validators,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from rest_framework import serializers

from .models import Cart, CartItem, Category, Order, OrderItem, Product

User = get_user_model()

# Single source of truth for low-stock notifications.
LOW_STOCK_LIMIT = 10


# ---------- Product image URL helper ----------

def get_public_product_image_url(product):
    if not product.image:
        return product.image_url or ""

    # Get JUST the filename (e.g., "apple.jpg")
    filename = product.image.name.split("/")[-1]

    project_id = getattr(settings, "SUPABASE_PROJECT_ID", "")
    bucket = getattr(settings, "SUPABASE_BUCKET", "media")

    if project_id and bucket:
        return (
            f"https://{project_id}.supabase.co/"
            f"storage/v1/object/public/{bucket}/products/{filename}"
        )

    return product.image.url


# ---------- Authentication ----------

class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=3, max_length=50)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    COMMON_TYPOS = {
        "gmal.com": "gmail.com",
        "gmial.com": "gmail.com",
        "gmai.com": "gmail.com",
        "gamil.com": "gmail.com",
        "gnail.com": "gmail.com",
        "yahho.com": "yahoo.com",
        "yaho.com": "yahoo.com",
        "hotmial.com": "hotmail.com",
        "hotmai.com": "hotmail.com",
        "outlok.com": "outlook.com",
        "outloo.com": "outlook.com",
    }

    def validate_email(self, value):
        value = value.lower()

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        domain = value.rsplit("@", 1)[-1]

        if domain in self.COMMON_TYPOS:
            suggestion = value.replace(
                f"@{domain}",
                f"@{self.COMMON_TYPOS[domain]}",
            )
            raise serializers.ValidationError(
                f"Did you mean {suggestion}? Please check your email."
            )

        return value

    def validate_password(self, value):
        try:
            run_password_validators(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))

        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["full_name"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "is_staff"]

    def get_full_name(self, obj):
        return obj.first_name or obj.email


# ---------- Catalog ----------

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    image_url = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "unit",
            "stock",
            "stock_status",
            "emoji",
            "image",        # ✅ THIS LINE FIXES THE UPLOAD
            "image_url",
            "is_active",
            "sold_count",
            "category",
            "category_name",
            "category_slug",
        ]
        read_only_fields = ["sold_count"]

    def get_image_url(self, obj):
        return get_public_product_image_url(obj)

    def get_stock_status(self, obj):
        if obj.stock == 0:
            return "out_of_stock"
        if obj.stock <= LOW_STOCK_LIMIT:
            return "low_stock"
        return "in_stock"


# ---------- Orders ----------

class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "unit_price", "quantity", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_email",
            "full_name",
            "email",
            "phone",
            "address",
            "city",
            "notes",
            "payment_method",
            "delivery_option",
            "status",
            "subtotal",
            "delivery_fee",
            "total",
            "created_at",
            "items",
        ]


# Sprint 4: Strict order-status transitions.

class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)

    ALLOWED_TRANSITIONS = {
        Order.Status.PENDING: {Order.Status.PROCESSING, Order.Status.CANCELLED},
        Order.Status.PROCESSING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
        Order.Status.SHIPPED: {Order.Status.DELIVERED},
        Order.Status.DELIVERED: set(),
        Order.Status.CANCELLED: set(),
    }

    def validate_status(self, value):
        if self.instance is None:
            return value

        current = self.instance.status
        if current == value:
            return value

        allowed = self.ALLOWED_TRANSITIONS.get(current, set())
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot change order from '{current}' to '{value}'."
            )

        return value


class CartLineSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(min_length=6, max_length=30)
    address = serializers.CharField(min_length=5, max_length=255)
    city = serializers.CharField(min_length=2, max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.Payment.choices)
    delivery_option = serializers.ChoiceField(choices=Order.Delivery.choices)
    items = CartLineSerializer(many=True, allow_empty=False)

    def validate_phone(self, value):
        cleaned = value.strip().replace(" ", "").replace("-", "")
        if not cleaned.isdigit() or len(cleaned) < 6:
            raise serializers.ValidationError(
                "Enter a valid phone number (digits only, at least 6)."
            )
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        user = self.context["request"].user

        # Merge duplicate product lines.
        wanted = {}
        for line in items_data:
            product_id = line["product"]
            wanted[product_id] = wanted.get(product_id, 0) + line["quantity"]

        # Prevent the same user from submitting identical items again within 30 seconds.
        recent = Order.objects.filter(user=user).order_by("-created_at").first()
        if recent and timezone.now() - recent.created_at < timedelta(seconds=30):
            recent_items = set(
                (item.product_id, item.quantity) for item in recent.items.all()
            )
            if recent_items == set(wanted.items()):
                raise serializers.ValidationError(
                    {"detail": "This order was already submitted. Please wait."}
                )

        delivery_fee = Decimal(settings.DELIVERY_FEE)
        if validated_data["delivery_option"] == Order.Delivery.EXPRESS:
            delivery_fee += Decimal("3.00")

        with transaction.atomic():
            products = {
                product.id: product
                for product in Product.objects.select_for_update()
                .filter(id__in=list(wanted), is_active=True)
                .order_by("id")
            }

            problems = []
            for product_id, quantity in wanted.items():
                product = products.get(product_id)
                if product is None:
                    problems.append("A product in your cart is no longer available.")
                elif product.stock == 0:
                    problems.append(f"{product.name} is out of stock.")
                elif product.stock < quantity:
                    problems.append(f"Only {product.stock} of {product.name} left in stock.")

            if problems:
                raise serializers.ValidationError({"items": problems})

            order = Order.objects.create(
                user=user,
                subtotal=Decimal("0.00"),
                delivery_fee=delivery_fee,
                total=delivery_fee,
                **validated_data,
            )

            subtotal = Decimal("0.00")
            for product_id, quantity in wanted.items():
                product = products[product_id]
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    unit_price=product.price,
                    quantity=quantity,
                )
                product.stock -= quantity
                product.sold_count += quantity
                product.save(update_fields=["stock", "sold_count"])
                subtotal += product.price * quantity

            order.subtotal = subtotal
            order.total = subtotal + delivery_fee
            order.save(update_fields=["subtotal", "total"])

            # Clear the cart only after a successful order.
            CartItem.objects.filter(cart__user=user).delete()

        return order


# ---------- Cart (Sprint 2) ----------

class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    name = serializers.CharField(source="product.name", read_only=True)
    price = serializers.DecimalField(
        source="product.price", max_digits=8, decimal_places=2, read_only=True
    )
    unit = serializers.CharField(source="product.unit", read_only=True)
    emoji = serializers.CharField(source="product.emoji", read_only=True)
    image_url = serializers.SerializerMethodField()
    stock = serializers.IntegerField(source="product.stock", read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    def get_image_url(self, obj):
        return get_public_product_image_url(obj.product)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "name",
            "price",
            "unit",
            "emoji",
            "image_url",
            "stock",
            "quantity",
            "subtotal",
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_items", "total_price"]

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_total_price(self, obj):
        return sum((item.subtotal for item in obj.items.all()), Decimal("0.00"))


class AddToCartSerializer(serializers.Serializer):
    """Validates the payload for US-09 (add product to cart)."""

    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)

    def validate_product_id(self, value):
        if not Product.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError("Product not found or unavailable.")
        return value


class UpdateCartItemSerializer(serializers.Serializer):
    """Validates the payload for US-11 (change quantity)."""

    quantity = serializers.IntegerField(min_value=1, max_value=99)


# ---------- Admin customer management (Sprint 4, US-29) ----------

class AdminCustomerSerializer(serializers.ModelSerializer):
    """Read-only customer details for the admin panel."""

    full_name = serializers.SerializerMethodField()
    order_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "is_active",
            "date_joined",
            "order_count",
            "total_spent",
        ]

    def get_full_name(self, obj):
        return obj.first_name or obj.email

    def get_order_count(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        total = obj.orders.aggregate(total=Sum("total"))["total"]
        return total if total is not None else Decimal("0.00")


class AdminCustomerUpdateSerializer(serializers.ModelSerializer):
    """Allows an admin to block or unblock a customer account."""

    class Meta:
        model = User
        fields = ["is_active"]

    def validate_is_active(self, value):
        # Do not let this endpoint deactivate another staff account.
        if self.instance and self.instance.is_staff and value is False:
            raise serializers.ValidationError(
                "Admin accounts cannot be blocked from here."
            )
        return value