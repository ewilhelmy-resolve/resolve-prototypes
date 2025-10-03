"""
Rita Message Builder Activity

Builds a Rita message payload without sending it to RabbitMQ.
Use send_to_rabbitmq.py to send the built message, or use the all-in-one actions for convenience.

Inputs (execute signature):
 - text_content: string (OPTIONAL) - Main response text
 - reasoning_content: string (OPTIONAL) - Step-by-step analysis content
 - sources: string or list (OPTIONAL) - JSON string or list of {url: str, title: str, snippet?: str}
   Example: '[{"url": "https://docs.example.com", "title": "Documentation", "snippet": "Brief content preview"}]'
   Note: snippet field is optional and provides a preview of the source content
 - tasks: string or list (OPTIONAL) - JSON string or list of {title: str, items: list[str], defaultOpen: bool}
   Example: '[{"title": "Setup", "items": ["Install dependencies", "Configure"], "defaultOpen": true}]'
 - response_group_id: string (OPTIONAL) - UUID to group with other messages
 - turn_complete: boolean (OPTIONAL) - UI hint to indicate turn completion
   true = this is the last message in the turn, false/undefined = more messages coming
   Used to control loading spinners and "AI is typing..." indicators
 - tenant_id: string (REQUIRED) - Tenant identifier
 - message_id: string (REQUIRED) - User message ID (provided by workflow as parameter)
 - conversation_id: string (REQUIRED) - Conversation identifier

Return: JSON-serializable dict with status and message payload.

Note on turn_complete:
  - For single-message responses: set to true or omit
  - For multi-part responses: set to false for all parts except the last
  - The last message in a response group should have turn_complete=true
  - To use turn_complete, add it to the RabbitMQ message metadata directly:
    message["metadata"]["turn_complete"] = true/false
  - This field is a UI hint only and not validated by this builder
"""

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


def execute(text_content,reasoning_content,sources,tasks,response_group_id,tenant_id,message_id,conversation_id,turn_complete):
    """
    Build a Rita message payload without sending to RabbitMQ.
    Returns the message structure for use with send_to_rabbitmq.py or other purposes.
    """
    try:
        # Handle default values
        text_content = text_content or ""
        reasoning_content = reasoning_content if reasoning_content else None
        sources = sources if sources else None
        tasks = tasks if tasks else None
        response_group_id = response_group_id if response_group_id else None
        turn_complete = turn_complete if turn_complete is not None else None

        # Validate response_group_id format
        is_valid, error_msg = validate_response_group_id(response_group_id)
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

        # Add metadata if not empty
        if metadata:
            message["metadata"] = metadata

        # Add response_group_id if provided
        if response_group_id:
            message["response_group_id"] = response_group_id

        return json.dumps({
            "status": "success",
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })