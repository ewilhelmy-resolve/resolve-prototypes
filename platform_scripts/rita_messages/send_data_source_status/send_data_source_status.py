"""
Data Source Status Activity

Sends data source status updates (sync or verification) to Rita via RabbitMQ.

Inputs (execute signature):
 - rabbitmq_url: string (REQUIRED) - RabbitMQ connection URL
   Format: amqp://username:password@host:port/vhost or amqps://username:password@host:port/vhost
 - queue_name: string (REQUIRED) - Name of the queue (typically 'data_source_status')
 - message_type: string (REQUIRED) - Type of message: 'sync' or 'verification'
 - connection_id: string (REQUIRED) - Data source connection ID
 - tenant_id: string (REQUIRED) - Tenant identifier
 - status: string (REQUIRED) - Status value
   For sync: 'sync_started', 'sync_completed', 'sync_failed'
   For verification: 'success', 'failed'
 - error_message: string (OPTIONAL) - Error message (for sync failures)
 - documents_processed: int (OPTIONAL) - Number of documents processed (for sync_completed)
 - verification_options: string (OPTIONAL) - JSON string of verification options (for verification success)
 - verification_error: string (OPTIONAL) - Verification error message (for verification failed)

Return: JSON-serializable dict with status and message details.
"""

import sys
import json
from datetime import datetime, timezone


def validate_rabbitmq_url(rabbitmq_url, queue_name):
    """Validate RabbitMQ connection URL and queue name. Returns (is_valid, error_message)."""
    if not rabbitmq_url:
        return False, "rabbitmq_url is required"
    if not queue_name:
        return False, "queue_name is required"

    # Basic URL format validation
    if not (rabbitmq_url.startswith('amqp://') or rabbitmq_url.startswith('amqps://')):
        return False, "rabbitmq_url must start with 'amqp://' or 'amqps://'"

    return True, None


def validate_sync_message(connection_id, tenant_id, status, error_message, documents_processed):
    """Validate sync message parameters. Returns (is_valid, error_message)."""
    if not connection_id:
        return False, "connection_id is required"
    if not tenant_id:
        return False, "tenant_id is required"
    if not status:
        return False, "status is required"

    valid_statuses = ['sync_started', 'sync_completed', 'sync_failed']
    if status not in valid_statuses:
        return False, f"status must be one of: {', '.join(valid_statuses)}"

    if status == 'sync_completed' and documents_processed is not None:
        try:
            documents_processed = int(documents_processed)
            if documents_processed < 0:
                return False, "documents_processed must be >= 0"
        except (ValueError, TypeError):
            return False, "documents_processed must be a valid integer"

    return True, None


def validate_verification_message(connection_id, tenant_id, status, verification_options, verification_error):
    """Validate verification message parameters. Returns (is_valid, error_message)."""
    if not connection_id:
        return False, "connection_id is required"
    if not tenant_id:
        return False, "tenant_id is required"
    if not status:
        return False, "status is required"

    valid_statuses = ['success', 'failed']
    if status not in valid_statuses:
        return False, f"status must be one of: {', '.join(valid_statuses)}"

    # Validate verification_options JSON if provided (can be object or array)
    if verification_options:
        try:
            parsed_options = json.loads(verification_options) if isinstance(verification_options, str) else verification_options
            if not isinstance(parsed_options, (dict, list)):
                return False, "verification_options must be a JSON object or array"
        except json.JSONDecodeError as e:
            return False, f"verification_options JSON parsing error: {str(e)}"

    return True, None


def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        globals()[package] = __import__(package)
    else:
        globals()[package] = sys.modules[package]


def send_to_rabbitmq(message_body, rabbitmq_url, queue_name):
    """
    Helper function to send a single message to RabbitMQ using URL parameters.
    """
    import pika

    # Use URLParameters to parse the RabbitMQ URL
    connection = pika.BlockingConnection(
        pika.URLParameters(rabbitmq_url)
    )
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=json.dumps(message_body),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Make message persistent
        )
    )
    connection.close()


def execute(rabbitmq_url, queue_name, message_type, connection_id, tenant_id, status, error_message, documents_processed, verification_options, verification_error):
    """
    Send a data source status message to RabbitMQ.
    """
    try:
        # Handle default values
        message_type = message_type.strip() if message_type else None
        connection_id = connection_id.strip() if connection_id else None
        tenant_id = tenant_id.strip() if tenant_id else None
        status = status.strip() if status else None
        error_message = error_message.strip() if error_message else None
        verification_error = verification_error.strip() if verification_error else None
        verification_options = verification_options if verification_options else None

        # Convert documents_processed to int if provided
        if documents_processed is not None and documents_processed != "":
            try:
                documents_processed = int(documents_processed)
            except (ValueError, TypeError):
                return json.dumps({"status": "error", "error": "documents_processed must be a valid integer"})
        else:
            documents_processed = None

        # Validate RabbitMQ URL
        is_valid, error_msg = validate_rabbitmq_url(rabbitmq_url, queue_name)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate message_type
        if not message_type or message_type not in ['sync', 'verification']:
            return json.dumps({"status": "error", "error": "message_type must be 'sync' or 'verification'"})

        # Initialize message variable
        message = {}

        # Build message based on type
        if message_type == 'sync':
            # Validate sync parameters
            is_valid, error_msg = validate_sync_message(connection_id, tenant_id, status, error_message, documents_processed)
            if not is_valid:
                return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

            # Build sync message
            message = {
                "type": "sync",
                "connection_id": connection_id,
                "tenant_id": tenant_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Add optional fields
            if error_message:
                message["error_message"] = error_message
            if documents_processed is not None:
                message["documents_processed"] = documents_processed

        elif message_type == 'verification':
            # Auto-determine status based on error field
            # If verification_error is provided, it's a failure; otherwise it's success
            if not status or status == "":
                if verification_error:
                    status = "failed"
                else:
                    status = "success"

            # Validate verification parameters
            is_valid, error_msg = validate_verification_message(connection_id, tenant_id, status, verification_options, verification_error)
            if not is_valid:
                return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

            # Build verification message
            message = {
                "type": "verification",
                "connection_id": connection_id,
                "tenant_id": tenant_id,
                "status": status,
                "options": None,
                "error": None
            }

            # Add optional fields
            if verification_options:
                # Parse verification_options if it's a string
                if isinstance(verification_options, str):
                    message["options"] = json.loads(verification_options)
                else:
                    message["options"] = verification_options

            if verification_error:
                message["error"] = verification_error

        # Install pika if needed
        install_and_import('pika')

        # Send to RabbitMQ
        send_to_rabbitmq(message, rabbitmq_url, queue_name)

        return json.dumps({
            "status": "success",
            "message_type": message_type,
            "connection_id": connection_id,
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })