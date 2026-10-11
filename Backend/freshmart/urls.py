from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({"status": "ok", "service": "FreshMart API"})


urlpatterns = [
    path("", health),
    path("django-admin/", admin.site.urls),
    path("api/", include("store.urls")),
]

# In development, let Django serve uploaded images from /media/.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)