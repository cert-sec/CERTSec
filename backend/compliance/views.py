import os
import openai
from django.http import HttpResponse
from dotenv import load_dotenv
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view

from compliance.models import Company, Certificate, Category, Requirement, Assessment, AssessmentRequirement
from compliance.serializers import CompanySerializer, CertificateSerializer, CategorySerializer, RequirementSerializer, \
    AssessmentSerializer, AssessmentRequirementSerializer
from compliance.tasks import check_https_connection_task, ping_ips_task, nmap_vulners_scan_task, \
    technologies_vulnerability_scan_task, nmap_top_ports_scan_task
from celery.result import AsyncResult
from datetime import datetime
from dateutil.relativedelta import relativedelta

from compliance.utils.utils import prepare_gpt_messages
from django.template.loader import get_template
from xhtml2pdf import pisa

load_dotenv()

@api_view(["POST"])
def generate_report(request, id):
    assessment_id = id
    if not assessment_id:
        return Response({'error': 'No assessment id provided'}, status=status.HTTP_400_BAD_REQUEST)

    assessment = get_object_or_404(Assessment, id=assessment_id)

    # Fetch related company and certificate
    company = assessment.company
    certificate = assessment.certificate

    # Fetch all the unfulfilled requirements that belong to this assessment
    # and prefetch the related Requirement objects
    unfulfilled_assessment_requirements = AssessmentRequirement.objects.filter(
        assessment=assessment,
        fulfilled=False
    ).select_related('requirement')

    # Extract the Requirement objects from the AssessmentRequirement objects
    unfulfilled_requirements = [ar.requirement for ar in unfulfilled_assessment_requirements]
    print(f"Number of unfulfilled requirements: {len(unfulfilled_requirements)}")

    prompt = prepare_gpt_messages(company, certificate, unfulfilled_requirements)
    print(prompt)

    openai.api_key = os.getenv("OPEN_AI_API")
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo-16k",
                                            messages=[{"role": "system", "content": prompt["system_msg"]},
                                                      {"role": "user", "content": prompt["user_msg"]}])
    if response["choices"][0]["finish_reason"] == "stop":
        gpt_content = response["choices"][0]["message"]["content"]
        print(gpt_content)
        template = get_template('pdf_report_template.html')

        # Render the template with the content
        html = template.render({'body': gpt_content})

        # Create a HttpResponse object with the PDF
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="recommendations.pdf"'

        # Generate PDF
        pisa_status = pisa.CreatePDF(html, dest=response)

        # Return the response object
        return response
    else:
        print(response["choices"][0]["finish_reason"] == "stop")
    return Response({'prompt': prompt})




