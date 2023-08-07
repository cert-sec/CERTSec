import os
import httpx
import time
import http.client
import ssl
import socket
import fnmatch
import requests
from datetime import datetime
from urllib.parse import urlparse, urljoin
from http import HTTPStatus


NIST_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"


# Check NIST NVD for the CVE
def check_technology_for_cves(product, version, vendor=None):
    nvd_key = os.getenv("NIST_API")
    nvd_params = (
        f"?virtualMatchString=cpe:2.3:*:{vendor}:{product}:{version}"
        if vendor
        else f"?virtualMatchString=cpe:2.3:*:*:{product}:{version}"
    )
    nvd_url = NIST_BASE_URL + nvd_params
    headers = {"apiKey": f"{nvd_key}",
               "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
               } if nvd_key else {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}

    max_retries = 5
    retry_delay = 1  # seconds
    retries = 0

    final_status_code = ""

    while retries < max_retries:
        try:
            # Make a GET request to the NVD API
            nvd_response = httpx.get(nvd_url, headers=headers)
            # print(f"nvd_response: ", nvd_response)
            # print(f"\n vd_response.json(): \n", nvd_response.json())

            nvd_status_code = nvd_response.status_code
            final_status_code = nvd_response.status_code

            if nvd_status_code == 200:
                return nvd_response.json()
            elif nvd_response.status_code == 429 or nvd_response.status_code == 403:
                print(f"Status code: {nvd_response.status_code}. Text: {nvd_response.text}")
                # handle rate limiting by sleeping and retrying
                retries += 1
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            elif nvd_response.status_code == 404:
                print(f"Status code: {nvd_response.status_code}. Text: {nvd_response.text}")

                # queried resource could not be found
                return {
                    "error": f"Resource not found for product {product} and version {version}. URL: {nvd_url}"
                }
            else:
                print(f"Status code: {nvd_response.status_code}. Text: {nvd_response.text}")
                return {
                    "error": f"Error: Received a {nvd_response.status_code} status code from NVD"
                }
        except httpx.HTTPError:
            # handling connection error
            retries += 1
            time.sleep(retry_delay)
            retry_delay *= 2
            continue

    return {"error": f"Max retries reached. Unable to fetch data from NVD. Status code: {final_status_code}"}


def _prettify_error_message(raw_error):
    if "[SSL: CERTIFICATE_VERIFY_FAILED]" in raw_error:
        if "Hostname mismatch" in raw_error:
            domain = raw_error.split("valid for '")[1].split("'")[0]
            return f"Certificate verification failed: Hostname mismatch, certificate is not valid for '{domain}'"
        elif "certificate has expired" in raw_error:
            return "Certificate verification failed: The certificate has expired"
        elif "self signed certificate in certificate chain" in raw_error:
            return "Certificate verification failed: There is a self-signed certificate in the certificate chain"
        elif "self signed certificate" in raw_error:
            return "Certificate verification failed: Self signed certificate"
        else:
            return raw_error
    elif "[Errno 8]" in raw_error:
        return "The website could not be resolved"
    elif "[Errno 61]" in raw_error:
        return "The host is refusing the connection"
    elif "timed out" in raw_error:
        return "The operation has timed out, possibly due to network issues or the server being unavailable"
    else:
        return raw_error


def check_https_connections(websites):
    results = {}

    for site in websites:
        print(f"current website: {site}")
        tmp_site = "https://" + site if "://" not in site else site

        # Extract the domain name from the URL
        # --> every URL follows a specific format: <scheme>://<netloc>/<path>;<params>?<query>#<fragment>
        domain = urlparse(site).netloc or urlparse("https://" + site).netloc

        try:
            response = requests.get(tmp_site, timeout=(10, 60), verify=False)
            # response = requests.get(tmp_site, verify=False)
            print(f"response: {response.url}")
            if response.url.startswith('https://'):
                print('The website is using HTTPS.')
                # Create a context with secure default settings
                context = ssl.create_default_context()
                print(f"current domain: {domain}")
                # Try to establish now an SSL/TLS socket-based connection to the requested
                # website using the created context. This secure context enforces some
                # level of security by checking the server's certificate for authenticity
                # and validity. If no response is received within 10 seconds, the connection
                # will time out
                conn = http.client.HTTPSConnection(domain, context=context, timeout=10)

                # Fetch meta-data (in this case "headers") about the resource.
                # "/" is the URL path to the request, i.e., the root of the website
                conn.request("HEAD", "/")

                # Returns the HTTPResponse object that contains the status, headers, and
                # any data sent back by the server
                response = conn.getresponse()
                print(f"current domain: {domain}\n")
                print(f"conn.response.status: {response.status}\n")
                if conn.sock is not None:
                    # Fetch the server's certificate information
                    cert = conn.sock.getpeercert()

                    # The 'subjectAltName' in the certificate ensures that the certificate
                    # is not only valid but also belongs to the correct site, i.e., check whether
                    # the domain name is listed in the certificate's subjectAltName field. It also
                    # contains a list of alternative names for which the certificate is valid (in
                    # addition to the primary domain)
                    subjectAltName = dict(cert).get("subjectAltName", ())
                    matching_domains = [item for key, item in subjectAltName if key == "DNS"]
                    print(f"matching domains for {domain}: {matching_domains}")
                    is_match = any(fnmatch.fnmatch(domain, pattern) for pattern in matching_domains)
                    print(f"is_match for {domain}: {is_match}")
                    if is_match:
                        results[site] = {
                            "protocol": "https",
                            "description": "Secure connection"
                        }
                    else:
                        results[site] = {
                            "protocol": "https",
                            "description": "Not secure connection (Certificate not trusted)"
                        }
                else:
                    results[site] = {
                        "protocol": "undefined",
                        "error": "Failed to establish connection"
                    }
                conn.close()
            else:
                results[site] = {
                    "protocol": "http",
                    "description": "Not secure connection"
                }
        except (socket.gaierror, socket.timeout, ConnectionRefusedError) as e:
            # Catching specific exceptions helps us understand the type of error
            # and allows us to handle it accordingly.
            results[site] = {
                "protocol": "undefined",
                "error": f"{_prettify_error_message(str(e))}"
            }
        except ssl.SSLError as e:
            results[site] = {
                "protocol": "https",
                "error": f"{_prettify_error_message(str(e))}"
            }
        except requests.exceptions.ConnectionError as e:
            results[site] = {
                "protocol": "undefined",
                "error": f"{_prettify_error_message(str(e))}",
            }
        except requests.exceptions.ReadTimeout as e:
            # Handle the read timeout exception
            results[site] = {
                "protocol": "undefined",
                "error": "The server didn't respond in time",
                "raw_error": str(e)
            }
        except http.client.HTTPException as e:
            # Catching specific exceptions helps us understand the type of error
            # and allows us to handle it accordingly.
            results[site] = {
                "protocol": "undefined",
                "error": "There was a problem with the HTTP communication.",
                "raw_error": f"{str(e)}"
            }

    return results


