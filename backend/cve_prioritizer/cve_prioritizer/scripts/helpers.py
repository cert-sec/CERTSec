#!/usr/bin/env python3
# This file contains the functions that create the reports

import os
import time

import requests

from dotenv import load_dotenv
from termcolor import colored

from cve_prioritizer.cve_prioritizer.scripts.constants import EPSS_URL
from cve_prioritizer.cve_prioritizer.scripts.constants import NIST_BASE_URL

__author__ = "Mario Rojas"
__license__ = "BSD 3-clause"
__version__ = "1.3.0"
__maintainer__ = "Mario Rojas"
__status__ = "Production"

load_dotenv()


# Collect EPSS Scores
def epss_check(cve_id):
    try:
        epss_url = EPSS_URL + f"?cve={cve_id}"
        epss_response = requests.get(epss_url)
        epss_status_code = epss_response.status_code

        if epss_status_code == 200:
            if epss_response.json().get("total") > 0:
                for cve in epss_response.json().get("data"):
                    results = {
                        "epss": float(cve.get("epss")),
                        "percentile": int(float(cve.get("percentile")) * 100),
                    }
                    return results
            else:
                return False
        else:
            print("Error connecting to EPSS")
    except requests.exceptions.ConnectionError:
        print(f"Unable to connect to EPSS, Check your Internet connection or try again")
        return None


# Check NIST NVD for the CVE
def nist_check(cve_id):
    max_retries = 10
    retry_delay = 1  # seconds
    retries = 0

    while retries < max_retries:
        try:
            nvd_key = os.getenv("NIST_API")
            nvd_url = NIST_BASE_URL + f"?cveId={cve_id}"
            header = {"apiKey": f"{nvd_key}"}

            # Check if API has been provided
            if nvd_key:
                nvd_response = requests.get(nvd_url, headers=header)
            else:
                nvd_response = requests.get(nvd_url)

            nvd_status_code = nvd_response.status_code

            if nvd_status_code == 200:
                cisa_kev = False
                if nvd_response.json().get("totalResults") > 0:
                    for unique_cve in nvd_response.json().get("vulnerabilities"):
                        # Check if present in CISA's KEV
                        if unique_cve.get("cve").get("cisaExploitAdd"):
                            cisa_kev = True

                        # Collect CVSS Data
                        if unique_cve.get("cve").get("metrics").get("cvssMetricV31"):
                            for metric in (
                                unique_cve.get("cve").get("metrics").get("cvssMetricV31")
                            ):
                                results = {
                                    "cvss_version": "CVSS 3.1",
                                    "cvss_baseScore": float(
                                        metric.get("cvssData").get("baseScore")
                                    ),
                                    "cvss_severity": metric.get("cvssData").get(
                                        "baseSeverity"
                                    ),
                                    "cisa_kev": cisa_kev,
                                }
                                return results
                        elif unique_cve.get("cve").get("metrics").get("cvssMetricV30"):
                            for metric in (
                                unique_cve.get("cve").get("metrics").get("cvssMetricV30")
                            ):
                                results = {
                                    "cvss_version": "CVSS 3.0",
                                    "cvss_baseScore": float(
                                        metric.get("cvssData").get("baseScore")
                                    ),
                                    "cvss_severity": metric.get("cvssData").get(
                                        "baseSeverity"
                                    ),
                                    "cisa_kev": cisa_kev,
                                }
                                return results
                        elif unique_cve.get("cve").get("metrics").get("cvssMetricV2"):
                            for metric in (
                                unique_cve.get("cve").get("metrics").get("cvssMetricV2")
                            ):
                                results = {
                                    "cvss_version": "CVSS 2.0",
                                    "cvss_baseScore": float(
                                        metric.get("cvssData").get("baseScore")
                                    ),
                                    "cvss_severity": metric.get("cvssData").get(
                                        "baseSeverity"
                                    ),
                                    "cisa_kev": cisa_kev,
                                }
                                return results
                        elif unique_cve.get("cve").get("vulnStatus") == "Awaiting Analysis":
                            print(
                                f"{cve_id:<18}NIST Status: {unique_cve.get('cve').get('vulnStatus')}"
                            )
                else:
                    print(f"{cve_id:<18}Not Found in NIST NVD.")
            elif nvd_status_code == 429 or nvd_status_code == 403:
                # handle rate limiting by sleeping and retrying
                retries += 1
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            elif nvd_status_code == 404:
                # Queried resource could not be found
                return {
                    "error": f"Resource not found for CVE ID {cve_id}"
                }
            else:
                return {
                    "error": f"Error: Received a {nvd_status_code} status code from NVD"
                }
        except requests.exceptions.ConnectionError:
            print("Unable to connect to NIST NVD. Check your Internet connection or try again.")
            # Handling connection error
            retries += 1
            time.sleep(retry_delay)
            retry_delay *= 2
            continue

        return {"error": "Max retries reached. Unable to fetch data from NVD"}


def colored_print(priority):
    if priority == "Priority 1+":
        return colored(priority, "red")
    elif priority == "Priority 1":
        return colored(priority, "light_red")
    elif priority == "Priority 2":
        return colored(priority, "light_yellow")
    elif priority == "Priority 3":
        return colored(priority, "yellow")
    elif priority == "Priority 4":
        return colored(priority, "green")


# Function manages the outputs
def print_and_write(
    working_file,
    cve_id,
    priority,
    epss,
    cvss_base_score,
    cvss_version,
    cvss_severity,
    cisa_kev,
    verbose,
):
    color_priority = colored_print(priority)

    if verbose:
        print(
            f"{cve_id:<18}{color_priority:<22}{epss:<9}{cvss_base_score:<6}{cvss_version:<10}{cvss_severity:<10}{cisa_kev}"
        )
    else:
        print(f"{cve_id:<18}{color_priority:<22}")
    if working_file:
        working_file.write(
            f"{cve_id},{priority},{epss},{cvss_base_score},{cvss_version},{cvss_severity},{cisa_kev}\n"
        )


