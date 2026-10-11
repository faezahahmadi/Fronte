"""
Seed Fresh Mart categories and products, attaching images from
store/seed_images/ into MEDIA_ROOT/products/.

Usage:
    python manage.py seed_data              # add missing rows, attach images
    python manage.py seed_data --wipe       # delete all first, then seed
"""

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from store.models import Category, Product


# (name, category, emoji, price, unit, stock, description, image_filename)
CATALOG = [
    # ---------- Fruits & Vegetables ----------
    ("Apple", "Fruits & Vegetables", "🍎", "1.50", "per lb", 50,
     "Fresh and juicy apples, rich in nutrients and perfect for a healthy lifestyle.",
     "apple.jpg"),
    ("Banana", "Fruits & Vegetables", "🍌", "1.20", "per lb", 60,
     "Sweet, ripe bananas. A quick snack that keeps you going.",
     "banana.jpg"),
    ("Orange", "Fruits & Vegetables", "🍊", "1.80", "per lb", 45,
     "Bright, juicy oranges packed with vitamin C.",
     "orange.jpg"),
    ("Strawberries", "Fruits & Vegetables", "🍓", "3.50", "1 pint", 30,
     "Sweet red strawberries, great for breakfast or dessert.",
     "strawberries.jpg"),
    ("Grapes", "Fruits & Vegetables", "🍇", "3.20", "per lb", 28,
     "Seedless grapes, crisp and sweet.",
     "grapes.jpg"),
    # ----- OUT OF STOCK -----
    ("Watermelon", "Fruits & Vegetables", "🍉", "4.50", "each", 0,
     "A big, refreshing watermelon for hot days.",
     "watermelon.jpg"),
    ("Tomato", "Fruits & Vegetables", "🍅", "2.10", "per lb", 40,
     "Vine-ripened tomatoes for salads, sauces and sandwiches.",
     "tomato.jpg"),
    ("Carrot", "Fruits & Vegetables", "🥕", "1.30", "per lb", 55,
     "Crunchy carrots, good raw or cooked.",
     "carrot.jpg"),
    ("Potato", "Fruits & Vegetables", "🥔", "0.99", "per lb", 80,
     "All-purpose potatoes for boiling, baking and frying.",
     "potato.jpg"),
    ("Broccoli", "Fruits & Vegetables", "🥦", "2.40", "per head", 25,
     "Fresh green broccoli, steam it or stir-fry it.",
     "broccoli.jpg"),
    ("Cucumber", "Fruits & Vegetables", "🥒", "0.90", "each", 35,
     "Cool, crisp cucumbers.",
     "cucumber.jpg"),
    ("Onion", "Fruits & Vegetables", "🧅", "1.10", "per lb", 70,
     "Yellow onions, the base of almost every dish.",
     "onion.jpg"),

    # ---------- Dairy & Eggs ----------
    ("Milk", "Dairy & Eggs", "🥛", "2.00", "1 L", 40,
     "Fresh whole milk.",
     "milk.jpg"),
    ("Eggs", "Dairy & Eggs", "🥚", "2.50", "dozen", 36,
     "Farm eggs, a dozen per carton.",
     "eggs.jpg"),
    ("Cheddar Cheese", "Dairy & Eggs", "🧀", "4.20", "200 g", 22,
     "Mature cheddar with a sharp, rich flavour.",
     "cheddar-cheese.jpg"),
    ("Butter", "Dairy & Eggs", "🧈", "3.60", "250 g", 30,
     "Creamy salted butter.",
     "butter.jpg"),
    ("Plain Yogurt", "Dairy & Eggs", "🥣", "1.90", "500 g", 26,
     "Thick, plain yogurt with live cultures.",
     "plain-yogurt.jpg"),

    # ---------- Bakery ----------
    ("Bread", "Bakery", "🍞", "2.00", "loaf", 20,
     "Soft sandwich loaf, baked fresh every morning.",
     "bread.jpg"),
    ("Croissant", "Bakery", "🥐", "1.40", "each", 24,
     "Buttery, flaky croissant.",
     "croissant.jpg"),
    # ----- OUT OF STOCK -----
    ("Bagels", "Bakery", "🥯", "3.00", "pack of 4", 0,
     "Chewy bagels, perfect toasted.",
     "bagels.jpg"),

    # ---------- Snacks ----------
    ("Potato Chips", "Snacks", "🥔", "2.20", "150 g", 45,
     "Lightly salted, extra crunchy.",
     "potato-chips.jpg"),
    ("Chocolate Bar", "Snacks", "🍫", "1.60", "100 g", 60,
     "Smooth milk chocolate.",
     "chocolate-bar.jpg"),
    ("Cookies", "Snacks", "🍪", "2.80", "pack", 38,
     "Chocolate chip cookies, soft in the middle.",
     "cookies.jpg"),
    ("Popcorn", "Snacks", "🍿", "1.75", "100 g", 33,
     "Ready-to-eat buttery popcorn.",
     "popcorn.jpg"),
    # ----- OUT OF STOCK -----
    ("Mixed Nuts", "Snacks", "🥜", "5.50", "250 g", 0,
     "Roasted almonds, cashews and peanuts.",
     "mixed-nuts.jpg"),

    # ---------- Beverages ----------
    ("Orange Juice", "Beverages", "🧃", "3.30", "1 L", 32,
     "100% squeezed orange juice, no added sugar.",
     "orange-juice.jpg"),
    ("Bottled Water", "Beverages", "💧", "0.80", "1.5 L", 120,
     "Natural spring water.",
     "bottled-water.jpg"),
    ("Green Tea", "Beverages", "🍵", "3.90", "20 bags", 27,
     "Light and refreshing green tea bags.",
     "green-tea.jpg"),
    # ----- OUT OF STOCK -----
    ("Ground Coffee", "Beverages", "☕", "6.50", "250 g", 0,
     "Medium roast ground coffee.",
     "ground-coffee.jpg"),
    ("Cola", "Beverages", "🥤", "1.50", "500 ml", 70,
     "Chilled cola.",
     "cola.jpg"),

    # ---------- Household ----------
    ("Dish Soap", "Household", "🧴", "2.60", "500 ml", 30,
     "Cuts through grease, gentle on hands.",
     "dish-soap.jpg"),
    ("Paper Towels", "Household", "🧻", "4.80", "2 rolls", 25,
     "Strong, absorbent paper towels.",
     "paper-towels.jpg"),
    # ----- OUT OF STOCK -----
    ("Laundry Detergent", "Household", "🫧", "8.90", "2 L", 0,
     "Fresh scent, works in cold water.",
     "laundry-detergent.jpg"),

    # ---------- Personal Care ----------
    ("Toothpaste", "Personal Care", "🪥", "2.40", "100 ml", 40,
     "Fluoride toothpaste for daily use.",
     "toothpaste.jpg"),
    ("Shampoo", "Personal Care", "🧼", "4.50", "400 ml", 28,
     "Gentle shampoo for all hair types.",
     "shampoo.jpg"),
    ("Hand Soap", "Personal Care", "🧼", "1.90", "250 ml", 35,
     "Moisturising liquid hand soap.",
     "hand-soap.jpg"),
]


