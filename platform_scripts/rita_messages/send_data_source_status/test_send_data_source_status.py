#!/usr/bin/env python3
"""
Unit tests for send_data_source_status.py

Tests all message types (sync and verification) with various status combinations.
"""

import unittest
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add the script directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

# Import the module to test
from send_data_source_status import (
    execute as send_data_source_status,
    validate_rabbitmq_url,
    validate_sync_message,
    validate_verification_message
)


class TestDataSourceStatus(unittest.TestCase):
    """Test data source status message sending"""

    def setUp(self):
        """Set up test fixtures"""
        self.rabbitmq_url = "amqp://guest:guest@localhost:5672/"
        self.queue_name = "data_source_status"
        self.connection_id = "conn-123"
        self.tenant_id = "tenant-456"

    # ==================== Validation Tests ====================

    def test_validate_rabbitmq_url_success(self):
        """Test valid RabbitMQ URL"""
        is_valid, error = validate_rabbitmq_url("amqp://localhost:5672", "test_queue")
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_rabbitmq_url_missing_url(self):
        """Test missing RabbitMQ URL"""
        is_valid, error = validate_rabbitmq_url("", "test_queue")
        self.assertFalse(is_valid)
        self.assertEqual(error, "rabbitmq_url is required")

    def test_validate_rabbitmq_url_invalid_protocol(self):
        """Test invalid protocol"""
        is_valid, error = validate_rabbitmq_url("http://localhost:5672", "test_queue")
        self.assertFalse(is_valid)
        self.assertIn("amqp://", error)

    def test_validate_sync_message_success(self):
        """Test valid sync message"""
        is_valid, error = validate_sync_message("conn-123", "tenant-456", "sync_started", None, None)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_sync_message_invalid_status(self):
        """Test invalid sync status"""
        is_valid, error = validate_sync_message("conn-123", "tenant-456", "invalid_status", None, None)
        self.assertFalse(is_valid)
        self.assertIn("must be one of", error)

    def test_validate_verification_message_success(self):
        """Test valid verification message"""
        is_valid, error = validate_verification_message("conn-123", "tenant-456", "success", None, None)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_verification_message_invalid_status(self):
        """Test invalid verification status"""
        is_valid, error = validate_verification_message("conn-123", "tenant-456", "invalid", None, None)
        self.assertFalse(is_valid)
        self.assertIn("must be one of", error)

    # ==================== Sync Message Tests ====================

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_sync_started_message(self, mock_send):
        """Test sending sync_started message"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="sync",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_started",
            error_message=None,
            documents_processed=None,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message_type"], "sync")
        self.assertEqual(result_data["message"]["type"], "sync")
        self.assertEqual(result_data["message"]["status"], "sync_started")
        self.assertEqual(result_data["message"]["connection_id"], self.connection_id)
        self.assertIn("timestamp", result_data["message"])

        # Verify RabbitMQ was called
        mock_send.assert_called_once()

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_sync_completed_message(self, mock_send):
        """Test sending sync_completed message with documents_processed"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="sync",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_completed",
            error_message=None,
            documents_processed=150,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["status"], "sync_completed")
        self.assertEqual(result_data["message"]["documents_processed"], 150)
        self.assertNotIn("error_message", result_data["message"])

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_sync_failed_message(self, mock_send):
        """Test sending sync_failed message with error"""
        error_msg = "Connection timeout"
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="sync",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_failed",
            error_message=error_msg,
            documents_processed=None,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["status"], "sync_failed")
        self.assertEqual(result_data["message"]["error_message"], error_msg)
        self.assertNotIn("documents_processed", result_data["message"])

    # ==================== Verification Message Tests ====================

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_verification_success_message(self, mock_send):
        """Test sending verification success message with options"""
        options = {"channels": ["general", "random"], "users": ["john", "jane"]}
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="verification",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="success",
            error_message=None,
            documents_processed=None,
            verification_options=json.dumps(options),
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message_type"], "verification")
        self.assertEqual(result_data["message"]["type"], "verification")
        self.assertEqual(result_data["message"]["status"], "success")
        self.assertEqual(result_data["message"]["options"], options)
        self.assertIsNone(result_data["message"]["error"])

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_verification_success_with_array_options(self, mock_send):
        """Test verification with array options (ServiceNow KB format)"""
        options = [
            {"title": "KCS Knowledge Base", "sys_id": "abc123"},
            {"title": "IT", "sys_id": "def456"}
        ]
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="verification",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="success",
            error_message=None,
            documents_processed=None,
            verification_options=json.dumps(options),
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["options"], options)

    @patch('send_data_source_status.send_to_rabbitmq')
    def test_verification_failed_message(self, mock_send):
        """Test sending verification failed message with error"""
        error_msg = "Invalid credentials"
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="verification",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="failed",
            error_message=None,
            documents_processed=None,
            verification_options=None,
            verification_error=error_msg
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["status"], "failed")
        self.assertEqual(result_data["message"]["error"], error_msg)
        self.assertIsNone(result_data["message"]["options"])

    # ==================== Error Cases ====================

    def test_missing_rabbitmq_url_fails(self):
        """Test that missing RabbitMQ URL fails"""
        result = send_data_source_status(
            rabbitmq_url="",
            queue_name=self.queue_name,
            message_type="sync",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_started",
            error_message=None,
            documents_processed=None,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("rabbitmq_url", result_data["error"])

    def test_invalid_message_type_fails(self):
        """Test that invalid message type fails"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="invalid_type",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_started",
            error_message=None,
            documents_processed=None,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("message_type", result_data["error"])

    def test_missing_connection_id_fails(self):
        """Test that missing connection_id fails"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="sync",
            connection_id="",
            tenant_id=self.tenant_id,
            status="sync_started",
            error_message=None,
            documents_processed=None,
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("connection_id", result_data["error"])

    def test_invalid_documents_processed_fails(self):
        """Test that invalid documents_processed value fails"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="sync",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="sync_completed",
            error_message=None,
            documents_processed="not_a_number",
            verification_options=None,
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("integer", result_data["error"])

    def test_invalid_verification_options_json_fails(self):
        """Test that invalid JSON in verification_options fails"""
        result = send_data_source_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            message_type="verification",
            connection_id=self.connection_id,
            tenant_id=self.tenant_id,
            status="success",
            error_message=None,
            documents_processed=None,
            verification_options="{invalid json}",
            verification_error=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("JSON", result_data["error"])


def run_tests():
    """Run all tests"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestDataSourceStatus)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Return exit code
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(run_tests())
