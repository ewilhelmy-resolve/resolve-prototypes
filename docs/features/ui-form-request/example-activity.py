"""
UI Form Request Activity - Example Python code for Platform

Sends a UI form request to RITA chat iframe via RabbitMQ.
"""

import sys
import os
import json
import uuid

def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        globals()[package] = __import__(package)
    else:
        globals()[package] = sys.modules[package]

def execute(tenant_id, conversation_id, user_id, ui_schema, interrupt=True):
    """
    Send a UI form request to RITA chat iframe.

    Args:
        tenant_id: Target tenant
        conversation_id: Target conversation
        user_id: Target user's Valkey userGuid
        ui_schema: JSON string or dict with form definition
        interrupt: If True, modal opens immediately (default True)

    Returns:
        dict with status and message_id
    """
    try:
        host = os.environ.get('RABBITMQ_HOST')
        port = os.environ.get('RABBITMQ_PORT', '5671')
        username = os.environ.get('RABBITMQ_USERNAME')
        password = os.environ.get('RABBITMQ_PASSWORD')
        vhost = os.environ.get('RABBITMQ_VHOST', '/')

        if not host:
            return {"status": "error", "error": "RABBITMQ_HOST not set"}
        if not username:
            return {"status": "error", "error": "RABBITMQ_USERNAME not set"}
        if not password:
            return {"status": "error", "error": "RABBITMQ_PASSWORD not set"}

        port_int = int(port)

        if isinstance(ui_schema, str):
            ui_schema_obj = json.loads(ui_schema)
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

        install_and_import('pika')
        pika = globals().get('pika')

        credentials = pika.PlainCredentials(username, password)

        import ssl
        ssl_options = pika.SSLOptions(ssl.create_default_context())
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=host,
                port=port_int,
                credentials=credentials,
                virtual_host=vhost,
                ssl_options=ssl_options
            )
        )
        channel = connection.channel()

        queue_name = "chat.requests"
        channel.queue_declare(queue=queue_name, durable=True)

        message_body = json.dumps({
            "tenant_id": tenant_id,
            "message_id": message_id,
            "response": json.dumps(inner_message),
            "conversation_id": conversation_id
        })

        channel.basic_publish(exchange='', routing_key=queue_name, body=message_body)
        connection.close()

        return {
            "status": "success",
            "message": "UI Form Request sent",
            "message_id": message_id
        }

    except json.JSONDecodeError as e:
        return {"status": "error", "error": f"Invalid ui_schema JSON: {str(e)}"}
    except Exception as e:
        return {"status": "error", "error": str(e)}
