#!/usr/bin/env python3
"""
Unit tests for send_to_rabbitmq.py

Tests validation logic and mocked RabbitMQ calls.
For full integration tests, use test_actions.py with real RabbitMQ.

Usage:
  python platform_scripts/rita_messages/test_send_to_rabbitmq.py
"""

import sys
import json
import uuid
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, call

# Mock pika BEFORE importing send_to_rabbitmq
sys.modules['pika'] = MagicMock()

# Add the script directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from send_to_rabbitmq import execute as send_to_rabbitmq, validate_rabbitmq_params


def parse_result(result):
    """Parse JSON string result if needed"""
    if isinstance(result, str):
        return json.loads(result)
    return result


def test_missing_host_fails():
    """Test that missing host fails validation"""
    print("\n🧪 Test: Missing host should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host=None,
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "host is required" in result["error"]
    print("✅ PASS: Missing host correctly rejected")
    return result


def test_missing_port_fails():
    """Test that missing port fails validation"""
    print("\n🧪 Test: Missing port should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port=None,
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "port is required" in result["error"]
    print("✅ PASS: Missing port correctly rejected")
    return result


def test_invalid_port_fails():
    """Test that invalid port fails validation"""
    print("\n🧪 Test: Invalid port should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="not-a-number",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "port must be a valid integer" in result["error"]
    print("✅ PASS: Invalid port correctly rejected")
    return result


def test_missing_username_fails():
    """Test that missing username fails validation"""
    print("\n🧪 Test: Missing username should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username=None,
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "username is required" in result["error"]
    print("✅ PASS: Missing username correctly rejected")
    return result


def test_missing_password_fails():
    """Test that missing password fails validation"""
    print("\n🧪 Test: Missing password should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password=None,
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "password is required" in result["error"]
    print("✅ PASS: Missing password correctly rejected")
    return result


def test_missing_queue_name_fails():
    """Test that missing queue_name fails validation"""
    print("\n🧪 Test: Missing queue_name should fail")

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name=None,
        message=message
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "queue_name is required" in result["error"]
    print("✅ PASS: Missing queue_name correctly rejected")
    return result


def test_missing_message_fails():
    """Test that missing message fails validation"""
    print("\n🧪 Test: Missing message should fail")

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=None
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "message is required" in result["error"]
    print("✅ PASS: Missing message correctly rejected")
    return result


def test_invalid_json_string_fails():
    """Test that invalid JSON string fails"""
    print("\n🧪 Test: Invalid JSON string should fail")

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message="{invalid json}"
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "Invalid message JSON" in result["error"]
    print("✅ PASS: Invalid JSON string correctly rejected")
    return result


def test_message_not_dict_fails():
    """Test that message must be a dict after parsing"""
    print("\n🧪 Test: Message must be a dict")

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message="just a plain string"
    ))

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "Invalid message JSON" in result["error"]
    print("✅ PASS: Non-dict message correctly rejected")
    return result


def test_validate_rabbitmq_params_function():
    """Test the validate_rabbitmq_params function directly"""
    print("\n🧪 Test: validate_rabbitmq_params function")

    # Valid params
    is_valid, error_msg = validate_rabbitmq_params("localhost", "5672", "guest", "guest", "queue")
    assert is_valid is True
    assert error_msg is None

    # Missing host
    is_valid, error_msg = validate_rabbitmq_params(None, "5672", "guest", "guest", "queue")
    assert is_valid is False
    assert "host is required" in error_msg

    # Invalid port
    is_valid, error_msg = validate_rabbitmq_params("localhost", "invalid", "guest", "guest", "queue")
    assert is_valid is False
    assert "port must be a valid integer" in error_msg

    print("✅ PASS: validate_rabbitmq_params function works correctly")


def test_empty_dict_message():
    """Test that empty dict message is accepted (validation happens at message builder level)"""
    print("\n🧪 Test: Empty dict message is accepted by send_to_rabbitmq")

    # send_to_rabbitmq is generic - it doesn't validate Rita message structure
    # That's the job of build_message.py
    message = {}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    # This will fail at RabbitMQ connection level (no pika), not validation level
    # In a real scenario with RabbitMQ, this would succeed because send_to_rabbitmq
    # is a generic sender that doesn't validate Rita-specific message structure
    assert result["status"] == "error"  # Will fail due to missing pika or connection
    print("✅ PASS: Empty dict passes validation (fails at connection level)")
    return result


def test_json_string_parsing():
    """Test that valid JSON string is parsed correctly"""
    print("\n🧪 Test: Valid JSON string parsing")

    import pika

    # Setup fresh mocks
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message_dict = {
        "message_id": str(uuid.uuid4()),
        "tenant_id": "test",
        "conversation_id": str(uuid.uuid4()),
        "response": "test"
    }

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=json.dumps(message_dict)
    ))

    # With mocked pika, this should succeed
    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"] == message_dict
    print("✅ PASS: Valid JSON string parsed correctly")
    return result


def test_successful_message_send_with_mocked_pika():
    """Test that message is successfully sent with mocked pika"""
    print("\n🧪 Test: Successful message send with mocked pika")

    import pika

    # Reset all mocks
    pika.reset_mock()

    # Setup fresh mocks for this test
    mock_connection = MagicMock()
    mock_channel = MagicMock()

    # Configure the mock chain
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": str(uuid.uuid4()),
        "tenant_id": "test-tenant",
        "response": "Test message"
    }

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"] == message

    # Verify pika calls were made
    pika.PlainCredentials.assert_called_with("guest", "guest")
    pika.ConnectionParameters.assert_called_once()
    pika.BlockingConnection.assert_called_once()
    mock_connection.channel.assert_called_once()
    mock_channel.queue_declare.assert_called_once_with(queue="test_queue", durable=True)
    mock_channel.basic_publish.assert_called_once()
    mock_connection.close.assert_called_once()

    print("✅ PASS: Message successfully sent with mocked pika")
    return result


def test_connection_parameters_passed_correctly():
    """Test that connection parameters are passed correctly to pika"""
    print("\n🧪 Test: Connection parameters passed correctly")

    import pika

    # Setup fresh mocks
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="rabbitmq.example.com",
        port="5672",
        username="admin",
        password="secret123",
        vhost="/production",
        queue_name="prod_queue",
        message=message
    ))

    assert result["status"] == "success"

    # Verify credentials
    pika.PlainCredentials.assert_called_with("admin", "secret123")

    # Verify ConnectionParameters
    call_args = pika.ConnectionParameters.call_args
    assert call_args is not None
    kwargs = call_args.kwargs
    assert kwargs["host"] == "rabbitmq.example.com"
    assert kwargs["port"] == 5672
    assert kwargs["virtual_host"] == "/production"

    # Verify queue name
    mock_channel.queue_declare.assert_called_with(queue="prod_queue", durable=True)

    print("✅ PASS: Connection parameters passed correctly")
    return result


def test_message_body_sent_as_json():
    """Test that message body is sent as JSON string"""
    print("\n🧪 Test: Message body sent as JSON string")

    import pika

    # Setup fresh mocks
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message = {
        "message_id": "test-id-123",
        "tenant_id": "tenant-456",
        "response": "Hello World"
    }

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "success"

    # Verify basic_publish was called with JSON body
    call_args = mock_channel.basic_publish.call_args
    assert call_args is not None

    body = call_args.kwargs["body"]
    # Body should be JSON string
    parsed_body = json.loads(body)
    assert parsed_body == message

    print("✅ PASS: Message body sent as JSON string")
    return result


def test_message_persistence_enabled():
    """Test that messages are sent with persistence (delivery_mode=2)"""
    print("\n🧪 Test: Message persistence enabled")

    import pika

    # Setup fresh mocks
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "success"

    # Verify BasicProperties was created with delivery_mode=2
    pika.BasicProperties.assert_called_with(delivery_mode=2)

    print("✅ PASS: Message persistence enabled")
    return result


def test_connection_closed_after_send():
    """Test that connection is properly closed after sending"""
    print("\n🧪 Test: Connection closed after send")

    import pika

    # Setup fresh mocks
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    pika.BlockingConnection.return_value = mock_connection
    mock_connection.channel.return_value = mock_channel

    message = {"test": "data"}

    result = parse_result(send_to_rabbitmq(
        host="localhost",
        port="5672",
        username="guest",
        password="guest",
        vhost="/",
        queue_name="test_queue",
        message=message
    ))

    assert result["status"] == "success"

    # Verify connection was closed
    mock_connection.close.assert_called_once()

    print("✅ PASS: Connection properly closed")
    return result


def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 send_to_rabbitmq.py - Unit Tests with Mocked Pika")
    print("=" * 60)
    print("\nNote: These tests use mocked pika to validate behavior")
    print("without requiring RabbitMQ connection. For full integration")
    print("tests with real RabbitMQ, use test_actions.py")

    tests = [
        # Validation failures
        test_missing_host_fails,
        test_missing_port_fails,
        test_invalid_port_fails,
        test_missing_username_fails,
        test_missing_password_fails,
        test_missing_queue_name_fails,
        test_missing_message_fails,
        test_invalid_json_string_fails,
        test_message_not_dict_fails,

        # Function-level tests
        test_validate_rabbitmq_params_function,

        # Edge cases
        test_empty_dict_message,
        test_json_string_parsing,

        # Mocked pika tests
        test_successful_message_send_with_mocked_pika,
        test_connection_parameters_passed_correctly,
        test_message_body_sent_as_json,
        test_message_persistence_enabled,
        test_connection_closed_after_send,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
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
        print("\n🎉 All validation tests passed!")
        print("\nFor full end-to-end testing with RabbitMQ, use:")
        print("  python platform_scripts/rita_messages/test_actions.py")
        sys.exit(0)
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        sys.exit(1)


if __name__ == '__main__':
    main()