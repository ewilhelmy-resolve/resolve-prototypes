#!/usr/bin/env python3
"""
Unit tests for send_complete_message.py

Tests validation logic and mocked RabbitMQ calls for the complete message action.
For full integration tests, use test_actions.py with real RabbitMQ.

Usage:
  python platform_scripts/rita_messages/test_send_complete_message.py
"""

import sys
import json
import uuid
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, call

# Mock pika BEFORE importing send_complete_message
sys.modules['pika'] = MagicMock()

# Add the script directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from send_complete_message import execute as send_complete_message


# ============================================================================
# Helper Functions
# ============================================================================

def parse_result(result):
    """Parse JSON string result if needed"""
    if isinstance(result, str):
        return json.loads(result)
    return result


# ============================================================================
# Validation Tests - Required Parameters
# ============================================================================

def test_missing_rabbitmq_url_fails():
    """Test that missing rabbitmq_url fails validation"""
    print("\n🧪 Test: Missing rabbitmq_url should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url=None,
        queue_name="test_queue",
        text_content="Test",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "rabbitmq_url is required" in result["error"]
    print("✅ PASS: Missing rabbitmq_url correctly rejected")
    return result


def test_missing_tenant_id_fails():
    """Test that missing tenant_id fails validation"""
    print("\n🧪 Test: Missing tenant_id should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id=None,
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "tenant_id is required" in result["error"]
    print("✅ PASS: Missing tenant_id correctly rejected")
    return result


def test_missing_message_id_fails():
    """Test that missing message_id fails validation"""
    print("\n🧪 Test: Missing message_id should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=None,
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "message_id is required" in result["error"]
    print("✅ PASS: Missing message_id correctly rejected")
    return result


def test_missing_conversation_id_fails():
    """Test that missing conversation_id fails validation"""
    print("\n🧪 Test: Missing conversation_id should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=None,
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "conversation_id is required" in result["error"]
    print("✅ PASS: Missing conversation_id correctly rejected")
    return result


# ============================================================================
# Validation Tests - Content Requirements
# ============================================================================

def test_empty_message_fails():
    """Test that message with no content fails validation"""
    print("\n🧪 Test: Empty message should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "at least one of" in result["error"]
    print("✅ PASS: Empty message correctly rejected")
    return result


def test_whitespace_only_text_fails():
    """Test that whitespace-only text is treated as empty"""
    print("\n🧪 Test: Whitespace-only text should fail")

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="   \n\t  ",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "at least one of" in result["error"]
    print("✅ PASS: Whitespace-only text correctly rejected")
    return result


# ============================================================================
# Validation Tests - Invalid Data Structures
# ============================================================================

def test_invalid_response_group_id_fails():
    """Test that invalid response_group_id fails validation"""
    print("\n🧪 Test: Invalid response_group_id should fail")

    import pika
    pika.reset_mock()

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id="not-a-valid-uuid",
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "response_group_id must be a valid UUID v4" in result["error"]
    print("✅ PASS: Invalid response_group_id correctly rejected")
    return result


def test_invalid_sources_structure_fails():
    """Test that invalid sources structure fails validation"""
    print("\n🧪 Test: Invalid sources structure should fail")

    # Missing 'title' field
    invalid_sources = [{"url": "https://example.com"}]

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=json.dumps(invalid_sources),
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "missing required field 'title'" in result["error"]
    print("✅ PASS: Invalid sources structure correctly rejected")
    return result


def test_invalid_tasks_structure_fails():
    """Test that invalid tasks structure fails validation"""
    print("\n🧪 Test: Invalid tasks structure should fail")

    # Missing 'items' field
    invalid_tasks = [{"title": "Test Task"}]

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=json.dumps(invalid_tasks),
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "error"
    assert "missing required field 'items'" in result["error"]
    print("✅ PASS: Invalid tasks structure correctly rejected")
    return result


# ============================================================================
# Successful Message Sending Tests
# ============================================================================

def test_text_only_message_success():
    """Test sending a text-only message"""
    print("\n🧪 Test: Text-only message success")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Hello, this is a test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["response"] == "Hello, this is a test message"
    assert "metadata" not in result["message"]

    # Verify RabbitMQ calls
    mock_channel.basic_publish.assert_called_once()
    mock_connection.close.assert_called_once()

    print("✅ PASS: Text-only message sent successfully")
    return result


def test_reasoning_only_message_success():
    """Test sending a reasoning-only message"""
    print("\n🧪 Test: Reasoning-only message success")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content=None,
        reasoning_content="Step 1: Analyze\nStep 2: Execute",
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["response"] == ""
    assert result["message"]["metadata"]["reasoning"]["content"] == "Step 1: Analyze\nStep 2: Execute"
    assert result["message"]["metadata"]["reasoning"]["state"] == "done"

    print("✅ PASS: Reasoning-only message sent successfully")
    return result


def test_sources_only_message_success():
    """Test sending a sources-only message"""
    print("\n🧪 Test: Sources-only message success")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    sources = [
        {"url": "https://docs.example.com", "title": "Example Docs"},
        {"url": "https://api.example.com", "title": "API Reference"}
    ]

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=json.dumps(sources),
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["metadata"]["sources"] == sources

    print("✅ PASS: Sources-only message sent successfully")
    return result


def test_tasks_only_message_success():
    """Test sending a tasks-only message"""
    print("\n🧪 Test: Tasks-only message success")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    tasks = [
        {
            "title": "Setup",
            "items": ["Install dependencies", "Configure settings"],
            "defaultOpen": True
        }
    ]

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=json.dumps(tasks),
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["metadata"]["tasks"] == tasks

    print("✅ PASS: Tasks-only message sent successfully")
    return result


def test_complete_message_with_all_components():
    """Test sending a complete message with all components"""
    print("\n🧪 Test: Complete message with all components")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    sources = [{"url": "https://example.com", "title": "Example"}]
    tasks = [{"title": "Test", "items": ["Item 1"], "defaultOpen": False}]
    group_id = str(uuid.uuid4())

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Complete message with all parts",
        reasoning_content="Reasoning content here",
        reasoning_title=None,
        sources=json.dumps(sources),
        tasks=json.dumps(tasks),
        response_group_id=group_id,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["response"] == "Complete message with all parts"
    assert result["message"]["metadata"]["reasoning"]["content"] == "Reasoning content here"
    assert result["message"]["metadata"]["sources"] == sources
    assert result["message"]["metadata"]["tasks"] == tasks
    assert result["message"]["response_group_id"] == group_id

    print("✅ PASS: Complete message sent successfully")
    return result


# ============================================================================
# RabbitMQ Behavior Tests
# ============================================================================

def test_message_body_sent_as_json():
    """Test that message body is sent as JSON string"""
    print("\n🧪 Test: Message body sent as JSON string")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message_id = str(uuid.uuid4())
    tenant_id = "test-tenant"
    conversation_id = str(uuid.uuid4())

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id=tenant_id,
        message_id=message_id,
        conversation_id=conversation_id,
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"

    # Verify basic_publish was called with JSON body
    call_args = mock_channel.basic_publish.call_args
    body = call_args.kwargs["body"]
    parsed_body = json.loads(body)

    assert parsed_body["message_id"] == message_id
    assert parsed_body["tenant_id"] == tenant_id
    assert parsed_body["conversation_id"] == conversation_id
    assert parsed_body["response"] == "Test message"

    print("✅ PASS: Message body sent as JSON string")
    return result


def test_message_persistence_enabled():
    """Test that messages are sent with persistence"""
    print("\n🧪 Test: Message persistence enabled")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"

    # Verify BasicProperties was created with delivery_mode=2
    pika.BasicProperties.assert_called_with(delivery_mode=2)

    print("✅ PASS: Message persistence enabled")
    return result


def test_queue_declared_as_durable():
    """Test that queue is declared as durable"""
    print("\n🧪 Test: Queue declared as durable")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"

    # Verify queue declared as durable
    mock_channel.queue_declare.assert_called_once_with(queue="test_queue", durable=True)

    print("✅ PASS: Queue declared as durable")
    return result


def test_connection_closed_after_send():
    """Test that connection is properly closed"""
    print("\n🧪 Test: Connection closed after send")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result["status"] == "success"

    # Verify connection was closed
    mock_connection.close.assert_called_once()

    print("✅ PASS: Connection properly closed")
    return result


def test_turn_complete_in_metadata():
    """Test that turn_complete is included in metadata when provided"""
    print("\n🧪 Test: turn_complete field in metadata")

    import pika
    pika.reset_mock()

    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    # Test with turn_complete=True
    result = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=True,
        citation_variant=None
    ))

    assert result["status"] == "success"
    assert result["message"]["metadata"]["turn_complete"] == True

    # Test with turn_complete=False
    result2 = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=False,
        citation_variant=None
    ))

    assert result2["status"] == "success"
    assert result2["message"]["metadata"]["turn_complete"] == False

    # Test with turn_complete=None (should not be in metadata)
    result3 = parse_result(send_complete_message(
        rabbitmq_url="amqp://guest:guest@localhost:5672/",
        queue_name="test_queue",
        text_content="Test message",
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None,
        citation_variant=None
    ))

    assert result3["status"] == "success"
    assert "turn_complete" not in result3["message"].get("metadata", {})

    print("✅ PASS: turn_complete field handled correctly in metadata")
    return result


def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 send_complete_message.py - Unit Tests")
    print("=" * 60)
    print("\nNote: These tests use mocked pika to validate behavior")
    print("without requiring RabbitMQ connection. For full integration")
    print("tests with real RabbitMQ, use test_actions.py")

    tests = [
        # Validation - Required parameters
        test_missing_rabbitmq_url_fails,
        test_missing_tenant_id_fails,
        test_missing_message_id_fails,
        test_missing_conversation_id_fails,

        # Validation - Content requirements
        test_empty_message_fails,
        test_whitespace_only_text_fails,

        # Validation - Invalid data structures
        test_invalid_response_group_id_fails,
        test_invalid_sources_structure_fails,
        test_invalid_tasks_structure_fails,

        # Successful message sending
        test_text_only_message_success,
        test_reasoning_only_message_success,
        test_sources_only_message_success,
        test_tasks_only_message_success,
        test_complete_message_with_all_components,

        # RabbitMQ behavior
        test_message_body_sent_as_json,
        test_message_persistence_enabled,
        test_queue_declared_as_durable,
        test_connection_closed_after_send,

        # turn_complete field tests
        test_turn_complete_in_metadata,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            result = test_func()
            # Parse result if it's a JSON string
            if result and isinstance(result, str):
                result = parse_result(result)
            passed += 1
        except AssertionError as e:
            print(f"❌ FAIL: {test_func.__name__}")
            print(f"   Error: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ ERROR: {test_func.__name__}")
            print(f"   Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    # Print summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"Total tests: {len(tests)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print("=" * 60)

    if failed == 0:
        print("\n🎉 All tests passed!")
        print("\nFor full end-to-end testing with RabbitMQ, use:")
        print("  python platform_scripts/rita_messages/test_actions.py")
        sys.exit(0)
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        sys.exit(1)


if __name__ == '__main__':
    main()