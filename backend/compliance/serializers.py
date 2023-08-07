from rest_framework import serializers
from .models import Company, Certificate, Category, Assessment, Requirement, AssessmentRequirement


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["name"]


class CertificateSerializer(serializers.ModelSerializer):
    next_certificate = serializers.SerializerMethodField()
    class Meta:
        model = Certificate
        fields = ["id", "name", "description", "next_certificate"]

    def get_next_certificate(self, obj):
        return CertificateSerializer(obj.next_certificate).data


'''
Is needed to avoid referencing the "CategorySerialzer" inside 
RequirementsSerializer, which would lead to an infinite loop.
'''
class SimpleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = ["id", "description", "category", "is_automated_requirement", "automated_requirement_type"]

    category = serializers.SerializerMethodField()

    def get_category(self, obj):
        return SimpleCategorySerializer(obj.category).data


class CategorySerializer(serializers.ModelSerializer):
    # requirements = RequirementSerializer(many=True, read_only=True, source="requirements.all")

    class Meta:
        model = Category
        fields = ["id", "name", "description", "requirements"]

    # TODO: try if it works and replace serializer defined at the beginning
    requirements = serializers.SerializerMethodField()
    def get_requirements(self, obj):
        return RequirementSerializer(obj.requirements.all(), many=True).data


class AssessmentRequirementSerializer(serializers.ModelSerializer):
    requirement = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentRequirement
        fields = '__all__'

    def get_requirement(self, obj):
        return RequirementSerializer(obj.requirement).data


class AssessmentSerializer(serializers.ModelSerializer):
    assessment_requirements = serializers.SerializerMethodField()
    certificate = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    class Meta:
        model = Assessment
        fields = ["id", "company", "certificate", "passed", "attempted_at", "valid_until", "assessment_requirements"]

    def get_assessment_requirements(self, obj):
        return AssessmentRequirementSerializer(obj.assessment_requirements.all(), many=True).data

    def get_certificate(self, obj):
        return CertificateSerializer(obj.certificate).data

    def get_company(self, obj):
        return CompanySerializer(obj.company).data