# Main function
def worker(cve_id, cvss_score, epss_score, verbose_print, sem, save_output=None):
    nist_result = nist_check(cve_id)
    epss_result = epss_check(cve_id)

    working_file = None
    if save_output:
        working_file = open(save_output, "a")

    results = {}

    try:
        if nist_result.get("cisa_kev"):
            print_and_write(
                working_file,
                cve_id,
                "Priority 1+",
                epss_result.get("epss"),
                nist_result.get("cvss_baseScore"),
                nist_result.get("cvss_version"),
                nist_result.get("cvss_severity"),
                "TRUE",
                verbose_print,
            )
        elif nist_result.get("cvss_baseScore") >= cvss_score:
            if epss_result.get("epss") >= epss_score:
                print_and_write(
                    working_file,
                    cve_id,
                    "Priority 1",
                    epss_result.get("epss"),
                    nist_result.get("cvss_baseScore"),
                    nist_result.get("cvss_version"),
                    nist_result.get("cvss_severity"),
                    "FALSE",
                    verbose_print,
                )
            else:
                print_and_write(
                    working_file,
                    cve_id,
                    "Priority 2",
                    epss_result.get("epss"),
                    nist_result.get("cvss_baseScore"),
                    nist_result.get("cvss_version"),
                    nist_result.get("cvss_severity"),
                    "FALSE",
                    verbose_print,
                )
        else:
            if epss_result.get("epss") >= epss_score:
                print_and_write(
                    working_file,
                    cve_id,
                    "Priority 3",
                    epss_result.get("epss"),
                    nist_result.get("cvss_baseScore"),
                    nist_result.get("cvss_version"),
                    nist_result.get("cvss_severity"),
                    "FALSE",
                    verbose_print,
                )
            else:
                print_and_write(
                    working_file,
                    cve_id,
                    "Priority 4",
                    epss_result.get("epss"),
                    nist_result.get("cvss_baseScore"),
                    nist_result.get("cvss_version"),
                    nist_result.get("cvss_severity"),
                    "FALSE",
                    verbose_print,
                )
    except (TypeError, AttributeError):
        return None

    if working_file:
        working_file.close()

    sem.release()


"""
NIST's NVD API allows to make up to 50 requests to the API within any given 30 seconds
period. To stay within this rate limit we set our max_workers in cve_prioritizer_wrapper.py
to 50, which means that 50 threads can start almost at the same time.

In case of 50 requests in a 30-second window, we'll need to ensure that the threads wait 
30/50 = 0.6 seconds on average before making the next API request. To account also for network
latencies, for example, we play it safe and wait a bit longer (i.e., 0.7s or 0.8s)
"""
def worker_v2(cve_id, cvss_score, epss_score):
    time.sleep(1)

    nist_result = nist_check(cve_id)
    epss_result = epss_check(cve_id)

    results = {}

    try:
        if nist_result.get("cisa_kev"):
            results = {
                cve_id: {
                    "priority": "Priority 1+",
                    "epss": epss_result.get("epss"),
                    "cvss_baseScore": nist_result.get("cvss_baseScore"),
                    "cvss_version": nist_result.get("cvss_version"),
                    "cvss_severity": nist_result.get("cvss_severity"),
                    "cisa_kev": "TRUE",
                }
            }
        elif nist_result.get("cvss_baseScore") >= cvss_score:
            if epss_result.get("epss") >= epss_score:
                results = {
                    cve_id: {
                        "priority": "Priority 1",
                        "epss": epss_result.get("epss"),
                        "cvss_baseScore": nist_result.get("cvss_baseScore"),
                        "cvss_version": nist_result.get("cvss_version"),
                        "cvss_severity": nist_result.get("cvss_severity"),
                        "cisa_kev": "FALSE",
                    }
                }
            else:
                results = {
                    cve_id: {
                        "priority": "Priority 2",
                        "epss": epss_result.get("epss"),
                        "cvss_baseScore": nist_result.get("cvss_baseScore"),
                        "cvss_version": nist_result.get("cvss_version"),
                        "cvss_severity": nist_result.get("cvss_severity"),
                        "cisa_kev": "FALSE",
                    }
                }
        else:
            if epss_result.get("epss") >= epss_score:
                results = {
                    cve_id: {
                        "priority": "Priority 3",
                        "epss": epss_result.get("epss"),
                        "cvss_baseScore": nist_result.get("cvss_baseScore"),
                        "cvss_version": nist_result.get("cvss_version"),
                        "cvss_severity": nist_result.get("cvss_severity"),
                        "cisa_kev": "FALSE",
                    }
                }
            else:
                results = {
                    cve_id: {
                        "priority": "Priority 4",
                        "epss": epss_result.get("epss"),
                        "cvss_baseScore": nist_result.get("cvss_baseScore"),
                        "cvss_version": nist_result.get("cvss_version"),
                        "cvss_severity": nist_result.get("cvss_severity"),
                        "cisa_kev": "FALSE",
                    }
                }
    except (TypeError, AttributeError):
        return None

    return results


# Function retrieves data from CVE Trends
def cve_trends():
    cve_list = []

    try:
        html = requests.get("https://cvetrends.com/api/cves/7days")
        parsed = html.json()
        if html.status_code == 200:
            for cve in parsed.get("data"):
                cve_list.append(cve.get("cve"))
        else:
            return None
    except ConnectionError:
        print(
            f"Unable to connect to CVE Trends, Check your Internet connection or try again"
        )
        return None

    return cve_list
