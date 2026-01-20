"""
Ticket Ingestion Status Activity

Sends ticket ingestion status updates to Rita via RabbitMQ.

Inputs (execute signature):
 - rabbitmq_url: string (REQUIRED) - RabbitMQ connection URL
   Format: amqp://username:password@host:port/vhost or amqps://username:password@host:port/vhost
 - queue_name: string (REQUIRED) - Name of the queue (typically 'data_source_status')
 - tenant_id: string (REQUIRED) - Tenant identifier
 - user_id: string (REQUIRED) - User identifier
 - ingestion_run_id: string (REQUIRED) - Ingestion run ID
 - connection_id: string (REQUIRED) - Data source connection ID
 - status: string (REQUIRED) - Status value: 'running', 'completed', 'failed'
 - records_processed: int (OPTIONAL) - Number of records processed (default: 0)
 - records_failed: int (OPTIONAL) - Number of records failed (default: 0)
 - total_estimated: int (OPTIONAL) - Estimated total records
 - error_message: string (OPTIONAL) - Error message (for failed status)

Return: JSON-serializable dict with status and message details.
"""

import sys
import json
import argparse
from datetime import datetime, timezone


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


def validate_ingestion_message(tenant_id, user_id, ingestion_run_id, connection_id, status, records_processed, records_failed, total_estimated):
    """Validate ingestion message parameters. Returns (is_valid, error_message)."""
    if not tenant_id:
        return False, "tenant_id is required"
    if not user_id:
        return False, "user_id is required"
    if not ingestion_run_id:
        return False, "ingestion_run_id is required"
    if not connection_id:
        return False, "connection_id is required"
    if not status:
        return False, "status is required"

    valid_statuses = ['running', 'completed', 'failed']
    if status not in valid_statuses:
        return False, f"status must be one of: {', '.join(valid_statuses)}"

    # Validate numeric fields
    if records_processed is not None:
        try:
            val = int(records_processed)
            if val < 0:
                return False, "records_processed must be >= 0"
        except (ValueError, TypeError):
            return False, "records_processed must be a valid integer"

    if records_failed is not None:
        try:
            val = int(records_failed)
            if val < 0:
                return False, "records_failed must be >= 0"
        except (ValueError, TypeError):
            return False, "records_failed must be a valid integer"

    if total_estimated is not None:
        try:
            val = int(total_estimated)
            if val < 0:
                return False, "total_estimated must be >= 0"
        except (ValueError, TypeError):
            return False, "total_estimated must be a valid integer"

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


def execute(rabbitmq_url, queue_name, tenant_id, user_id, ingestion_run_id, connection_id, status, records_processed, records_failed, total_estimated, error_message):
    """
    Send a ticket ingestion status message to RabbitMQ.
    """
    try:
        # Handle default values and strip strings
        tenant_id = tenant_id.strip() if tenant_id else None
        user_id = user_id.strip() if user_id else None
        ingestion_run_id = ingestion_run_id.strip() if ingestion_run_id else None
        connection_id = connection_id.strip() if connection_id else None
        status = status.strip() if status else None
        error_message = error_message.strip() if error_message else None

        # Convert numeric fields
        if records_processed is not None and records_processed != "":
            try:
                records_processed = int(records_processed)
            except (ValueError, TypeError):
                return json.dumps({"status": "error", "error": "records_processed must be a valid integer"})
        else:
            records_processed = 0

        if records_failed is not None and records_failed != "":
            try:
                records_failed = int(records_failed)
            except (ValueError, TypeError):
                return json.dumps({"status": "error", "error": "records_failed must be a valid integer"})
        else:
            records_failed = 0

        if total_estimated is not None and total_estimated != "":
            try:
                total_estimated = int(total_estimated)
            except (ValueError, TypeError):
                return json.dumps({"status": "error", "error": "total_estimated must be a valid integer"})
        else:
            total_estimated = None

        # Validate RabbitMQ URL
        is_valid, error_msg = validate_rabbitmq_url(rabbitmq_url, queue_name)
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Validate message parameters
        is_valid, error_msg = validate_ingestion_message(
            tenant_id, user_id, ingestion_run_id, connection_id, status,
            records_processed, records_failed, total_estimated
        )
        if not is_valid:
            return json.dumps({"status": "error", "error": f"Validation failed: {error_msg}"})

        # Build message
        message = {
            "type": "ticket_ingestion",
            "tenant_id": tenant_id,
            "user_id": user_id,
            "ingestion_run_id": ingestion_run_id,
            "connection_id": connection_id,
            "status": status,
            "records_processed": records_processed,
            "records_failed": records_failed,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields
        if total_estimated is not None:
            message["total_estimated"] = total_estimated
        if error_message:
            message["error_message"] = error_message

        # Install pika if needed
        install_and_import('pika')

        # Send to RabbitMQ
        send_to_rabbitmq(message, rabbitmq_url, queue_name)

        return json.dumps({
            "status": "success",
            "ingestion_run_id": ingestion_run_id,
            "message": message
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": str(e)
        })


def main():
    parser = argparse.ArgumentParser(description='Send ticket ingestion status to RabbitMQ')
    parser.add_argument('--rabbitmq-url', default='amqp://guest:guest@localhost:5672/', help='RabbitMQ connection URL')
    parser.add_argument('--queue-name', default='data_source_status', help='Queue name')
    parser.add_argument('--tenant-id', required=True, help='Tenant ID')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--ingestion-run-id', required=True, help='Ingestion run ID')
    parser.add_argument('--connection-id', required=True, help='Data source connection ID')
    parser.add_argument('--status', required=True, choices=['running', 'completed', 'failed'], help='Ingestion status')
    parser.add_argument('--records-processed', type=int, default=0, help='Number of records processed')
    parser.add_argument('--records-failed', type=int, default=0, help='Number of records failed')
    parser.add_argument('--total-estimated', type=int, help='Estimated total records')
    parser.add_argument('--error-message', help='Error message (for failed status)')

    args = parser.parse_args()

    result = execute(
        rabbitmq_url=args.rabbitmq_url,
        queue_name=args.queue_name,
        tenant_id=args.tenant_id,
        user_id=args.user_id,
        ingestion_run_id=args.ingestion_run_id,
        connection_id=args.connection_id,
        status=args.status,
        records_processed=args.records_processed,
        records_failed=args.records_failed,
        total_estimated=args.total_estimated,
        error_message=args.error_message
    )

    print(result)
    result_data = json.loads(result)
    sys.exit(0 if result_data.get("status") == "success" else 1)


if __name__ == '__main__':
    main()