def prepare_gpt_messages(company, certificate, requirements):
    certs_info = {
        "Technical Baseline": "is looking to attain a 'Technical Baseline Certification'. " +\
                              "This certification verifies that an organization has essential technical measures and " +\
                              "practices in place to bolster their cybersecurity posture.\n",
        "Cost-Aware Baseline": "is looking to attain a 'Cost-Aware Baseline Certification'. " +\
                              "This certification verifies that a business has analyzed its cybersecurity risks and made" +\
                            "informed decisions about which security measures to deploy in accordance with its budget ",
        "Comprehensive Baseline": "is looking to attain a 'Comprehensive Baseline Certification'. " +\
                              "This certification verifies that a business' cybersecurity measures and practices align with societal expectations and requirements",
    }
    chatbot_role = "Suppose you are a Cybersecurity Expert specializing in Risk Management and Compliance, working as " +\
                     "a consultant for Small and Medium-sized Enterprises (SMEs) that are looking to bolster their cybersecurity measures."

    certificate_information = f"Company {company.name} {certs_info[certificate.name]}\n"

    requirements_information = f"To attain this certification, Company {company.name} needs to fulfill the following requirements:\n" + \
                               "\n".join(f"- {req.description}" for req in requirements)

    actual_request = f"Please provide detailed guidance, addressed to the management of Company {company.name}, specifying " +\
                     "actionable steps they can take to fulfill each requirement. Include the benefits of fulfilling these requirements, technologies that would be" +\
                     "appropriate and a brief explanation of how implementing these steps can improve their cybersecurity posture." +\
                     "Additionally, provide an approximate timeline for each step and any potential challenges they may face during implementation." +\
                    "Use html tags do define a nice and appealing design of the output. Do not use the following tags: <html>, <body>, <head>, <h1> \n"

    report_structure = f"""
    Your response should follow the following structure:
    1. Start with the following elements:
        <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; line-height: 1.5; padding: 20mm; color: #333; max-width: 210mm; margin: 0 auto; box-sizing: border-box;">
            <!-- Start with following elements -->
            <h1 style="font-size: 20px; text-align: center; color: #34495E; margin-bottom: 10mm;">CERTSec Cybersecurity Recommendations</h1>
            <p style="font-size: 12px; margin-bottom: 5mm;">
                Date:   {datetime.now().strftime('%d.%m.%Y')}<br>
                To:     {company.name}<br>
                From:   CERTSec Automated Report Generation Tool
            </p>
            <h2 style="font-size: 18px; color: #34495E; margin-bottom: 5mm;"><strong>Subject: Actionable Steps to Fulfill the Remaining {certificate.name} Certification Requirements</strong></h2>
        
            <p style="font-size: 14px;">
                Dear Management of Company <strong>{company.name}</strong>,
                <br><br>            
                Congratulations on your decision to pursue the <strong>{certificate.name}</strong> Certification! To fulfill each of the requirements, please find below detailed guidance with actionable steps, benefits, estimated timeline, and potential challenges:
            </p>
    2. For the {len(requirements)} requirements provided before, continue with the following elements:
            <!-- Requirements -->
            <!-- For EACH requirement listed at the beginning, generate the following information: -->
            <div style="page-break-before: always; padding: 10mm; border-radius: 4px;">
                <h3 style="margin: 0; padding-bottom: 2mm; font-size: 16px; color: #174361;">Requirement X: Requirement description</h3>
                <p style="font-size: 14px; margin: 2mm 0;">
                    To fulfill this requirement, Company X should implement the following steps:
                </p>
                <ol style="margin-left: 5mm; font-size: 14px;">
                    <li>List all steps using an ordered list</li>
                </ol>
                <p style="font-size: 14px; margin: 2mm 0;">
                    <strong>Benefits:</strong> Benefits of implementing these steps
                <br><br>
                    <strong>Timeline:</strong> Provide a rough timeline
                <br><br>
                    <strong>Potential Challenges:</strong> Describe potential challenges
                </p>
            </div>
            <!-- End of Requirement Section -->
    3. Conclude your response with the following elements:
            <!-- Conclusion -->
            <div style="page-break-before: always; padding: 10mm; border-radius: 4px;">
                <p style="font-size: 14px; margin-top: 10mm;">
                    We believe that following these actionable steps will significantly improve Company <strong>{company.name}</strong>'s cybersecurity posture and help in achieving the <strong>{certificate.name}</strong> Certification. As with any implementation, challenges may arise, but with proper planning and guidance, these challenges can be overcome effectively.
                    <br><br>
                    If you have any further questions or need assistance during the implementation process, please do not hesitate to reach out for professional guidance.
                    <br><br>
                    <strong>Best regards,</strong><br>
                    CERTSec Team
                </p>
            </div>
        </div>
    """

    response = {
        "system_msg": chatbot_role,
        "user_msg": certificate_information + requirements_information + actual_request + report_structure
    }
    return response
