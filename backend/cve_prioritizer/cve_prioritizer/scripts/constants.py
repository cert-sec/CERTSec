#!/usr/bin/env python3

__author__ = "Mario Rojas"
__license__ = "BSD 3-clause"
__version__ = "1.3.0"
__maintainer__ = "Mario Rojas"
__status__ = "Production"

SIMPLE_HEADER = f"{'CVE-ID':<18}Priority" + "\n" + ("-" * 30)
VERBOSE_HEADER = (
    f"{'CVE-ID':<18}{'PRIORITY':<13}{'EPSS':<9}{'CVSS':<6}{'VERSION':<10}{'SEVERITY':<10}CISA_KEV"
    + "\n"
    + ("-" * 75)
)
EPSS_URL = "https://api.first.org/data/v1/epss"
NIST_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
LOGO = (
    """
#    ______   ______                         
#   / ___/ | / / __/                         
#  / /__ | |/ / _/                           
#  \___/_|___/___/        _ __  _            
#    / _ \____(_)__  ____(_) /_(_)__ ___ ____
#   / ___/ __/ / _ \/ __/ / __/ /_ // -_) __/
#  /_/  /_/ /_/\___/_/ /_/\__/_//__/\__/_/   
#  v1.3.0                          BY TURROKS
                                                  
"""
    ""
)
