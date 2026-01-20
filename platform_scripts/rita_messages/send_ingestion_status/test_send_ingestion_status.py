#!/usr/bin/env python3
"""
Unit tests for send_ingestion_status.py

Tests ticket ingestion status messages with various status combinations.
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
from send_ingestion_status import (
    execute as send_ingestion_status,
    validate_rabbitmq_url,
    validate_ingestion_message
)


class TestIngestionStatus(unittest.TestCase):
    """Test ticket ingestion status message sending"""

    def setUp(self):
        """Set up test fixtures"""
        self.rabbitmq_url = "amqp://guest:guest@localhost:5672/"
        self.queue_name = "data_source_status"
        self.tenant_id = "4032e3a7-db1a-427d-9954-956919b77534"
        self.user_id = "user-123"
        self.ingestion_run_id = "7908fbf6-f68e-4c72-87bb-6269a6158ade"
        self.connection_id = "9344f985-293d-466c-90f0-5f89fad8f627"

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

    def test_validate_ingestion_message_success(self):
        """Test valid ingestion message"""
        is_valid, error = validate_ingestion_message(
            self.tenant_id, self.user_id, self.ingestion_run_id,
            self.connection_id, "running", 0, 0, None
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_ingestion_message_invalid_status(self):
        """Test invalid ingestion status"""
        is_valid, error = validate_ingestion_message(
            self.tenant_id, self.user_id, self.ingestion_run_id,
            self.connection_id, "invalid_status", 0, 0, None
        )
        self.assertFalse(is_valid)
        self.assertIn("must be one of", error)

    def test_validate_ingestion_message_missing_tenant_id(self):
        """Test missing tenant_id"""
        is_valid, error = validate_ingestion_message(
            "", self.user_id, self.ingestion_run_id,
            self.connection_id, "running", 0, 0, None
        )
        self.assertFalse(is_valid)
        self.assertIn("tenant_id", error)

    def test_validate_ingestion_message_missing_user_id(self):
        """Test missing user_id"""
        is_valid, error = validate_ingestion_message(
            self.tenant_id, "", self.ingestion_run_id,
            self.connection_id, "running", 0, 0, None
        )
        self.assertFalse(is_valid)
        self.assertIn("user_id", error)

    def test_validate_ingestion_message_negative_records(self):
        """Test negative records_processed"""
        is_valid, error = validate_ingestion_message(
            self.tenant_id, self.user_id, self.ingestion_run_id,
            self.connection_id, "running", -1, 0, None
        )
        self.assertFalse(is_valid)
        self.assertIn("records_processed", error)

    # ==================== Running Status Tests ====================

    @patch('send_ingestion_status.send_to_rabbitmq')
    def test_running_status_message(self, mock_send):
        """Test sending running status message"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="running",
            records_processed=1,
            records_failed=0,
            total_estimated=100,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["type"], "ticket_ingestion")
        self.assertEqual(result_data["message"]["status"], "running")
        self.assertEqual(result_data["message"]["records_processed"], 1)
        self.assertEqual(result_data["message"]["total_estimated"], 100)
        self.assertIn("timestamp", result_data["message"])

        mock_send.assert_called_once()

    @patch('send_ingestion_status.send_to_rabbitmq')
    def test_running_status_with_progress(self, mock_send):
        """Test running status with progress updates"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="running",
            records_processed=50,
            records_failed=2,
            total_estimated=100,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["records_processed"], 50)
        self.assertEqual(result_data["message"]["records_failed"], 2)

    # ==================== Completed Status Tests ====================

    @patch('send_ingestion_status.send_to_rabbitmq')
    def test_completed_status_message(self, mock_send):
        """Test sending completed status message"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="completed",
            records_processed=100,
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["status"], "completed")
        self.assertEqual(result_data["message"]["records_processed"], 100)
        self.assertNotIn("total_estimated", result_data["message"])

    # ==================== Failed Status Tests ====================

    @patch('send_ingestion_status.send_to_rabbitmq')
    def test_failed_status_message(self, mock_send):
        """Test sending failed status message with error"""
        error_msg = "Connection timeout"
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="failed",
            records_processed=50,
            records_failed=10,
            total_estimated=100,
            error_message=error_msg
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "success")
        self.assertEqual(result_data["message"]["status"], "failed")
        self.assertEqual(result_data["message"]["error_message"], error_msg)
        self.assertEqual(result_data["message"]["records_processed"], 50)

    # ==================== Error Cases ====================

    def test_missing_rabbitmq_url_fails(self):
        """Test that missing RabbitMQ URL fails"""
        result = send_ingestion_status(
            rabbitmq_url="",
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="running",
            records_processed=0,
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("rabbitmq_url", result_data["error"])

    def test_missing_tenant_id_fails(self):
        """Test that missing tenant_id fails"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id="",
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="running",
            records_processed=0,
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("tenant_id", result_data["error"])

    def test_missing_ingestion_run_id_fails(self):
        """Test that missing ingestion_run_id fails"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id="",
            connection_id=self.connection_id,
            status="running",
            records_processed=0,
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("ingestion_run_id", result_data["error"])

    def test_invalid_records_processed_fails(self):
        """Test that invalid records_processed value fails"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="running",
            records_processed="not_a_number",
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("integer", result_data["error"])

    def test_invalid_status_fails(self):
        """Test that invalid status fails"""
        result = send_ingestion_status(
            rabbitmq_url=self.rabbitmq_url,
            queue_name=self.queue_name,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            ingestion_run_id=self.ingestion_run_id,
            connection_id=self.connection_id,
            status="invalid_status",
            records_processed=0,
            records_failed=0,
            total_estimated=None,
            error_message=None
        )

        result_data = json.loads(result)
        self.assertEqual(result_data["status"], "error")
        self.assertIn("status", result_data["error"])


def run_tests():
    """Run all tests"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestIngestionStatus)

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(run_tests())
