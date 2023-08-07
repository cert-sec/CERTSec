import os
import pandas as pd
import django
import matplotlib.pyplot as plt
import numpy as np

from compliance.tasks import nmap_vulners_scan_task

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

ip_addresses = ["192.168.254.115"]

def scheduled_evaluation(ip_addresses):
    nmap_vulners_scan_task.delay(ip_addresses, is_evaluation=True)


# scheduled_evaluation(ip_addresses)

def visualize_results():
    # Load the data from JSON files
    df = pd.read_json("path-to-file.json")


    # Convert bytes to megabytes
    df['memory_used'] = df['memory_used'] / (1024 * 1024)

    # Calculate mean values
    df = df.groupby('number_ips').mean().reset_index()
    metrics = ['cpu_percent', 'memory_used', 'execution_time']
    y_labels = ['CPU Usage (%)', 'Memory Usage (MB)', 'Response Time (s)']

    script_dir = os.path.dirname(os.path.realpath(__file__))
    output_dir = os.path.join(script_dir, '../backend/compliance', 'evaluation', 'results')
    for metric, y_label in zip(metrics, y_labels):
        plt.figure(figsize=(10, 5))

        rects = plt.bar(np.arange(len(df)), df[metric], color=(0.8, 0.8, 0.8), width=0.6)

        plt.xlabel('Number of Websites', fontsize=12)
        plt.ylabel(y_label, fontsize=12)
        plt.xticks(np.arange(len(df)), df['number_ips'])
        plt.gca().yaxis.grid(True, linestyle='--', which='major', color='grey', alpha=.25)
        # plt.savefig(os.path.join(output_dir, f"bar_plot_{metric}_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
        plt.show()


# visualize_part2()