class Command(BaseCommand):
    help = "Seed categories and products, attaching images from store/seed_images/."

    def add_arguments(self, parser):
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="Delete all products and categories first.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["wipe"]:
            self.stdout.write("Wiping existing products and categories...")
            Product.objects.all().delete()
            Category.objects.all().delete()

        seed_dir = Path(__file__).resolve().parents[2] / "seed_images"

        created_categories = 0
        created_products = 0
        updated_products = 0
        images_attached = 0
        missing_images = []

        for name, category_name, emoji, price, unit, stock, description, image_file in CATALOG:
            category, cat_created = Category.objects.get_or_create(name=category_name)
            created_categories += int(cat_created)

            product, prod_created = Product.objects.update_or_create(
                name=name,
                defaults={
                    "category": category,
                    "emoji": emoji,
                    "price": price,
                    "unit": unit,
                    "stock": stock,
                    "description": description,
                },
            )
            created_products += int(prod_created)
            updated_products += int(not prod_created)

            if image_file and not product.image:
                src = seed_dir / image_file
                if src.exists():
                    with open(src, "rb") as fh:
                        product.image.save(image_file, File(fh), save=True)
                    images_attached += 1
                else:
                    missing_images.append(image_file)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone.\n"
                f"  Categories created: {created_categories}\n"
                f"  Products created:   {created_products}\n"
                f"  Products updated:   {updated_products}\n"
                f"  Images attached:    {images_attached}\n"
                f"  Total products:     {Product.objects.count()}"
            )
        )
        if missing_images:
            self.stdout.write(
                self.style.WARNING(
                    f"\n  Missing image files (falling back to emoji):\n"
                    + "\n".join(f"    - {f}" for f in missing_images)
                )
            )