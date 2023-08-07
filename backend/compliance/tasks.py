import nmap3
import time
import psutil
import os
import json
import resource
from ping3 import ping
from datetime import datetime

from compliance.utils.utils import check_technology_for_cves, check_https_connections
from cve_prioritizer.cve_prioritizer import cve_prioritizer_wrapper
from celery import shared_task


@shared_task()
def ping_ips_task(ip_addresses):
    results = {}

    # TODO: Remove - only for testing purposes
    # if ip_addresses:
    #     raise Exception("This is a simulated Exception")

    for ip in ip_addresses:
        try:
            delay = ping(ip)
            if delay is None:
                results[ip] = {
                    "connection_established": "False",
                    "description": "Unreachable"
                }
            elif delay is False:
                results[ip] = {
                    "connection_established": "False",
                    "description": "Time out"
                }
            else:
                results[ip] = {
                    "connection_established": "True",
                    "description": f"Reachable with delay: {delay} ms"
                }
        except Exception as e:
            results[ip] = {
                "connection_established": "Error",
                "description": f"Error: {str(e)}"
            }
    return results


@shared_task()
def nmap_top_ports_scan_task(ip_addresses):
    print("Scanning following ip_addresses: " + str(ip_addresses))

    nm = nmap3.Nmap()
    response = {}

    # ftp, ssh, telnet, smtp, http, https
    common_ports = [21, 22, 23, 25, 80, 443]
    for ip in ip_addresses:
        print(f"ip: {ip}")

        ports = []
        scan_results = nm.scan_top_ports(ip)
        print(f"nmap_top_ports_scan - scan_result: {scan_results}")

        for port in scan_results[ip]["ports"]:
            if int(port["portid"]) in common_ports:
                ports.append(port)
        response[ip] = ports

    print(f"\n response: {response}\n")
    print("\n Scan common ports has finished! \n")
    return response


@shared_task()
def check_https_connection_task(websites, is_evaluation=False):
    print("start https check call")
    # TODO: Remove - only for testing purposes
    # if websites:
    #     raise Exception("This is a simulated failure")

    # get the process that we want to analyze
    process = psutil.Process(os.getpid())
    # record the initial cpu percent
    cpu_percent_initial = process.cpu_percent(interval=None)
    # memory_initial = process.memory_info().rss
    memory_initial = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss

    # record the start time
    start_time = time.time()

    results = check_https_connections(websites)

    # record the final cpu percent and memory used
    cpu_percent_final = process.cpu_percent(interval=None)
    memory_final = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss


    # record the end time
    end_time = time.time()

    metrics = {
        "number_websites": len(websites),
        "cpu_percent": cpu_percent_final - cpu_percent_initial,
        "memory_used": memory_final - memory_initial,
        "execution_time": end_time - start_time
    }

    if is_evaluation:
        # Get absolute path to the directory where we want to save the results
        base_dir = os.path.dirname(os.path.abspath(__file__))
        results_dir = os.path.join(base_dir, 'evaluation', 'results')

        # Ensure the directory exists
        os.makedirs(results_dir, exist_ok=True)

        # Build the filename
        filename = f"scheduled_metrics_{len(websites)}_websites_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.json"
        file_path = os.path.join(results_dir, filename)

        print(f"Saving results to {file_path}")  # Just for debugging

        # Try to save metrics to a JSON file in the specified directory
        try:
            with open(file_path, 'w') as f:
                json.dump(metrics, f, indent=4)
            print("Results saved.")  # Just for debugging
        except Exception as e:
            print(f"Failed to save results: {e}")  # Print out any

    print("Finished check https call")
    return results


