from django.db import models
from django.db.models import SET_NULL


class Company(models.Model):
    name = models.CharField(max_length=250, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Certificate(models.Model):
    name = models.CharField(max_length=250)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    next_certificate = models.ForeignKey('self', on_delete=SET_NULL, null=True, blank=True)


class Category(models.Model):
    name = models.CharField(max_length=250)
    description = models.TextField()
    certificate = models.ForeignKey(Certificate, related_name="categories", on_delete=models.CASCADE)


class Assessment(models.Model):
    # Allows to get assessments for a company, e.g., company.assessments.all()
    company = models.ForeignKey(Company, related_name="assessments", on_delete=models.CASCADE)
    certificate = models.ForeignKey(Certificate, related_name="assessments", on_delete=models.CASCADE)
    passed = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateTimeField(null=True, blank=True)


'''
Unique type for each automated requirement
'''
class AutomatedRequirementType(models.TextChoices):
    HTTPS_PROTOCOL_CHECKER = "https_protocol_checker", "HTTPS Protocol Checker"
    UNAUTHORIZED_ACCESS_CHECKER = "unauthorized_access_checker", "Unauthorized Access Checker"
    VULNERABILITY_CHECKER = "vulnerability_checker", "Vulnerabilitiy Checker"


class Requirement(models.Model):
    description = models.TextField()
    category = models.ForeignKey(Category, related_name="requirements", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_automated_requirement = models.BooleanField(default=False)
    automated_requirement_type = models.CharField(max_length=250, choices=AutomatedRequirementType.choices, null=True,
                                                  blank=True)


class AssessmentRequirement(models.Model):
    assessment = models.ForeignKey(Assessment, related_name="assessment_requirements", on_delete=models.CASCADE)
    requirement = models.ForeignKey(Requirement, related_name="assessment_requirements", on_delete=models.CASCADE)
    fulfilled = models.BooleanField(default=False)
