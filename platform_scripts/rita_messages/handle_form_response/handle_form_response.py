"""
Handle Form Response Activity

Receives webhook form response data from RITA iframe and prints field values.
No RabbitMQ needed — this activity just processes incoming webhook data.

Inputs (must match JSON activitySettings keys in order):
 - request_id: Form request UUID (REQUIRED)
 - status: "submitted" or "cancelled" (REQUIRED)
 - form_action: Submit action name from modal
 - form_data: JSON string of field values (REQUIRED)
 - tenant_id: Tenant identifier
 - user_id: User identifier
 - workflow_id: Workflow identifier
 - activity_id: Activity identifier

Return: JSON-serializable dict with status and parsed form data.
"""

import sys
import json

# --- FIX: avoid UnicodeEncodeError on Windows cp1252 consoles ---
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
# --------------------------------------------------------------


def execute(request_id, status, form_action, form_data, tenant_id, user_id, workflow_id, activity_id):
    try:
        # Validate required params
        if not request_id:
            return {"status": "error", "error": "request_id is required"}
        if not status:
            return {"status": "error", "error": "status is required"}

        print(f"=== Form Response: {request_id} ===")
        print(f"Status: {status}")
        print(f"Tenant: {tenant_id}")

        if user_id:
            print(f"User: {user_id}")
        if workflow_id:
            print(f"Workflow: {workflow_id}")
        if activity_id:
            print(f"Activity: {activity_id}")

        # Handle cancelled submissions
        if status == "cancelled":
            print("Form was cancelled by user.")
            return {
                "status": "success",
                "request_id": request_id,
                "form_status": "cancelled",
                "message": "Form cancelled by user"
            }

        # Parse form data
        if form_action:
            print(f"Form Action: {form_action}")

        if not form_data:
            return {"status": "error", "error": "form_data is required for submitted forms"}

        if isinstance(form_data, str):
            parsed_data = json.loads(form_data)
        else:
            parsed_data = form_data

        if not isinstance(parsed_data, dict):
            return {"status": "error", "error": "form_data must be a JSON object"}

        # Print each field
        print(f"\n--- Form Fields ({len(parsed_data)} fields) ---")
        for name, value in parsed_data.items():
            print(f"  Field: {name} = {value}")

        print(f"\n=== End Form Response ===")

        return {
            "status": "success",
            "request_id": request_id,
            "form_status": status,
            "form_action": form_action or None,
            "field_count": len(parsed_data),
            "fields": parsed_data
        }

    except json.JSONDecodeError as e:
        return {"status": "error", "error": "Invalid form_data JSON: " + str(e), "error_type": "JSONDecodeError"}
    except Exception as e:
        return {"status": "error", "error": str(e), "error_type": type(e).__name__}
