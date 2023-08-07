import concurrent

from concurrent.futures import ThreadPoolExecutor

from cve_prioritizer.cve_prioritizer.scripts.helpers import worker_v2


def _process_cves(cve_list, cvss_threshold, epss_threshold, max_workers):
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(
                worker_v2, cve.upper().strip(), cvss_threshold, epss_threshold
            )
            for cve in cve_list
        ]

    results = []
    for future in concurrent.futures.as_completed(futures):
        result = future.result()
        if result is not None:
            results.append(result)

    return results


def prioritize_cves(cve_list, epss=0.2, cvss=6.0, threads=40):
    results = _process_cves(cve_list, cvss, epss, threads)

    results_dict = {key: value for result in results for key, value in result.items()}
    print(results_dict)

    return results_dict


# prioritize_cves(["CVE-2019-9517", "CVE-2023-25690", "CVE-2022-31813"])
