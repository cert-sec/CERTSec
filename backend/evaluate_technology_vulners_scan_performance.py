import os
import time
import django
import json
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime


from compliance.tasks import technologies_vulnerability_scan_task

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Define the technologies to check
one_technology = [{'product': 'HTTP_Server', 'version': '2.4.46', 'vendor': 'Apache'}]
five_technologies = [
    {'product': 'HTTP_Server', 'version': '2.4.46', 'vendor': 'Apache'},
    {"vendor": "Oracle", "product": "MySQL", "version": "8.0.19"},
    {"vendor": "", "product": "php", "version": "7.4.11"},
    {"vendor": "Microsoft", "product": "windows_server", "version": "2019"},
    {"vendor": "OpenSSL", "product": "OpenSSL", "version": "1.1.1h"}
]
ten_technologies = [
    {"product": "HTTP_Server", "version": "2.4.46", "vendor": "Apache"},
    {"vendor": "Oracle", "product": "MySQL", "version": "8.0.19"},
    {"vendor": "", "product": "php", "version": "7.4.11"},
    {"vendor": "Microsoft", "product": "windows_server", "version": "2019"},
    {"vendor": "OpenSSL", "product": "OpenSSL", "version": "1.1.1h"},
    {"vendor": "IBM", "product": "WebSphere_Application_Server", "version": "9.0.5.6"},
    {"vendor": "Adobe", "product": "ColdFusion", "version": "2018"},
    {"vendor": "Atlassian", "product": "Jira", "version": "8.13"},
    {"vendor": "Elastic", "product": "ElasticSearch", "version": "7.9.3"},
    {"vendor": "Microsoft", "product": "Excel", "version": "2019"}
]


def scheduled_evaluation(technologies):
    technologies_vulnerability_scan_task.delay(technologies, is_evaluation=True)


# scheduled_evaluation(ip_addresses)


def visualize_results():
    with open('path-to-file.json', 'r') as f:
        data = json.load(f)

    # Sort keys to make sure they are in the right order
    sorted_keys = sorted(data.keys(), key=int)

    # Prepare data
    technologies = [int(k) for k in sorted_keys]
    vulnerabilities = [data[k]['vulnerabilities'] for k in sorted_keys]
    response_times = [np.mean(data[k]['response_times']) for k in sorted_keys]
    response_times_std = [np.std(data[k]['response_times']) for k in sorted_keys]

    print(f"technologies: {technologies}")
    print(f"response times: {response_times}")
    print(f"vulnerabilities: {vulnerabilities}")
    print(f"response_times_std: {response_times_std}")

    # Create plot
    fig, ax1 = plt.subplots(figsize=(10, 5))

    # Create bars for response time with error bars
    color = 'grey'
    ax1.set_xlabel('Number of Technologies', fontsize=12)
    ax1.set_ylabel('Average Response Time (s)', fontsize=12)
    rects1 = ax1.bar(np.array(technologies) - 0.4, response_times, color=color, width=0.8, yerr=response_times_std,
                     capsize=4, label='Avg. Response Time')
    ax1.tick_params(axis='y')
    ax1.grid(True, linestyle='--', which='major', color='grey', alpha=.25)

    # Create a second y-axis for the number of vulnerabilities
    ax2 = ax1.twinx()
    color = 'lightgrey'
    ax2.set_ylabel('Number of Vulnerabilities', fontsize=12)
    rects2 = ax2.bar(np.array(technologies) + 0.4, vulnerabilities, color=color, width=0.8,
                     label='#Vulnerabilities')
    ax2.tick_params(axis='y')

    # Place a legend on the plot
    lines, labels = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax2.legend(lines + lines2, labels + labels2, loc=0)

    fig.tight_layout()
    plt.xticks(ticks=technologies, labels=technologies)

    script_dir = os.path.dirname(os.path.realpath(__file__))
    output_dir = os.path.join(script_dir, '../backend/compliance', 'evaluation', 'results')

    #plt.savefig(os.path.join(output_dir, f"bar_plot_response_time_and_vulnerabilities_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
    plt.show()


visualize_results()
