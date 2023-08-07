# CERTSec - An Automated Cybersecurity Self-Assessment Tool

Welcome to the CERTSec project! This repository provides the source code for an innovative cybersecurity certification scheme automated through CERTSec. By taking into account key dimensions of cybersecurity (_i.e.,_ technical, economic, and societal), the tool offers a more balanced and holistic approach to assessing an organization's cybersecurity posture. CERTSec demonstrates the feasibililty of employing automation in risk analysis and streamlines processes involved in the proposed certification scheme.

**Project Manager:** [Dr. Muriel Franco](https://github.com/murielfranco)<br/>
**Developer:** [Bulin Shaqiri
](https://github.com/BShaq)

A Demo video showcasing the features can be found [here](https://1drv.ms/v/s!AvrjnnB8WaSCgc1JA429jQefmCwJGw?e=eJxaWh).

## Installation Guidelines 
To set up and run the code locally, follow the subsequent steps:

### Prerequisites
Before you begin, ensure that you have met the following requirements:
- Node.js v18.13.0
- NPM v8.19.3
- Python 3.x
- pip (included with Python 3.4 and later)
- Nmap
- Redis (using [docker image](https://hub.docker.com/_/redis) recommended)

Be aware that the code has been tested using a MacOS operating system and might not work as expected on Windows

### Installing CERTSec
To install the CERTSec repository, follow these steps:
1. Clone the repository:
    - https://github.com/BShaq/master-thesis.git
2. Navigate into the frontend directory and install dependencies:
    - `cd frontend`
    - `npm install`
3. Navigate into the backend directory:
    - `cd ../backend`
4. Setup Virtual Environment
    - Create a virtual environment:
      - For Linux and macOS: `python3 -m venv venv`
      - For Windows: `py -m venv venv`
      - Replace the second `venv` with your desired name
    - Activate virtual environment:
      - For Linux and macOS: `source venv/bin/activate`
      - For Windows: `venv\Scripts\activate.bat`
5. Install backend dependencies:
    - `pip install -r requirements.txt`

### Env Variables
Since CERTSec leverages external APIs, it is necessary to create a local `.env` file containing the key-value pairs of the corresponding environment variables.

To do so, `.env.template` inside the backend directory can be copy-pasted and renamed accordingly. 
- An API key for the NVD database can be obtained [here](https://nvd.nist.gov/developers/request-an-api-key)
- To obtain an API key for the OpenAI services, you need to [log in](https://auth0.openai.com/u/login/identifier?state=hKFo2SBadGpjblpURFBaQnNLcVViRUV6Ny13WkMydVJVdlpheaFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIE5wV1p4eTVweWZfdlg3OGxqWkRuMmRRbkJoX3RQRUhio2NpZNkgRFJpdnNubTJNdTQyVDNLT3BxZHR3QjNOWXZpSFl6d0Q) with your account and request a key by clicking on `Profile > View API Keys > Create new secret key`

Do the same for the `.env.template` file located at `backend/cve_prioritizer/cve_prioritizer`

### Starting CERTSec
1. Start backend
  - Navigate to the backend directory: `cd backend`
  - Run the following commands:
    - `python manage.py makemigrations`
    - `python manage.py migrate`
    - `python manage.py runserver`
  - Open a second terminal window inside the backend directory:
    - Start Redis if not already done. Use `docker run -d --rm -p 6379:6379 redis` if working with the official redis image 
    - Run `python -m celery -A backend worker -l info` to start Celery and allow background tasks to be processed
2. Start frontend
  - Navigate to the frontend directory: `cd frontend`
  - Run `npm run dev`

## Examples
Under the examples directory, you can find two types of examples:
- `automated-assessment-results` contains JSON files that have been exported from the tool and contain all automated analysis done by CERTSec
- `generated-reports` illustrates the further recommendations that have been generated using ChatGPT




## NVD API Notice
This product uses the NVD API but is not endorsed or certified by the NVD
  
