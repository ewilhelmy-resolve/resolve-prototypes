"""
RabbitMQ Sender Activity

Sends a pre-built message payload to RabbitMQ.
Use build_message.py to construct Rita messages, or provide your own message structure.

Inputs (execute signature):
 - host: string (REQUIRED) - RabbitMQ host
 - port: string (REQUIRED) - RabbitMQ port (converted to int)
 - username: string (REQUIRED) - RabbitMQ username
 - password: string (REQUIRED) - RabbitMQ password
 - vhost: string (OPTIONAL) - RabbitMQ virtual host (default: "/")
 - queue_name: string (REQUIRED) - Name of the queue
 - message: string or dict (REQUIRED) - Message payload (JSON string or dict)

Return: JSON-serializable dict with status.
"""

import sys
import json


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


def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        globals()[package] = __import__(package)
    else:
        globals()[package] = sys.modules[package]


def send_message(message_body, host, port, username, password, vhost, queue_name):
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


def execute(host,port,username,password,vhost,queue_name,message):
    """
    Send a message to RabbitMQ.
    Accepts any message payload - use build_message.py for Rita-specific message construction.
    """
    try:
        # Validate RabbitMQ parameters
        is_valid, error_msg = validate_rabbitmq_params(host, port, username, password, queue_name)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate message
        if not message:
            return json.dumps({"status": "error", "error": "Validation failed: message is required"})

        # Parse message if it's a string
        if isinstance(message, str):
            try:
                message = json.loads(message)
            except json.JSONDecodeError as e:
                return json.dumps({"status": "error", "error": f"Invalid message JSON: {str(e)}"})

        if not isinstance(message, dict):
            return json.dumps({"status": "error", "error": "Validation failed: message must be a JSON object"})

        # Install pika if needed
        install_and_import('pika')

        # Send to RabbitMQ
        send_message(message, host, port, username, password, vhost, queue_name)

        return json.dumps({
            "status": "success",
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })