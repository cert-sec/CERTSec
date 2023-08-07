import os
from compliance.utils.utils import check_https_connections
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import seaborn as sns
import numpy as np
import json
from datetime import datetime
from collections import defaultdict


def autolabel(rects, ax, bottom_counts=None):
    """
    Attach a text label above each bar displaying its height
    """
    for idx, rect in enumerate(rects):
        height = rect.get_height()

        # indicates whether it is a stacked bar
        if bottom_counts is not None:
            # For stacked bars, determine the bottom position of this bar segment
            bottom = bottom_counts
            # Place the text label at the middle height of this segment
            ax.text(rect.get_x() + rect.get_width() / 2., bottom + (height / 2),
                    '%d' % int(height),
                    ha='center', va='center', color='black', fontsize=10, fontweight='bold')
        else:
            # For normal bars, place the text label above the bar
            ax.text(rect.get_x() + rect.get_width() / 2., height / 2,
                    '%d' % int(height),
                    ha='center', va='center', color='black', fontsize=10, fontweight='bold')


def autopct_format(values):
    def my_format(pct):
        total = sum(values)
        val = int(round(pct*total/100.0))
        return '{v:d} ({p:.2f}%)'.format(v=val, p=pct)
    return my_format


def plot_pie_chart(error_types, results, output_dir):
    error_counts_categorized = defaultdict(int)
    print(f"error_types: {error_types}")
    for error_message, count in error_types.items():
        # Categorize the certificate related errors under "Certificate Errors"
        if "Certificate verification failed" in error_message:
            error_counts_categorized["SSL Certificate Issues"] += count
        elif "The operation has timed out," in error_message:
            error_counts_categorized["Operation timeout: network issue or server unavailable"] += count
        else:
            error_counts_categorized[error_message] = count

    no_errors_count = len(results.keys()) - sum(error_counts_categorized.values())
    if no_errors_count > 0:
        error_counts_categorized["No Errors"] = no_errors_count

    # Update the labels and counts for the pie chart
    error_labels = list(error_counts_categorized.keys())
    error_counts = list(error_counts_categorized.values())

    print(f"no_error_count: {no_errors_count}")
    print(f"error_counts_categorized: {error_counts_categorized}")
    print(f"error_counts: {error_counts}")

    cmap = plt.get_cmap("Blues")
    colors = cmap(np.linspace(0.3, 1, len(error_counts)))

    # cmap = plt.get_cmap("tab20c")
    # colors = cmap(np.arange(len(error_counts)) % cmap.N)

    plt.figure(figsize=(7, 7))
    patches, texts, autotexts = plt.pie(error_counts, autopct=autopct_format(error_counts),
                                        startangle=140, colors=colors)

    for text, autotext in zip(texts, autotexts):
        text.set_visible(False)
        autotext.set_size(14)
        autotext.set_color('white')
        autotext.set_weight("bold")

    # plt.title('Distribution of Error Types', color='black', fontsize=14)
    plt.axis('equal')
    plt.legend(patches, error_labels, bbox_to_anchor=(0.04, 0.18), loc='upper left', title="Error Types", fontsize=12, title_fontsize=14)
    # plt.legend(patches, error_labels, loc="best", title="Error Types", fontsize=10, title_fontsize=12)

    plt.savefig(os.path.join(output_dir, f"error_distribution_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
    # Display the pie chart
    plt.show()


def plot_heatmap(comparison_results, output_dir):
    # Prepare data
    heatmap_data = []
    annotation_data = []
    for _, protocol_match, error_match in comparison_results:
        row_data = []
        row_annotation = []
        for match in [protocol_match, error_match]:
            if match is None:
                row_data.append(0)
                row_annotation.append("N/A")
            elif match:
                row_data.append(1)
                row_annotation.append("Match")
            else:
                row_data.append(-1)
                row_annotation.append("Mismatch")
        heatmap_data.append(row_data)
        annotation_data.append(row_annotation)

    # Create colormap
    cmap = mcolors.ListedColormap(['lightgrey', 'white', 'grey'])
    bounds = [-1, -0.5, 0.5, 1]
    norm = mcolors.BoundaryNorm(bounds, cmap.N)

    plt.figure(figsize=(10, 5))
    sns.heatmap(heatmap_data, annot=np.array(annotation_data), fmt='',
                xticklabels=["Protocol", "Error"],
                yticklabels=[x[0] for x in comparison_results],
                cmap=cmap, norm=norm, cbar=False)

    plt.xlabel('Attributes', fontsize=12)
    plt.ylabel('Websites', fontsize=12)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f"heatmap_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
    plt.show()


def plot_bar(comparison_results, output_dir):
    # Summary of Results
    matches = {"protocol": 0, "error": 0}
    mismatches = {"protocol": 0, "error": 0}
    for _, protocol_match, error_match in comparison_results:
        if protocol_match is not None:
            matches["protocol"] += protocol_match
            mismatches["protocol"] += not protocol_match
        if error_match is not None:
            matches["error"] += error_match
            mismatches["error"] += not error_match
    plt.figure(figsize=(10, 5))

    categories = list(matches.keys())
    match_counts = list(matches.values())
    mismatch_counts = list(mismatches.values())

    bar_width = 0.35

    rects1 = plt.bar([x - bar_width / 2 for x in range(len(categories))], match_counts, bar_width, label="Matches",
                     color='grey')
    rects2 = plt.bar([x + bar_width / 2 for x in range(len(categories))], mismatch_counts, bar_width,
                     label="Mismatches", color='lightgrey')

    plt.xticks([0, 1], ["Protocol", "Error"])
    plt.xlabel('Attributes', fontsize=12)
    plt.ylabel('Number of Websites', fontsize=12)
    # plt.title('Comparison of Attributes between CERTSec and SEO Site Checkup Results')
    plt.legend(title="Comparison Type", fontsize=10, title_fontsize=12)

    # Adding minor horizontal grid for easier reading
    plt.gca().yaxis.grid(True, linestyle='--', which='major', color='grey', alpha=.25)

    # Add number labels on bars
    autolabel(rects1, plt.gca())
    autolabel(rects2, plt.gca())

    plt.savefig(os.path.join(output_dir, f"attribute_comparison_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
    # Display the bar plot
    plt.show()


def plot_stacked_bar(cert_sec_results, external_automated_tool_results, output_dir):
    protocols = {"https": [0, 0], "http": [0, 0]}
    for site, data in cert_sec_results.items():
        if not data["protocol"] == "undefined":
            protocol = data["protocol"]
            protocols[protocol][0] += 1
    for site, data in external_automated_tool_results.items():
        if not data["protocol"] == "undefined":
            protocol = data["protocol"]
            protocols[protocol][1] += 1
    # Protocol Comparison Chart (Stacked Bar Plot)
    plt.figure(figsize=(10, 5))

    # To find the cumulative height of the bars
    bottom_external_automated_tool = 0
    bottom_cert_sec = 0
    bars = []
    colors = ['grey', 'lightgrey']

    for idx, (protocol, (cert_sec_results_count, automated_tool_count)) in enumerate(protocols.items()):
        bar = plt.bar(["CERTSec", "SEO Site Checkup"], [cert_sec_results_count, automated_tool_count],
                      bottom=[bottom_cert_sec, bottom_external_automated_tool], width=0.8,
                      color=colors[idx % len(colors)],
                      label=protocol)
        bars.append(bar)
        bottom_cert_sec += cert_sec_results_count
        bottom_external_automated_tool += automated_tool_count
        print(f"bottom_external_automated_tool: {bottom_external_automated_tool}")
        print(f"bottom_cert_sec: {bottom_cert_sec}")

    plt.xlabel('Tools', fontsize=12)
    plt.ylabel('Number of Reachable Websites', fontsize=12)
    # plt.title('Comparison of Protocols between CERTSec and SEO Site Checkup Results', fontsize=14)
    plt.legend(title="Protocols", fontsize=10, title_fontsize=12)

    # Adding minor horizontal grid for easier reading
    plt.gca().yaxis.grid(True, linestyle='--', which='major', color='grey', alpha=.25)

    # TODO: add numbers manually since code is not working as it should
    # for bar, bottom in zip(bars, [bottom_cert_sec, bottom_external_automated_tool]):
    #     print(f"bar, bottom: {bar}, {bottom}")
    #     autolabel(bar, plt.gca(), bottom)

    # Save the stacked bar plot
    plt.savefig(os.path.join(output_dir, f"protocol_comparison_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))

    # Display the stacked bar plot
    plt.show()


def main():
    """
    This list contains 30 websites that will be checked whether they are using the HTTPS protocol. The 20 firts websites
    are selected from the "top-1m.csv" file located in ./data-sets. The CSV file has been downloaded from https://tranco-list.eu/
    and provides the top 1 million websites. For the evaluation, the top 10 and least 10 websites have been selected.
    The last 10 websites are selected from badssl.com.
    """
    websites = [
        # 10 most popular websites
        "google.com", "a-msedge.net", "youtube.com", "facebook.com", "microsoft.com",
        "amazonaws.com", "twitter.com", "gtld-servers.net", "baidu.com", "instagram.com",
        # 10 least popular websites
        "seedmm.co", "netsolmobitest.cf", "quick.net.pl", "dhsdirect.com",
        "seedstory.com.hk", "boavistanet.net.br", "europass-info.de", "theck.es",
        "hayat.com", "redsalud.gob.cl",
        # 10 websites from badssl.com
        "https://expired.badssl.com/", "https://wrong.host.badssl.com/", "https://self-signed.badssl.com/",
        "https://untrusted-root.badssl.com/", "https://revoked.badssl.com/", "https://pinning-test.badssl.com/",
        "http://http.badssl.com/", "http://http-textarea.badssl.com/", "http://http-password.badssl.com/",
        "http://http-credit-card.badssl.com/"
    ]

    external_automated_tool_results = {
        "google.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "a-msedge.net": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "youtube.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "facebook.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "microsoft.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "amazonaws.com": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "twitter.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "gtld-servers.net": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # We cannot access https://gtld-servers.net in order to perform our test! Either the site is not online, or our tool is being blocked by your server.
        },
        "baidu.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "instagram.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "seedmm.co": {
            "protocol": "http",
            "description": "Not secure connection"
        },
        "netsolmobitest.cf": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "quick.net.pl": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "dhsdirect.com": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "seedstory.com.hk": {
            # can be accessed by CERTSec though :-)
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "boavistanet.net.br": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "europass-info.de": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "theck.es": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "hayat.com": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "redsalud.gob.cl": {
            "protocol": "undefined",
            "error": "Website not reachable"
            # Either the site is not online, or our tool is being blocked by your server.
        },
        "https://expired.badssl.com/": {
            "protocol": "https",
            "error": "Certificate verification failed: The certificate has expired"
        },
        "https://wrong.host.badssl.com/": {
            "protocol": "https",
            "error": "Certificate verification failed: Hostname mismatch, certificate is not valid for 'wrong.host.badssl.com'"
        },
        "https://self-signed.badssl.com/": {
            "protocol": "https",
            "error": "Certificate verification failed: Self signed certificate"
        },
        "https://untrusted-root.badssl.com/": {
            "protocol": "https",
            "error": "The root certificate is not trusted"
        },
        "https://revoked.badssl.com/": {
            "protocol": "https",
            "error": "Certificate verification failed: The certificate has expired"
        },
        "https://pinning-test.badssl.com/": {
            "protocol": "https",
            "description": "Secure connection"
        },
        "http://http.badssl.com/": {
            "protocol": "http",
            "description": "Not secure connection"
        },
        "http://http-textarea.badssl.com/": {
            "protocol": "http",
            "description": "Not secure connection"
        },
        "http://http-password.badssl.com/": {
            "protocol": "http",
            "description": "Not secure connection"
        },
        "http://http-credit-card.badssl.com/": {
            "protocol": "http",
            "description": "Not secure connection"
        },
    }

    cert_sec_results = check_https_connections(websites)

    # Determine the directory of the current script
    script_dir = os.path.dirname(os.path.realpath(__file__))
    # Define the output directory relative to the script's location
    output_dir = os.path.join(script_dir, 'compliance', 'evaluation', 'results')
    os.makedirs(output_dir, exist_ok=True)
    filename = "certsec_https_check_results.json"
    file_path = os.path.join(output_dir, filename)

    # Try to save metrics to a JSON file in the specified directory
    try:
        with open(file_path, 'w') as f:
            json.dump(cert_sec_results, f, indent=4)
        print(f"CERTSec results saved for {filename}.")  # Just for debugging
    except Exception as e:
        print(f"Failed to save CERTSec results for {filename}: {e}")  # Print out any

    # Data Preparation and Comparison of Results
    comparison_results = []
    cert_sec_error_types = {}
    ext_automated_tool_error_types = {}
    successful_error_comparisons = []

    for site, data in external_automated_tool_results.items():
        if site in cert_sec_results:
            if data["protocol"] == "undefined" or cert_sec_results[site]["protocol"] == "undefined":
                protocol_match = None
            else:
                protocol_match = data["protocol"] == cert_sec_results[site]["protocol"]

            data_error = data.get("error")
            cert_sec_error = cert_sec_results[site].get("error")

            if data_error is None and cert_sec_error is None:
                error_match = None  # No error to compare
            elif data_error is None or cert_sec_error is None:
                successful_error_comparisons.append(site)
                error_match = False  # There was an error in one but not in the other
            else:
                error_match = data_error == cert_sec_error  # Compare the errors
                successful_error_comparisons.append(site)

            comparison_results.append([site, protocol_match, error_match])

            if cert_sec_error:
                cert_sec_error_types[cert_sec_error] = cert_sec_error_types.get(cert_sec_error, 0) + 1
            if data_error:
                ext_automated_tool_error_types[data_error] = ext_automated_tool_error_types.get(data_error, 0) + 1

    plot_stacked_bar(cert_sec_results, external_automated_tool_results, output_dir)
    plot_bar(comparison_results, output_dir)
    plot_heatmap(comparison_results, output_dir)


if __name__ == "__main__":
    main()