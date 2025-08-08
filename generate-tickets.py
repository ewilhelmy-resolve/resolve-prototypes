#!/usr/bin/env python3
"""
Generate realistic ITSM ticket data for testing
"""

import csv
import random
import datetime
import os
import zipfile
from datetime import timedelta

# Common IT issues and their details
ISSUES = {
    "Password Reset": {
        "categories": ["Access Management", "Account Issues"],
        "priorities": ["Low", "Medium"],
        "descriptions": [
            "User unable to login - password expired",
            "Password reset request for user account",
            "Account locked after multiple failed attempts",
            "Forgot password - need immediate reset",
            "Password expired, unable to access email",
            "Account locked out - too many attempts",
            "Need password reset for VPN access",
            "Cannot remember password after vacation"
        ],
        "resolution_time": (5, 30),  # minutes
        "teams": ["Service Desk", "Identity Management"]
    },
    "Software Installation": {
        "categories": ["Software", "Application Support"],
        "priorities": ["Medium", "Low"],
        "descriptions": [
            "Request to install Microsoft Office",
            "Need Adobe Creative Suite installed",
            "Install Zoom for video conferencing",
            "Chrome browser installation required",
            "Request for Visual Studio Code",
            "Need Python development environment",
            "Install Slack desktop application",
            "Request for project management software"
        ],
        "resolution_time": (30, 120),
        "teams": ["Desktop Support", "Software Management"]
    },
    "Hardware Request": {
        "categories": ["Hardware", "Equipment"],
        "priorities": ["Medium", "High"],
        "descriptions": [
            "New laptop needed for new employee",
            "Monitor replacement - display flickering",
            "Keyboard not working properly",
            "Mouse replacement request",
            "Need additional monitor for dual setup",
            "Laptop battery not holding charge",
            "Webcam needed for remote meetings",
            "Docking station request for home office"
        ],
        "resolution_time": (60, 2880),  # up to 2 days
        "teams": ["Hardware Support", "Procurement"]
    },
    "Network Issues": {
        "categories": ["Network", "Connectivity"],
        "priorities": ["High", "Critical"],
        "descriptions": [
            "Cannot connect to WiFi network",
            "VPN connection dropping frequently",
            "Slow internet connection in office",
            "Unable to access shared drives",
            "Network printer not responding",
            "Cannot access company intranet",
            "Intermittent connection drops",
            "Unable to join video calls - network issues"
        ],
        "resolution_time": (15, 180),
        "teams": ["Network Operations", "Infrastructure"]
    },
    "Email Problems": {
        "categories": ["Email", "Communication"],
        "priorities": ["Medium", "High"],
        "descriptions": [
            "Not receiving emails from external senders",
            "Email client not syncing properly",
            "Outlook crashes when opening attachments",
            "Cannot send emails with attachments",
            "Email quota exceeded warning",
            "Lost important emails after update",
            "Calendar synchronization issues",
            "Distribution list not working"
        ],
        "resolution_time": (20, 120),
        "teams": ["Email Admin", "Service Desk"]
    },
    "Application Error": {
        "categories": ["Application Support", "Software"],
        "priorities": ["Medium", "High", "Critical"],
        "descriptions": [
            "SAP system showing error on login",
            "CRM application crashes frequently",
            "Database connection timeout errors",
            "Excel macros not working after update",
            "SharePoint site not loading",
            "Teams meeting audio not working",
            "Application running very slowly",
            "Getting error 500 on web application"
        ],
        "resolution_time": (30, 240),
        "teams": ["Application Support", "Development Team"]
    },
    "Access Request": {
        "categories": ["Access Management", "Security"],
        "priorities": ["Low", "Medium"],
        "descriptions": [
            "Need access to shared folder",
            "Request admin rights for software installation",
            "New employee system access setup",
            "Access to project repository required",
            "VPN access for remote work",
            "SharePoint site access needed",
            "Database read access request",
            "Access to financial systems required"
        ],
        "resolution_time": (60, 1440),  # up to 1 day
        "teams": ["Security Team", "Access Management"]
    },
    "Printer Issues": {
        "categories": ["Hardware", "Peripherals"],
        "priorities": ["Low", "Medium"],
        "descriptions": [
            "Printer not printing - shows offline",
            "Paper jam in printer on 3rd floor",
            "Print jobs stuck in queue",
            "Printer driver needs updating",
            "Cannot connect to network printer",
            "Print quality very poor",
            "Printer out of toner",
            "Need printer access configuration"
        ],
        "resolution_time": (15, 90),
        "teams": ["Service Desk", "Facilities"]
    },
    "Mobile Device": {
        "categories": ["Mobile", "BYOD"],
        "priorities": ["Medium"],
        "descriptions": [
            "Cannot configure email on iPhone",
            "Company apps not installing on Android",
            "Mobile device management enrollment issue",
            "Lost company mobile phone",
            "Need mobile hotspot configured",
            "Two-factor authentication app issues",
            "Cannot access company data on mobile",
            "Mobile device compliance error"
        ],
        "resolution_time": (30, 180),
        "teams": ["Mobile Support", "Security Team"]
    },
    "Security Incident": {
        "categories": ["Security", "Incident"],
        "priorities": ["High", "Critical"],
        "descriptions": [
            "Suspicious email received - possible phishing",
            "Ransomware warning on workstation",
            "Unauthorized access attempt detected",
            "Lost laptop with company data",
            "Security software blocking legitimate site",
            "Suspicious files found on system",
            "Account may be compromised",
            "Data leak suspected"
        ],
        "resolution_time": (10, 480),
        "teams": ["Security Team", "Incident Response"]
    }
}

# User names and locations
FIRST_NAMES = ["John", "Jane", "Michael", "Sarah", "David", "Emma", "James", "Lisa", "Robert", "Maria",
               "William", "Jennifer", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Susan", "Charles", "Jessica",
               "Christopher", "Amy", "Daniel", "Ashley", "Matthew", "Kimberly", "Andrew", "Donna", "Paul", "Michelle"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
              "Anderson", "Taylor", "Wilson", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
              "Clark", "Lewis", "Robinson", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Lopez"]

LOCATIONS = ["New York - HQ", "San Francisco - Branch", "Chicago - Regional", "Austin - Tech Hub", 
             "Boston - Finance", "Seattle - Development", "Miami - Sales", "Denver - Operations",
             "Atlanta - Support", "Los Angeles - Marketing", "Remote - Home Office", "London - EMEA",
             "Toronto - Canada", "Sydney - APAC", "Tokyo - Japan", "Berlin - Germany"]

DEPARTMENTS = ["IT", "Finance", "HR", "Sales", "Marketing", "Operations", "Legal", "R&D", 
               "Customer Service", "Engineering", "Product", "Accounting", "Procurement", "Admin"]

# Statuses with realistic distribution
STATUS_WEIGHTS = {
    "Closed": 65,
    "Resolved": 15,
    "Open": 10,
    "In Progress": 7,
    "Pending": 2,
    "On Hold": 1
}

def generate_ticket_id(index):
    """Generate ticket ID in format INC0001234"""
    return f"INC{index:07d}"

def generate_user():
    """Generate a random user"""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    email = f"{first.lower()}.{last.lower()}@company.com"
    return {
        "name": f"{first} {last}",
        "email": email,
        "department": random.choice(DEPARTMENTS),
        "location": random.choice(LOCATIONS)
    }

def weighted_choice(choices):
    """Make a weighted random choice"""
    total = sum(choices.values())
    r = random.uniform(0, total)
    upto = 0
    for choice, weight in choices.items():
        if upto + weight >= r:
            return choice
        upto += weight
    return list(choices.keys())[-1]

def generate_ticket(index, start_date, end_date):
    """Generate a single ticket"""
    issue_type = random.choice(list(ISSUES.keys()))
    issue_config = ISSUES[issue_type]
    
    # Create ticket
    created_date = start_date + timedelta(
        seconds=random.randint(0, int((end_date - start_date).total_seconds()))
    )
    
    # Generate user info
    requester = generate_user()
    assignee = generate_user() if random.random() > 0.1 else None  # 10% unassigned
    
    # Ticket details
    status = weighted_choice(STATUS_WEIGHTS)
    priority = random.choice(issue_config["priorities"])
    category = random.choice(issue_config["categories"])
    description = random.choice(issue_config["descriptions"])
    team = random.choice(issue_config["teams"])
    
    # Resolution details
    resolved_date = None
    resolution_notes = None
    resolution_time_minutes = None
    
    if status in ["Closed", "Resolved"]:
        min_time, max_time = issue_config["resolution_time"]
        resolution_time_minutes = random.randint(min_time, max_time)
        resolved_date = created_date + timedelta(minutes=resolution_time_minutes)
        
        resolution_templates = [
            f"Issue resolved by resetting user credentials",
            f"Completed {issue_type.lower()} as requested",
            f"Fixed by updating configuration settings",
            f"Resolved after applying latest patches",
            f"Issue resolved by restarting services",
            f"Completed request per standard procedure",
            f"Resolved by granting appropriate permissions",
            f"Fixed after troubleshooting with user"
        ]
        resolution_notes = random.choice(resolution_templates)
    
    # SLA calculation
    sla_target = {
        "Critical": 2,
        "High": 4,
        "Medium": 8,
        "Low": 24
    }
    
    sla_hours = sla_target.get(priority, 24)
    sla_due = created_date + timedelta(hours=sla_hours)
    sla_breached = "No"
    
    if resolved_date and resolved_date > sla_due:
        sla_breached = "Yes"
    elif status in ["Open", "In Progress", "Pending", "On Hold"] and datetime.datetime.now() > sla_due:
        sla_breached = "Yes"
    
    # Additional fields
    tags = []
    if "password" in description.lower():
        tags.append("password-reset")
    if "urgent" in description.lower() or priority == "Critical":
        tags.append("urgent")
    if "new employee" in description.lower():
        tags.append("onboarding")
    if team == "Security Team":
        tags.append("security")
        
    ticket = {
        "ticket_id": generate_ticket_id(index),
        "title": issue_type,
        "description": description,
        "status": status,
        "priority": priority,
        "category": category,
        "subcategory": issue_type,
        "requester_name": requester["name"],
        "requester_email": requester["email"],
        "requester_department": requester["department"],
        "requester_location": requester["location"],
        "assignee_name": assignee["name"] if assignee else "",
        "assignee_email": assignee["email"] if assignee else "",
        "assigned_team": team,
        "created_at": created_date.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": (created_date + timedelta(minutes=random.randint(5, 60))).strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": resolved_date.strftime("%Y-%m-%d %H:%M:%S") if resolved_date else "",
        "closed_at": resolved_date.strftime("%Y-%m-%d %H:%M:%S") if status == "Closed" and resolved_date else "",
        "sla_due": sla_due.strftime("%Y-%m-%d %H:%M:%S"),
        "sla_breached": sla_breached,
        "resolution_time_minutes": resolution_time_minutes if resolution_time_minutes else "",
        "resolution_notes": resolution_notes if resolution_notes else "",
        "source": random.choice(["Email", "Portal", "Phone", "Chat", "Walk-in", "API"]),
        "impact": random.choice(["1-Extensive", "2-Significant", "3-Moderate", "4-Minor"]),
        "urgency": random.choice(["1-Critical", "2-High", "3-Medium", "4-Low"]),
        "tags": ";".join(tags),
        "customer_satisfaction": random.choice(["5-Very Satisfied", "4-Satisfied", "3-Neutral", "", ""]) if status == "Closed" else "",
        "reopened": random.choice(["No", "No", "No", "No", "Yes"]),  # 20% reopened
        "related_incidents": f"INC{random.randint(1000000, 9999999)}" if random.random() > 0.8 else "",
        "knowledge_article": f"KB{random.randint(10000, 99999)}" if random.random() > 0.7 else ""
    }
    
    return ticket

def main():
    """Generate 1000 tickets and save to CSV"""
    # Create test-data directory
    os.makedirs("/mnt/c/Dev/resolve-onboarding/test-data", exist_ok=True)
    
    # Date range for tickets (last 90 days)
    end_date = datetime.datetime.now()
    start_date = end_date - timedelta(days=90)
    
    # Generate tickets
    tickets = []
    for i in range(1, 1001):
        ticket = generate_ticket(i, start_date, end_date)
        tickets.append(ticket)
    
    # Sort by created date
    tickets.sort(key=lambda x: x["created_at"])
    
    # Write to CSV
    csv_file = "/mnt/c/Dev/resolve-onboarding/test-data/itsm_tickets_1000.csv"
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        if tickets:
            writer = csv.DictWriter(f, fieldnames=tickets[0].keys())
            writer.writeheader()
            writer.writerows(tickets)
    
    print(f"Generated {len(tickets)} tickets in {csv_file}")
    
    # Create zip file
    zip_file = "/mnt/c/Dev/resolve-onboarding/test-data/itsm_tickets_1000.zip"
    with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(csv_file, "itsm_tickets_1000.csv")
    
    print(f"Created zip file: {zip_file}")
    
    # Print summary statistics
    status_counts = {}
    priority_counts = {}
    category_counts = {}
    
    for ticket in tickets:
        status_counts[ticket["status"]] = status_counts.get(ticket["status"], 0) + 1
        priority_counts[ticket["priority"]] = priority_counts.get(ticket["priority"], 0) + 1
        category_counts[ticket["category"]] = category_counts.get(ticket["category"], 0) + 1
    
    print("\n=== Ticket Statistics ===")
    print("\nStatus Distribution:")
    for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {status}: {count} ({count/10:.1f}%)")
    
    print("\nPriority Distribution:")
    for priority, count in sorted(priority_counts.items()):
        print(f"  {priority}: {count} ({count/10:.1f}%)")
    
    print("\nTop Categories:")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {category}: {count} ({count/10:.1f}%)")

if __name__ == "__main__":
    main()