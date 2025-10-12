"""
Document Processing Status Activity

Sends document processing status updates to Rita via RabbitMQ.

Inputs (execute signature):
 - rabbitmq_url: string (REQUIRED) - RabbitMQ connection URL
   Format: amqp://username:password@host:port/vhost or amqps://username:password@host:port/vhost
 - queue_name: string (REQUIRED) - Name of the queue (typically 'document_processing_status')
 - blob_metadata_id: string (REQUIRED) - UUID of blob_metadata record
 - tenant_id: string (REQUIRED) - Tenant/Organization identifier
 - user_id: string (OPTIONAL) - User ID who uploaded the document
 - status: string (REQUIRED) - Processing status
   Values: 'processing_completed', 'processing_failed'
 - processed_markdown: string (OPTIONAL) - Extracted markdown content (for processing_completed)
 - error_message: string (OPTIONAL) - Error message (for processing_failed)

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


def validate_message(blob_metadata_id, tenant_id, status):
    """Validate document processing message parameters. Returns (is_valid, error_message)."""
    if not blob_metadata_id:
        return False, "blob_metadata_id is required"
    if not tenant_id:
        return False, "tenant_id is required"
    if not status:
        return False, "status is required"

    valid_statuses = ['processing_completed', 'processing_failed']
    if status not in valid_statuses:
        return False, f"status must be one of: {', '.join(valid_statuses)}"

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


def execute(rabbitmq_url,queue_name,blob_metadata_id,tenant_id,user_id,status,processed_markdown,error_message):
    """
    Send a document processing status message to RabbitMQ.
    """
    try:
        # Handle default values and strip whitespace
        blob_metadata_id = blob_metadata_id.strip() if blob_metadata_id else None
        tenant_id = tenant_id.strip() if tenant_id else None
        user_id = user_id.strip() if user_id else None
        status = status.strip() if status else None
        processed_markdown = processed_markdown.strip() if processed_markdown else None
        error_message = error_message.strip() if error_message else None

        # Validate RabbitMQ URL
        is_valid, error_msg = validate_rabbitmq_url(rabbitmq_url, queue_name)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate message parameters
        is_valid, error_msg = validate_message(blob_metadata_id, tenant_id, status)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Build message
        message = {
            "type": "document_processing",
            "blob_metadata_id": blob_metadata_id,
            "tenant_id": tenant_id,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields
        if user_id:
            message["user_id"] = user_id
        if processed_markdown:
            message["processed_markdown"] = processed_markdown
        if error_message:
            message["error_message"] = error_message

        # Install pika if needed
        install_and_import('pika')

        # Send to RabbitMQ
        send_to_rabbitmq(message, rabbitmq_url, queue_name)

        return json.dumps({
            "status": "success",
            "blob_metadata_id": blob_metadata_id,
            "processing_status": status,
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })
