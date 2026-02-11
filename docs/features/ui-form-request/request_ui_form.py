"""
UI Form Request Activity

Send a UI form request to RITA chat iframe via RabbitMQ.
Connection via rabbitmq_url (parsed by pika.URLParameters), no hardcoded creds.

Inputs (must match JSON activitySettings keys in order):
 - rabbitmq_url: RabbitMQ connection URL (amqp:// or amqps://)
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

QUEUE_NAME = "chat.responses"


def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        globals()[package] = __import__(package)
    else:
        globals()[package] = sys.modules[package]


def execute(rabbitmq_url, tenant_id, conversation_id, user_id, ui_schema, interrupt):
    try:
        # Validate rabbitmq_url
        if not rabbitmq_url or not rabbitmq_url.strip():
            return {"status": "error", "error": "rabbitmq_url is required"}
        rabbitmq_url = rabbitmq_url.strip()
        if not (rabbitmq_url.startswith('amqp://') or rabbitmq_url.startswith('amqps://')):
            return {"status": "error", "error": "rabbitmq_url must start with amqp:// or amqps://"}

        # Parse ui_schema
        if isinstance(ui_schema, str):
            ui_schema = ui_schema.strip().lstrip('\ufeff')
            if ui_schema.startswith('"') and ui_schema.endswith('"'):
                ui_schema = json.loads(ui_schema)  # unwrap double-encoded string
            if isinstance(ui_schema, str):
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

        connection = pika.BlockingConnection(
            pika.URLParameters(rabbitmq_url)
        )
        channel = connection.channel()

        # Passive declare - queue already exists with custom args
        channel.queue_declare(queue=QUEUE_NAME, passive=True)

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
            routing_key=QUEUE_NAME,
            body=message_body,
            properties=properties
        )

        channel.close()
        connection.close()

        return {
            "status": "success",
            "message": "UI Form Request sent",
            "message_id": message_id,
            "queue": QUEUE_NAME,
            "bytes_sent": len(message_body),
            "body_sent": body_obj
        }

    except json.JSONDecodeError as e:
        return {"status": "error", "error": "Invalid ui_schema JSON: " + str(e), "error_type": "JSONDecodeError"}
    except Exception as e:
        return {"status": "error", "error": str(e), "error_type": type(e).__name__}
