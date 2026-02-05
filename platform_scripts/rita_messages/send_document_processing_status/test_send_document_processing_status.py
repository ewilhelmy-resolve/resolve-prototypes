#!/usr/bin/env python3
"""
Test script for send_document_processing_status.py activity.

This script tests the document processing status activity with various scenarios.
"""

import json
import sys
from send_document_processing_status import execute


def test_successful_processing():
    """Test successful document processing message."""
    print("\n" + "="*80)
    print("TEST 1: Successful Document Processing")
    print("="*80)

    result = execute(
        rabbitmq_url="amqp://guest:guest@localhost:5672",
        queue_name="document_processing_status",
        blob_metadata_id="b2542342-7353-4c59-8d90-a19042f44421",
        tenant_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-123",
        status="processing_completed",
        processed_markdown="# Test Document\n\nThis is the extracted content.",
        error_message=""
    )

    parsed_result = json.loads(result)
    print(json.dumps(parsed_result, indent=2))

    if parsed_result.get("status") == "success":
        print("✅ TEST PASSED: Successful processing message sent")
        return True
    else:
        print("❌ TEST FAILED:", parsed_result.get("error"))
        return False


def test_failed_processing():
    """Test failed document processing message."""
    print("\n" + "="*80)
    print("TEST 2: Failed Document Processing")
    print("="*80)

    result = execute(
        rabbitmq_url="amqp://guest:guest@localhost:5672",
        queue_name="document_processing_status",
        blob_metadata_id="b2542342-7353-4c59-8d90-a19042f44421",
        tenant_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-123",
        status="processing_failed",
        processed_markdown="",
        error_message="Unable to parse PDF: Corrupted file header"
    )

    parsed_result = json.loads(result)
    print(json.dumps(parsed_result, indent=2))

    if parsed_result.get("status") == "success":
        print("✅ TEST PASSED: Failed processing message sent")
        return True
    else:
        print("❌ TEST FAILED:", parsed_result.get("error"))
        return False


def test_missing_required_field():
    """Test validation with missing required field."""
    print("\n" + "="*80)
    print("TEST 3: Missing Required Field (blob_metadata_id)")
    print("="*80)

    result = execute(
        rabbitmq_url="amqp://guest:guest@localhost:5672",
        queue_name="document_processing_status",
        blob_metadata_id="",  # Missing required field
        tenant_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-123",
        status="processing_completed",
        processed_markdown="Test content",
        error_message=""
    )

    parsed_result = json.loads(result)
    print(json.dumps(parsed_result, indent=2))

    if parsed_result.get("status") == "error":
        print("✅ TEST PASSED: Validation correctly rejected missing field")
        return True
    else:
        print("❌ TEST FAILED: Should have rejected missing blob_metadata_id")
        return False


def test_invalid_status():
    """Test validation with invalid status."""
    print("\n" + "="*80)
    print("TEST 4: Invalid Status Value")
    print("="*80)

    result = execute(
        rabbitmq_url="amqp://guest:guest@localhost:5672",
        queue_name="document_processing_status",
        blob_metadata_id="b2542342-7353-4c59-8d90-a19042f44421",
        tenant_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-123",
        status="invalid_status",  # Invalid status
        processed_markdown="Test content",
        error_message=""
    )

    parsed_result = json.loads(result)
    print(json.dumps(parsed_result, indent=2))

    if parsed_result.get("status") == "error":
        print("✅ TEST PASSED: Validation correctly rejected invalid status")
        return True
    else:
        print("❌ TEST FAILED: Should have rejected invalid status")
        return False


def test_without_user_id():
    """Test processing without user_id (system processing)."""
    print("\n" + "="*80)
    print("TEST 5: Processing Without User ID (System)")
    print("="*80)

    result = execute(
        rabbitmq_url="amqp://guest:guest@localhost:5672",
        queue_name="document_processing_status",
        blob_metadata_id="b2542342-7353-4c59-8d90-a19042f44421",
        tenant_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="",  # No user_id (system processing)
        status="processing_completed",
        processed_markdown="# System Processed Document\n\nContent",
        error_message=""
    )

    parsed_result = json.loads(result)
    print(json.dumps(parsed_result, indent=2))

    if parsed_result.get("status") == "success":
        print("✅ TEST PASSED: Processing without user_id succeeded")
        return True
    else:
        print("❌ TEST FAILED:", parsed_result.get("error"))
        return False


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("DOCUMENT PROCESSING STATUS ACTIVITY TESTS")
    print("="*80)
    print("\nPrerequisites:")
    print("- RabbitMQ running on localhost:5672")
    print("- Credentials: guest/guest")
    print("- Queue: document_processing_status (will be auto-created)")

    tests = [
        test_successful_processing,
        test_failed_processing,
        test_missing_required_field,
        test_invalid_status,
        test_without_user_id
    ]

    results = []
    for test_func in tests:
        try:
            passed = test_func()
            results.append(passed)
        except Exception as e:
            print(f"\n❌ TEST EXCEPTION: {test_func.__name__}")
            print(f"   Error: {str(e)}")
            results.append(False)

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed_count = sum(results)
    total_count = len(results)
    print(f"Passed: {passed_count}/{total_count}")

    if passed_count == total_count:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ {total_count - passed_count} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()