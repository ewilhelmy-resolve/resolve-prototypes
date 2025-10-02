"""
Rita Text Message Activity

Sends a simple text-only message to Rita via RabbitMQ.

Inputs (execute signature):
 - host: string (REQUIRED) - RabbitMQ host
 - port: string (REQUIRED) - RabbitMQ port (converted to int)
 - username: string (REQUIRED) - RabbitMQ username
 - password: string (REQUIRED) - RabbitMQ password
 - vhost: string (OPTIONAL) - RabbitMQ virtual host (default: "/")
 - queue_name: string (REQUIRED) - Name of the queue
 - text_content: string (REQUIRED) - Markdown-formatted text content
 - response_group_id: string (OPTIONAL) - UUID to group with other messages
 - tenant_id: string (REQUIRED) - Tenant identifier
 - message_id: string (REQUIRED) - User message ID (provided by workflow as parameter)
 - conversation_id: string (REQUIRED) - Conversation identifier

Return: JSON-serializable dict with status.
"""

import sys
import json
import uuid


def validate_response_group_id(response_group_id):
    """Validate response_group_id is a valid UUID v4 if provided. Returns (is_valid, error_message)."""
    if response_group_id:
        try:
            # Try to parse as UUID and verify it's valid
            uuid_obj = uuid.UUID(response_group_id, version=4)
            # Verify the string representation matches (catches invalid format)
            if str(uuid_obj) != response_group_id.lower():
                return False, "response_group_id must be a valid UUID v4"
        except (ValueError, AttributeError, TypeError):
            return False, "response_group_id must be a valid UUID v4"
    return True, None


def validate_rabbitmq_params(host, port, username, password, queue_name):
    """Validate RabbitMQ connection parameters. Returns (is_valid, error_message)."""
    if not host:
        return False, "host is required"
    if not port:
        return False, "port is required"
    if not username:
        return False, "username is required"
    if not password:
        return False, "password is required"
    if not queue_name:
        return False, "queue_name is required"

    # Validate port is a valid integer
    try:
        int(port)
    except (ValueError, TypeError):
        return False, "port must be a valid integer"

    return True, None


def validate_required_params(tenant_id, message_id, conversation_id):
    """Validate required parameters. Returns (is_valid, error_message)."""
    if not tenant_id:
        return False, "tenant_id is required"
    if not message_id:
        return False, "message_id is required"
    if not conversation_id:
        return False, "conversation_id is required"
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


def send_to_rabbitmq(message_body, host, port, username, password, vhost, queue_name):
    """
    Helper function to send a single message to RabbitMQ.
    """
    import pika
    import ssl

    port_int = int(port)
    credentials = pika.PlainCredentials(username, password)
    virtual_host = vhost if vhost else "/"
    ssl_options = pika.SSLOptions(ssl.create_default_context())

    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=host,
            port=port_int,
            credentials=credentials,
            virtual_host=virtual_host,
#             ssl_options=ssl_options
        )
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


def execute(host,port,username,password,vhost,queue_name,text_content,response_group_id,tenant_id,message_id,conversation_id):
    """
    Send a simple text message to Rita.
    """
    try:
        # Handle default values
        response_group_id = response_group_id if response_group_id else None

        # Validate response_group_id format
        is_valid, error_msg = validate_response_group_id(response_group_id)
        if not is_valid:
            return {"status": "error", "error": f"Validation failed: {error_msg}"}

        # Validate RabbitMQ parameters
        is_valid, error_msg = validate_rabbitmq_params(host, port, username, password, queue_name)
        if not is_valid:
            return {"status": "error", "error": f"Validation failed: {error_msg}"}

        # Validate message parameters
        is_valid, error_msg = validate_required_params(tenant_id, message_id, conversation_id)
        if not is_valid:
            return {"status": "error", "error": f"Validation failed: {error_msg}"}

        if not text_content or not text_content.strip():
            return {"status": "error", "error": "Validation failed: text_content is required"}

        # Install pika if needed
        install_and_import('pika')

        # Build message payload
        message = {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "tenant_id": tenant_id,
            "response": text_content
        }

        # Add response_group_id if provided
        if response_group_id:
            message["response_group_id"] = response_group_id

        # Send to RabbitMQ
        send_to_rabbitmq(message, host, port, username, password, vhost, queue_name)

        return {
            "status": "success",
            "message_id": message_id,
            "message": message
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }