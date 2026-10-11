from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create (or update) an admin account that signs in with an email address."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument("password")
        parser.add_argument("--name", default="Store Admin")

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"].lower()
        user, created = User.objects.get_or_create(
            username=email, defaults={"email": email, "first_name": options["name"]}
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(options["password"])
        user.save()
        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} admin account: {email}"))
