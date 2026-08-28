from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.views.static import serve
import os

def root_api_index(request):
    return JsonResponse({
        "status": "online",
        "system": "Kallikalam Tournament Management & Multi-Cam VAR",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth/",
            "tournaments": "/api/tournaments/",
            "audit": "/api/audit/"
        }
    })

recordings_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '../recordings'))

urlpatterns = [
    path('', root_api_index, name='root_api_index'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/tournaments/', include('tournaments.urls')),
    path('api/audit/', include('audit.urls')),
    re_path(r'^recordings/(?P<path>.*)$', serve, {'document_root': recordings_dir}),
]