@api_view(["GET", "POST"])
def companies(request):
    if request.method == "GET":
        companies = Company.objects.all()
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        company_name = request.data.get("name")
        if Company.objects.filter(name=company_name).exists():
            return Response({'name': 'A company with this name already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CompanySerializer(data=request.data)
        if serializer.is_valid():
            created_company = serializer.save()
            response_data = serializer.data
            response_data["id"] = created_company.id
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def get_background_process_status(request):
    task_id = request.GET.get("id")

    if task_id is None:
        return Response({'error': 'task_id is required as a query parameter'}, status=status.HTTP_400_BAD_REQUEST)

    task = AsyncResult(task_id)
    response_data = {
        "status": task.status,
    }

    # include result if the task has finished
    if task.successful():
        response_data['result'] = task.result

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_certificates(request):
    certificates = Certificate.objects.all()
    serializer = CertificateSerializer(certificates, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_categories(request):
    certificate_type = request.GET.get("type")

    if certificate_type == "tb":
        try:
            certificate = Certificate.objects.get(name="Technical Baseline")
        except Certificate.DoesNotExist:
            return Response({"error": "Certificate not found"}, status.HTTP_404_NOT_FOUND)

        categories = certificate.categories.all()

        serializer = CategorySerializer(categories, many=True)

        return Response(serializer.data)
    elif certificate_type == "cab":
        try:
            certificate = Certificate.objects.get(name="Cost-Aware Baseline")
        except Certificate.DoesNotExist:
            return Response({"error": "Certificate not found"}, status.HTTP_404_NOT_FOUND)

        categories = certificate.categories.all()

        serializer = CategorySerializer(categories, many=True)

        return Response(serializer.data)
    elif certificate_type == "cob":
        try:
            certificate = Certificate.objects.get(name="Comprehensive Baseline")
        except Certificate.DoesNotExist:
            return Response({"error": "Certificate not found"}, status.HTTP_404_NOT_FOUND)

        categories = certificate.categories.all()

        serializer = CategorySerializer(categories, many=True)

        return Response(serializer.data)


@api_view(["GET"])
def get_requirements(request):
    requirements = Requirement.objects.all()
    serializer = RequirementSerializer(requirements, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_assessments(request):
    assessments = Assessment.objects.all()
    serializer = AssessmentSerializer(assessments, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_assessment(request, id):
    if request.method == "GET":
        try:
            assessment = Assessment.objects.get(id=id)
        except Assessment.DoesNotExist:
            return Response({'error': 'Assessment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Serialize the assessment object including related AssessmentRequirement instances
        serializer = AssessmentSerializer(assessment)

        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response({'error': 'Invalid Method'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def assessments(request):
    if request.method == "POST":
        company_id = request.data.get("company_id")
        certificate_id = request.data.get("certificate_id")
        user_responses = request.data.get("user_responses")

        assessment = Assessment.objects.create(
            company_id=company_id,
            certificate_id=certificate_id,
            passed=False
        )

        all_requirements_passed = True
        for requirement_id, fulfilled in user_responses.items():

            requirement = Requirement.objects.get(pk=requirement_id)
            if fulfilled == "no":
                all_requirements_passed = False

            AssessmentRequirement.objects.create(
                assessment=assessment,
                requirement=requirement,
                fulfilled= True if fulfilled == "yes" else False
            )

        assessment.passed = all_requirements_passed
        if all_requirements_passed:
            current_date = datetime.now()
            valid_until = current_date + relativedelta(years=1)
            assessment.valid_until = valid_until
        assessment.save()

        return Response({
            'assessment_id': assessment.id,
            'passed': all_requirements_passed
        }, status=status.HTTP_201_CREATED)

    return Response({'error': 'Invalid Method'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def get_assessment_requirements(request):
    assessment_requirements = AssessmentRequirement.objects.all()
    serializer = AssessmentRequirementSerializer(assessment_requirements, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def ping_ip(request):
    ip_addresses = request.data.get("ip_addresses", [])

    task = ping_ips_task.delay(ip_addresses)
    return Response({"task_id": task.id})


@api_view(["POST"])
def nmap_top_ports_scan(request):
    ip_addresses = request.data.get("ip_addresses", [])

    task = nmap_top_ports_scan_task.delay(ip_addresses)
    return Response({"task_id": task.id})


@api_view(["POST"])
def check_https_connection(request):
    websites = request.data.get("websites", [])

    # Start check_https_connection_task as a background process
    task = check_https_connection_task.delay(websites)
    return Response({"task_id": task.id})


@api_view(["POST"])
def nmap_vulners_scan(request):
    ip_addresses = request.data.get("ip_addresses", None)

    print("Scanning following ip_addresses: " + str(ip_addresses))

    if ip_addresses is None:
        return Response({"error": "No IPs provided."}, status=400)

    task = nmap_vulners_scan_task.delay(ip_addresses)
    return Response({"task_id": task.id})


@api_view(["POST"])
def technology_vulners_scan(request):
    technologies = request.data.get("technologies", None)

    print("Scanning following technologies: " + str(technologies))

    # Validate the request data
    if not technologies:
        return Response({"error": "No technologies provided."}, status=400)

    task = technologies_vulnerability_scan_task.delay(technologies)
    return Response({"task_id": task.id})


