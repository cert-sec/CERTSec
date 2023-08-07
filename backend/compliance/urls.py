from django.urls import path
from . import views

urlpatterns = [
    path("ping/", views.ping_ip),
    path("check-https/", views.check_https_connection),
    path("scan-ports/", views.nmap_top_ports_scan),
    path("scan-vulners/ips", views.nmap_vulners_scan),
    path("scan-vulners/technologies", views.technology_vulners_scan),
    path("companies/", views.companies),
    path("certificates/", views.get_certificates),
    path("categories/", views.get_categories),
    path("requirements/", views.get_requirements),
    path("assessment-requirements/", views.get_assessment_requirements),
    path("assessments/", views.assessments),
    path("assessments/<int:id>", views.get_assessment),
    path("assessments/<int:id>/report/", views.generate_report),
    path("tasks/", views.get_background_process_status),
]
