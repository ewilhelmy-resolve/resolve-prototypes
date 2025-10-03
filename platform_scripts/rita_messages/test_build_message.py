#!/usr/bin/env python3
"""
Unit tests for build_message.py

Tests all validation logic and message construction scenarios.

Usage:
  python platform_scripts/rita_messages/test_build_message.py
"""

import sys
import json
import uuid
from pathlib import Path

# Add the script directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from build_message import execute as build_message


def test_valid_text_only():
    """Test building a message with text content only"""
    print("\n🧪 Test: Valid text-only message")

    result = build_message(
        text_content="Hello, this is a test message",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"]["response"] == "Hello, this is a test message"
    assert "metadata" not in result["message"]
    print("✅ PASS: Text-only message built successfully")
    return result


def test_valid_reasoning_only():
    """Test building a message with reasoning only"""
    print("\n🧪 Test: Valid reasoning-only message")

    result = build_message(
        text_content=None,
        reasoning_content="Step 1: Analyze\nStep 2: Execute",
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"]["response"] == ""
    assert result["message"]["metadata"]["reasoning"]["content"] == "Step 1: Analyze\nStep 2: Execute"
    assert result["message"]["metadata"]["reasoning"]["state"] == "done"
    print("✅ PASS: Reasoning-only message built successfully")
    return result


def test_valid_sources_only():
    """Test building a message with sources only"""
    print("\n🧪 Test: Valid sources-only message")

    sources = [
        {"url": "https://docs.example.com", "title": "Example Docs"},
        {"url": "https://api.example.com", "title": "API Reference"}
    ]

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=json.dumps(sources),
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"]["metadata"]["sources"] == sources
    print("✅ PASS: Sources-only message built successfully")
    return result


def test_valid_tasks_only():
    """Test building a message with tasks only"""
    print("\n🧪 Test: Valid tasks-only message")

    tasks = [
        {
            "title": "Setup",
            "items": ["Install dependencies", "Configure settings"],
            "defaultOpen": True
        }
    ]

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=None,
        tasks=json.dumps(tasks),
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"]["metadata"]["tasks"] == tasks
    print("✅ PASS: Tasks-only message built successfully")
    return result


def test_valid_complete_message():
    """Test building a complete message with all components"""
    print("\n🧪 Test: Valid complete message with all components")

    sources = [{"url": "https://example.com", "title": "Example"}]
    tasks = [{"title": "Test", "items": ["Item 1"], "defaultOpen": False}]
    group_id = str(uuid.uuid4())

    result = build_message(
        text_content="Complete message with all parts",
        reasoning_content="Reasoning content here",
        sources=json.dumps(sources),
        tasks=json.dumps(tasks),
        response_group_id=group_id,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "success", f"Expected success, got: {result}"
    assert result["message"]["response"] == "Complete message with all parts"
    assert result["message"]["metadata"]["reasoning"]["content"] == "Reasoning content here"
    assert result["message"]["metadata"]["sources"] == sources
    assert result["message"]["metadata"]["tasks"] == tasks
    assert result["message"]["response_group_id"] == group_id
    print("✅ PASS: Complete message built successfully")
    return result


def test_empty_message_fails():
    """Test that building a message with no content fails"""
    print("\n🧪 Test: Empty message should fail")

    result = build_message(
        text_content="",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "at least one of" in result["error"]
    print("✅ PASS: Empty message correctly rejected")
    return result


def test_missing_tenant_id_fails():
    """Test that missing tenant_id fails validation"""
    print("\n🧪 Test: Missing tenant_id should fail")

    result = build_message(
        text_content="Test message",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id=None,
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "tenant_id is required" in result["error"]
    print("✅ PASS: Missing tenant_id correctly rejected")
    return result


def test_missing_message_id_fails():
    """Test that missing message_id fails validation"""
    print("\n🧪 Test: Missing message_id should fail")

    result = build_message(
        text_content="Test message",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=None,
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "message_id is required" in result["error"]
    print("✅ PASS: Missing message_id correctly rejected")
    return result


def test_missing_conversation_id_fails():
    """Test that missing conversation_id fails validation"""
    print("\n🧪 Test: Missing conversation_id should fail")

    result = build_message(
        text_content="Test message",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=None,
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "conversation_id is required" in result["error"]
    print("✅ PASS: Missing conversation_id correctly rejected")
    return result


def test_invalid_response_group_id_fails():
    """Test that invalid response_group_id fails validation"""
    print("\n🧪 Test: Invalid response_group_id should fail")

    result = build_message(
        text_content="Test message",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id="not-a-valid-uuid",
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "response_group_id must be a valid UUID v4" in result["error"]
    print("✅ PASS: Invalid response_group_id correctly rejected")
    return result


def test_invalid_sources_structure_fails():
    """Test that invalid sources structure fails validation"""
    print("\n🧪 Test: Invalid sources structure should fail")

    # Missing 'title' field
    invalid_sources = [{"url": "https://example.com"}]

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=json.dumps(invalid_sources),
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "missing required field 'title'" in result["error"]
    print("✅ PASS: Invalid sources structure correctly rejected")
    return result


def test_invalid_tasks_structure_fails():
    """Test that invalid tasks structure fails validation"""
    print("\n🧪 Test: Invalid tasks structure should fail")

    # Missing 'items' field
    invalid_tasks = [{"title": "Test Task"}]

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=None,
        tasks=json.dumps(invalid_tasks),
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "missing required field 'items'" in result["error"]
    print("✅ PASS: Invalid tasks structure correctly rejected")
    return result


def test_sources_not_a_list_fails():
    """Test that sources must be a list"""
    print("\n🧪 Test: Sources must be a list")

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=json.dumps({"url": "https://example.com", "title": "Example"}),
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "sources must be a list" in result["error"]
    print("✅ PASS: Non-list sources correctly rejected")
    return result


def test_tasks_not_a_list_fails():
    """Test that tasks must be a list"""
    print("\n🧪 Test: Tasks must be a list")

    result = build_message(
        text_content=None,
        reasoning_content=None,
        sources=None,
        tasks=json.dumps({"title": "Test", "items": ["Item 1"]}),
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "tasks must be a list" in result["error"]
    print("✅ PASS: Non-list tasks correctly rejected")
    return result


def test_whitespace_only_text_fails():
    """Test that whitespace-only text content is treated as empty"""
    print("\n🧪 Test: Whitespace-only text should fail")

    result = build_message(
        text_content="   \n\t  ",
        reasoning_content=None,
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id="test-tenant",
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
        turn_complete=None
    )

    assert result["status"] == "error", f"Expected error, got: {result}"
    assert "at least one of" in result["error"]
    print("✅ PASS: Whitespace-only text correctly rejected")
    return result


def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 build_message.py - Unit Tests")
    print("=" * 60)

    tests = [
        # Valid scenarios
        test_valid_text_only,
        test_valid_reasoning_only,
        test_valid_sources_only,
        test_valid_tasks_only,
        test_valid_complete_message,

        # Validation failures
        test_empty_message_fails,
        test_missing_tenant_id_fails,
        test_missing_message_id_fails,
        test_missing_conversation_id_fails,
        test_invalid_response_group_id_fails,
        test_invalid_sources_structure_fails,
        test_invalid_tasks_structure_fails,
        test_sources_not_a_list_fails,
        test_tasks_not_a_list_fails,
        test_whitespace_only_text_fails,
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
        sys.exit(0)
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        sys.exit(1)


if __name__ == '__main__':
    main()