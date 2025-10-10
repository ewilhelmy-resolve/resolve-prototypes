"""
Rita Complete Message Activity

Sends a comprehensive message with all available components (reasoning, text, sources, tasks) to Rita via RabbitMQ.

Inputs (execute signature):
 - rabbitmq_url: string (REQUIRED) - RabbitMQ connection URL
   Format: amqp://username:password@host:port/vhost or amqps://username:password@host:port/vhost
   Example: amqps://user:pass@rabbitmq.example.com:5671/my-vhost
 - queue_name: string (REQUIRED) - Name of the queue
 - text_content: string (OPTIONAL) - Main response text
 - reasoning_content: string (OPTIONAL) - Step-by-step analysis content
 - reasoning_title: string (OPTIONAL) - Custom title for reasoning section
   Examples: "Research & Analysis", "Planning", "Investigation"
   Default: "Thinking" (if not provided in UI)
 - sources: string or list (OPTIONAL) - JSON string or list of source objects
   Format: {url: str, title: str, snippet?: str, blob_id?: str}
   Example: '[{"url": "https://docs.example.com", "title": "Documentation", "snippet": "Brief preview", "blob_id": "blob-123"}]'
   Fields:
   - url (required): Source URL or blob reference
   - title (required): Display title for the source
   - snippet (optional): Content preview/excerpt (200-300 chars recommended)
   - blob_id (optional): Reference to uploaded document in blob storage
 - tasks: string or list (OPTIONAL) - JSON string or list of task objects
   Format: {title: str, items: list[str], defaultOpen?: bool}
   Example: '[{"title": "Setup", "items": ["Install dependencies", "Configure"], "defaultOpen": true}]'
 - response_group_id: string (OPTIONAL) - UUID v4 to group related messages
 - tenant_id: string (REQUIRED) - Tenant identifier
 - message_id: string (REQUIRED) - User message ID (provided by workflow as parameter)
 - conversation_id: string (REQUIRED) - Conversation identifier
 - turn_complete: boolean (OPTIONAL) - UI hint to signal if this is the last message in a turn
   Set to true for the final message, false for intermediate messages
 - citation_variant: string (OPTIONAL) - Controls how citations are displayed in the UI
   Options: 'hover-card' (default), 'modal', 'right-panel', 'collapsible-list', 'inline'

Return: JSON-serializable dict with status and message details.
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


def validate_parameters(tenant_id, message_id, conversation_id, sources=None, tasks=None):
    """
    Validate required parameters and data structures.
    Returns (is_valid, error_message).
    """
    # Validate required parameters
    if not tenant_id:
        return False, "tenant_id is required"

    if not message_id:
        return False, "message_id is required"

    if not conversation_id:
        return False, "conversation_id is required"

    # Validate sources structure if provided
    if sources:
        try:
            sources_list = json.loads(sources) if isinstance(sources, str) else sources
            if not isinstance(sources_list, list):
                return False, "sources must be a list"

            for idx, source in enumerate(sources_list):
                if not isinstance(source, dict):
                    return False, f"sources[{idx}] must be an object"
                if "url" not in source:
                    return False, f"sources[{idx}] missing required field 'url'"
                if "title" not in source:
                    return False, f"sources[{idx}] missing required field 'title'"
        except json.JSONDecodeError as e:
            return False, f"sources JSON parsing error: {str(e)}"

    # Validate tasks structure if provided
    if tasks:
        try:
            tasks_list = json.loads(tasks) if isinstance(tasks, str) else tasks
            if not isinstance(tasks_list, list):
                return False, "tasks must be a list"

            for idx, task in enumerate(tasks_list):
                if not isinstance(task, dict):
                    return False, f"tasks[{idx}] must be an object"
                if "title" not in task:
                    return False, f"tasks[{idx}] missing required field 'title'"
                if "items" not in task:
                    return False, f"tasks[{idx}] missing required field 'items'"
                if not isinstance(task["items"], list):
                    return False, f"tasks[{idx}].items must be a list"
                if "defaultOpen" in task and not isinstance(task["defaultOpen"], bool):
                    return False, f"tasks[{idx}].defaultOpen must be a boolean"
        except json.JSONDecodeError as e:
            return False, f"tasks JSON parsing error: {str(e)}"

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


def execute(rabbitmq_url,queue_name,text_content,reasoning_content,reasoning_title,sources,tasks,response_group_id,tenant_id,message_id,conversation_id,turn_complete,citation_variant):
    """
    Send a complete Rita message with all optional components.
    """
    try:
        # Handle default values
        text_content = text_content or ""
        reasoning_content = reasoning_content if reasoning_content else None
        reasoning_title = reasoning_title if reasoning_title else None
        sources = sources if sources else None
        tasks = tasks if tasks else None
        response_group_id = response_group_id if response_group_id else None

        # Convert turn_complete from string to boolean if needed
        if turn_complete is not None and turn_complete != "":
            if isinstance(turn_complete, str):
                turn_complete = turn_complete.lower() in ('true', '1', 'yes')
            else:
                turn_complete = bool(turn_complete)
        else:
            turn_complete = None

        citation_variant = citation_variant if citation_variant else None

        # Validate response_group_id format
        is_valid, error_msg = validate_response_group_id(response_group_id)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate RabbitMQ URL
        is_valid, error_msg = validate_rabbitmq_url(rabbitmq_url, queue_name)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate message parameters
        is_valid, error_msg = validate_parameters(tenant_id, message_id, conversation_id, sources, tasks)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate that at least one content component is provided
        has_content = (
            (text_content and text_content.strip()) or
            reasoning_content or
            sources or
            tasks
        )
        if not has_content:
            return json.dumps({"status": "error", "error": "Validation failed: at least one of text_content, reasoning_content, sources, or tasks is required"})

        # Install pika if needed
        install_and_import('pika')

        # Build base message
        message = {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "tenant_id": tenant_id,
            "response": text_content
        }

        # Build metadata if any components provided
        metadata = {}

        if reasoning_content:
            metadata["reasoning"] = {
                "content": reasoning_content,
                "state": "done"
            }
            # Add title if provided
            if reasoning_title:
                metadata["reasoning"]["title"] = reasoning_title

        if sources:
            # Parse sources if it's a string
            if isinstance(sources, str):
                sources = json.loads(sources)
            metadata["sources"] = sources

        if tasks:
            # Parse tasks if it's a string
            if isinstance(tasks, str):
                tasks = json.loads(tasks)
            metadata["tasks"] = tasks

        # Add turn_complete to metadata if provided
        if turn_complete is not None:
            metadata["turn_complete"] = turn_complete

        # Add citation_variant to metadata if provided
        if citation_variant is not None:
            metadata["citation_variant"] = citation_variant

        # Add metadata if not empty
        if metadata:
            message["metadata"] = metadata

        # Add response_group_id if provided
        if response_group_id:
            message["response_group_id"] = response_group_id

        # Send to RabbitMQ
        send_to_rabbitmq(message, rabbitmq_url, queue_name)

        return json.dumps({
            "status": "success",
            "message_id": message_id,
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })