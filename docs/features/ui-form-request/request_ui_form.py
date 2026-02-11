"""
UI Form Request Activity

Send a UI form request to RITA chat iframe via RabbitMQ.
Connection details hardcoded (same staging RabbitMQ as other activities).

Inputs (must match JSON activitySettings keys in order):
 - tenant_id: Target tenant
 - conversation_id: Target conversation
 - user_id: Target user's Valkey userGuid
 - ui_schema: JSON string with form definition
 - interrupt: Open modal immediately

Return: JSON dict with status and message_id
"""

import sys
import json
import uuid

# --- FIX: avoid UnicodeEncodeError on Windows cp1252 consoles ---
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
# --------------------------------------------------------------


def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        globals()[package] = __import__(package)
    else:
        globals()[package] = sys.modules[package]


# RabbitMQ connection (staging)
MQ_HOST = "b-a5618860-509b-4e36-97bd-39d02589a4d2.mq.us-east-1.amazonaws.com"
MQ_PORT = 5671
MQ_USERNAME = "expressmq"
MQ_PASSWORD = "1Q!Vm@3p00fx"
MQ_VHOST = "onboarding"
MQ_QUEUE = "chat.responses"


def execute(tenant_id, conversation_id, user_id, ui_schema, interrupt):
    try:
        # DEBUG: print raw value to see what platform passes
        print("DEBUG ui_schema type:", type(ui_schema).__name__)
        print("DEBUG ui_schema repr:", repr(ui_schema[:300]) if isinstance(ui_schema, str) else repr(ui_schema))
        print("DEBUG ui_schema first 5 chars:", [ui_schema[i] for i in range(min(5, len(ui_schema)))] if isinstance(ui_schema, str) else "N/A")

        if isinstance(ui_schema, str):
            # Strip BOM, leading/trailing whitespace and wrapping quotes
            ui_schema = ui_schema.strip().lstrip('\ufeff')
            if ui_schema.startswith('"') and ui_schema.endswith('"'):
                ui_schema = json.loads(ui_schema)  # unwrap double-encoded string
            if isinstance(ui_schema, str):
                # Remove real newlines/carriage returns/tabs — they're just whitespace
                ui_schema = ui_schema.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
                ui_schema_obj = json.loads(ui_schema)
            else:
                ui_schema_obj = ui_schema
        else:
            ui_schema_obj = ui_schema

        if isinstance(interrupt, bool):
            interrupt_bool = interrupt
        else:
            interrupt_bool = str(interrupt).lower() in ("true", "1", "yes")

        message_id = str(uuid.uuid4())

        inner_message = {
            "type": "ui_form_request",
            "user_id": user_id,
            "interrupt": interrupt_bool,
            "ui_schema": ui_schema_obj
        }

        install_and_import("pika")
        pika = globals().get("pika")

        credentials = pika.PlainCredentials(MQ_USERNAME, MQ_PASSWORD)

        import ssl
        ssl_options = pika.SSLOptions(ssl.create_default_context())

        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=MQ_HOST,
                port=MQ_PORT,
                credentials=credentials,
                virtual_host=MQ_VHOST,
                ssl_options=ssl_options
            )
        )
        channel = connection.channel()

        # Passive declare - queue already exists with custom args
        channel.queue_declare(queue=MQ_QUEUE, passive=True)

        inner_json = json.dumps(inner_message, ensure_ascii=False)

        body_obj = {
            "tenant_id": tenant_id,
            "message_id": message_id,
            "response": inner_json,
            "conversation_id": conversation_id
        }
        message_body = json.dumps(body_obj, ensure_ascii=False)

        properties = pika.BasicProperties(
            content_type="application/json",
            content_encoding="utf-8",
            delivery_mode=2,
            headers={
                "tenant_id": tenant_id,
                "message_id": message_id,
                "conversation_id": conversation_id
            }
        )

        channel.basic_publish(
            exchange="",
            routing_key=MQ_QUEUE,
            body=message_body,
            properties=properties
        )

        channel.close()
        connection.close()

        return {
            "status": "success",
            "message": "UI Form Request sent",
            "message_id": message_id,
            "queue": MQ_QUEUE,
            "bytes_sent": len(message_body),
            "body_sent": body_obj
        }

    except json.JSONDecodeError as e:
        return {"status": "error", "error": "Invalid ui_schema JSON: " + str(e), "error_type": "JSONDecodeError"}
    except Exception as e:
        return {"status": "error", "error": str(e), "error_type": type(e).__name__}