@shared_task()
def nmap_vulners_scan_task(ip_addresses, is_evaluation=False):
    print("Scanning following ip_addresses: " + str(ip_addresses))

    # get the process that we want to analyze
    process = psutil.Process(os.getpid())
    # record the initial cpu percent
    cpu_percent_initial = process.cpu_percent(interval=None)
    memory_initial = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss

    # record the start time
    start_time = time.time()

    # TODO: Remove - only for testing purposes
    # if ip_addresses:
    #     raise Exception("This is a simulated Exception")

    nm = nmap3.Nmap()
    response = {}

    for ip in ip_addresses:
        print(f"ip: {str(ip)}")

        # scan_results = nm.nmap_version_detection(ip, args=" -p80 --script vulners")
        scan_results = nm.nmap_version_detection(ip, args=" --script vulners")
        ip_details = scan_results[ip]

        vulnerabilities_response = {}
        for port in ip_details.get("ports", []):
            port_id = port.get("portid", "Unknown")
            service_name = port.get("service", {}).get("name", "Unknown")
            service_product = port.get("service", {}).get("product", "Unknown")
            service_version = port.get("service", {}).get("version", "Unknown")

            vulnerabilities_response[port_id] = {
                "protocol": port.get("protocol", "Unknown"),
                "service": {
                    "name": service_name,
                    "product": service_product,
                    "version": service_version,
                },
                "vulnerabilities": {},
            }

            vulnerabilities = port.get("scripts", [])
            if vulnerabilities:
                for vuln in vulnerabilities:
                    if "name" in vuln and vuln["name"] == "vulners" and "data" in vuln:
                        for cpe, cpe_data in vuln["data"].items():
                            for cve in cpe_data.get("children", []):
                                if cve["type"] == "cve":
                                    vulnerabilities_response[port_id]["vulnerabilities"][
                                        cve["id"]
                                    ] = {
                                        "type": cve["type"],
                                        "cvss": cve["cvss"],
                                        "is_exploit": cve["is_exploit"],
                                    }

        response[ip] = vulnerabilities_response

    _prioritize_nmap_cves(response)

    # record the final cpu percent and memory used
    cpu_percent_final = process.cpu_percent(interval=None)
    memory_final = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # record the end time
    end_time = time.time()

    metrics = {
        "number_ips": len(ip_addresses),
        "cpu_percent": cpu_percent_final - cpu_percent_initial,
        "memory_used": memory_final - memory_initial,
        "execution_time": end_time - start_time
    }

    if is_evaluation:
        # Get absolute path to the directory where we want to save the results
        base_dir = os.path.dirname(os.path.abspath(__file__))
        results_dir = os.path.join(base_dir, 'evaluation', 'results')

        # Ensure the directory exists
        os.makedirs(results_dir, exist_ok=True)

        # Build the filename
        filename = f"scheduled_metrics_{len(ip_addresses)}_ip_addresses_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.json"
        file_path = os.path.join(results_dir, filename)

        print(f"Saving results to {file_path}")  # Just for debugging

        # Try to save metrics to a JSON file in the specified directory
        try:
            with open(file_path, 'w') as f:
                json.dump(metrics, f, indent=4)
            print("Results saved to {file_path}")
        except Exception as e:
            print(f"Failed to save results to {file_path}: {e}")

    print("\n IP Addresses Vulnerability Scan has finished! \n")
    return response


@shared_task()
def technologies_vulnerability_scan_task(technologies):
    print(f"\n Scanning following technologies for vulnerabilities: {technologies}! \n")

    response = []
    for technology in technologies:
        print(f"\n technology: {technology} \n")

        if not all(key in technology for key in ("product", "version", "vendor")):
            raise ValueError("Invalid technology object provided")

        technology_response = {**technology, "vulnerabilities": {}}

        print(f"technology: {technology}")
        scan_result = check_technology_for_cves(technology["product"], technology["version"], technology["vendor"])
        print(f"\n ============ scan result: {scan_result}\n")

        if "error" in scan_result:
            technology_response["error"] = scan_result["error"]
            response.append(technology_response)
            continue

        vulnerabilities = scan_result.get("vulnerabilities")
        print(f"\n vulnerabilities: {vulnerabilities} \n")

        if vulnerabilities:
            cves_list = [cve["cve"]["id"] for cve in vulnerabilities]
            print(f"\n ==========================================================================\n")
            print(f"\n cves_list: {cves_list}\n")
            technology_response = _prioritize_technology_cves(technology_response, cves_list)
        response.append(technology_response)

    print("\n Technologies Vulnerability Scan has finished! \n")
    return response


def _prioritize_nmap_cves(data):
    for ip_address in data.keys():
        for port in data[ip_address].keys():
            if not data[ip_address][port]["vulnerabilities"]:
                continue

            cve_priority_details = cve_prioritizer_wrapper.prioritize_cves(
                data[ip_address][port]["vulnerabilities"].keys())

            vulnerabilities = data[ip_address][port]["vulnerabilities"]
            for cve in cve_priority_details.keys():
                vulnerabilities[cve]["priority_details"] = cve_priority_details[cve]

            data = {
                **data,
                ip_address: {
                    **data[ip_address],
                    port: {
                        **data[ip_address][port],
                        "vulnerabilities": vulnerabilities
                    }

                }
            }


def _prioritize_technology_cves(data, cves_list):
    cve_priority_details = cve_prioritizer_wrapper.prioritize_cves(cves_list)

    for cve, details in cve_priority_details.items():
        data["vulnerabilities"][cve] = details

    return data
