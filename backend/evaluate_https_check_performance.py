import os
import time
import pandas as pd
import django
import json
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from datetime import datetime

from matplotlib import lines

from compliance.tasks import check_https_connection_task

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Define the websites to check
df = pd.read_csv('/Users/bulin/Developer/Master Thesis/master-thesis/backend/compliance/evaluation/data_sets/top-1m.csv', header=None)
one_website = df[1][:1].tolist()
ten_websites = df[1][:10].tolist()
hundred_websites = df[1][:100].tolist()

# Number of runs: 10
num_runs = 10

# Metrics for each set of websites
# metrics_sets = [one_website, ten_websites]#, hundred_websites]
metrics_sets = [hundred_websites]
metrics_all = {}


def visualize_results():
    # Load the data from JSON files
    one_website = "path-to-file.json"
    df1 = pd.read_json(one_website)
    df10 = pd.read_json('path-to-file.json')
    df100 = pd.read_json('path-to-file.json')

    # Convert bytes to megabytes
    df1['memory_used'] = df1['memory_used'] / (1024 * 1024)
    df10['memory_used'] = df10['memory_used'] / (1024 * 1024)
    df100['memory_used'] = df100['memory_used'] / (1024 * 1024)

    # Concatenate dataframes
    df = pd.concat([df1, df10, df100], ignore_index=True)

    # Calculate mean values
    df = df.groupby('number_websites').mean().reset_index()
    metrics = ['cpu_percent', 'memory_used', 'execution_time']
    y_labels = ['CPU Usage (%)', 'Memory Usage (MB)', 'Response Time (s)']

    script_dir = os.path.dirname(os.path.realpath(__file__))
    output_dir = os.path.join(script_dir, '../backend/compliance', 'evaluation', 'results')
    for metric, y_label in zip(metrics, y_labels):
        plt.figure(figsize=(10, 5))

        rects = plt.bar(np.arange(len(df)), df[metric], color=(0.8, 0.8, 0.8), width=0.6)

        plt.xlabel('Number of Websites', fontsize=12)
        plt.ylabel(y_label, fontsize=12)
        plt.xticks(np.arange(len(df)), df['number_websites'])
        plt.gca().yaxis.grid(True, linestyle='--', which='major', color='grey', alpha=.25)
        plt.savefig(os.path.join(output_dir, f"bar_plot_{metric}_{datetime.now().strftime('%d_%m_%Y--%H_%M_%S')}.png"))
        plt.show()


visualize_results()


def scheduled_evaluation(websites):
    check_https_connection_task.delay(websites, is_evaluation=True)


# scheduled_evaluation(ten_websites)
