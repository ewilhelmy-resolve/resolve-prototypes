#!/usr/bin/env python3
"""
Test runner for Rita message actions.

Loads RabbitMQ credentials from .env file and tests each action type.

Usage:
  python platform_scripts/rita_messages/test_actions.py [conversation_id] [tenant_id]

Arguments:
  conversation_id  - Optional: Existing conversation ID (generates new one if not provided)
  tenant_id        - Optional: Tenant/organization ID (uses 'test-tenant-001' if not provided)

Examples:
  # Use auto-generated IDs
  python platform_scripts/rita_messages/test_actions.py

  # Use specific conversation and tenant
  python platform_scripts/rita_messages/test_actions.py conv-123 tenant-456
"""

import os
import sys
import json
import uuid
import argparse
from pathlib import Path

# Add the script directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir / 'send_complete_message'))

# Import the actions
from send_complete_message import execute as send_complete


def load_env():
    """Load environment variables from .env file"""
    env_path = Path(__file__).parent.parent.parent / '.env'

    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        print("Please create a .env file based on .env.example")
        sys.exit(1)

    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

    return env_vars




def generate_test_ids():
    """Generate test message identifiers"""
    return {
        'tenant_id': 'test-tenant-001',
        'conversation_id': f'test-conv-{uuid.uuid4()}',
        'message_id_base': str(uuid.uuid4())
    }


def print_test_header(test_name):
    """Print a formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {test_name}")
    print(f"{'='*60}")


def print_result(result):
    """Print test result"""
    # Parse JSON string if needed
    if isinstance(result, str):
        result = json.loads(result)

    if result.get('status') == 'success':
        print(f"✅ Success! Message ID: {result.get('message_id')}")
    else:
        print(f"❌ Failed: {result.get('error')}")
    print()


def test_reasoning_message(rabbitmq_url, queue_name, test_ids):
    """Test reasoning only message using send_complete_message"""
    print_test_header("Reasoning Message")

    result = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content=None,
        reasoning_content="""Let me analyze this step by step:

1. **Check System Status**: Verify all services are running
2. **Review Logs**: Look for any errors or warnings
3. **Generate Report**: Create comprehensive status report""",
        reasoning_title="System Analysis",
        sources=None,
        tasks=None,
        response_group_id=None,
        tenant_id=test_ids['tenant_id'],
        message_id=test_ids['message_id'] or str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=True,  # Single message - turn is complete
        citation_variant=None
    )

    print_result(result)
    return result


def test_sources_message(rabbitmq_url, queue_name, test_ids):
    """Test sources only message using send_complete_message"""
    print_test_header("Sources Message")

    sources = [
        {
            "url": "https://docs.anthropic.com",
            "title": "Anthropic Documentation",
            "snippet": "Learn about Claude API, best practices, and integration patterns."
        },
        {
            "url": "https://docs.python.org",
            "title": "Python Documentation",
            "snippet": "Official Python documentation covering language features and standard library."
        },
        {
            "url": "https://www.rabbitmq.com/documentation.html",
            "title": "RabbitMQ Docs",
            "snippet": "Complete guide to RabbitMQ message broker configuration and usage."
        }
    ]

    result = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=json.dumps(sources),
        tasks=None,
        response_group_id=None,
        tenant_id=test_ids['tenant_id'],
        message_id=test_ids['message_id'] or str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=True,  # Single message - turn is complete
        citation_variant="hover-card"
    )

    print_result(result)
    return result


def test_tasks_message(rabbitmq_url, queue_name, test_ids):
    """Test tasks only message using send_complete_message"""
    print_test_header("Tasks Message")

    tasks = [
        {
            "title": "System Health Check",
            "defaultOpen": True,
            "items": [
                "Check CPU and memory usage",
                "Verify all services are running",
                "Review error logs",
                "Test database connections"
            ]
        },
        {
            "title": "Deployment Tasks",
            "defaultOpen": False,
            "items": [
                "Build Docker image",
                "Push to registry",
                "Update Kubernetes deployment",
                "Run smoke tests"
            ]
        }
    ]

    result = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=json.dumps(tasks),
        response_group_id=None,
        tenant_id=test_ids['tenant_id'],
        message_id=test_ids['message_id'] or str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=True,  # Single message - turn is complete
        citation_variant=None
    )

    print_result(result)
    return result


def test_complete_message(rabbitmq_url, queue_name, test_ids):
    """Test complete message with all components including new fields"""
    print_test_header("Complete Message (All Components with New Fields)")

    sources = [
        {
            "url": "https://docs.example.com/deployment",
            "title": "Deployment Guide",
            "snippet": "Complete guide to deploying applications to production environments, including best practices and rollback procedures.",
            "blob_id": "blob-deploy-guide-12345"
        },
        {
            "url": "https://docs.example.com/monitoring",
            "title": "Production Monitoring",
            "snippet": "Learn how to set up monitoring, alerts, and observability for production systems."
        }
    ]

    tasks = [
        {
            "title": "Pre-Deployment Checklist",
            "defaultOpen": True,
            "items": [
                "Backup production database",
                "Review rollback plan",
                "Notify team members",
                "Run final integration tests"
            ]
        }
    ]

    result = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content="## Deployment Plan Ready 🚀\n\nYour application is ready for production deployment. All prerequisites have been verified.",
        reasoning_content="""Deployment Analysis:

1. **Requirements Check**: All prerequisites met
2. **Configuration Review**: Settings validated
3. **Risk Assessment**: Low risk deployment
4. **Resource Allocation**: Sufficient capacity available""",
        reasoning_title="Deployment Planning",
        sources=json.dumps(sources),
        tasks=json.dumps(tasks),
        response_group_id=None,
        tenant_id=test_ids['tenant_id'],
        message_id=test_ids['message_id'] or str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=True,  # Single message - turn is complete
        citation_variant="hover-card"
    )

    print_result(result)
    return result


def test_grouped_messages(rabbitmq_url, queue_name, test_ids):
    """Test message grouping with response_group_id using send_complete_message"""
    print_test_header("Grouped Messages (Using response_group_id)")

    group_id = str(uuid.uuid4())
    print(f"📦 Group ID: {group_id}\n")

    # Message 1: Reasoning
    print("Sending message 1: Reasoning...")
    result1 = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content=None,
        reasoning_content="Analyzing the system:\n1. Check metrics\n2. Evaluate performance\n3. Generate recommendations",
        reasoning_title="Performance Analysis",
        sources=None,
        tasks=None,
        response_group_id=group_id,
        tenant_id=test_ids['tenant_id'],
        message_id=str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=False,  # More messages coming
        citation_variant=None
    )
    print_result(result1)

    # Message 2: Tasks (grouped with message 1)
    print("Sending message 2: Tasks (grouped)...")
    result2 = send_complete(
        rabbitmq_url=rabbitmq_url,
        queue_name=queue_name,
        text_content=None,
        reasoning_content=None,
        reasoning_title=None,
        sources=None,
        tasks=json.dumps([
            {
                "title": "Recommended Actions",
                "defaultOpen": True,
                "items": ["Optimize queries", "Clear cache", "Update indexes"]
            }
        ]),
        response_group_id=group_id,
        tenant_id=test_ids['tenant_id'],
        message_id=str(uuid.uuid4()),
        conversation_id=test_ids['conversation_id'],
        turn_complete=True,  # Last message - turn is complete
        citation_variant=None
    )
    print_result(result2)

    # Parse JSON results if needed
    if isinstance(result1, str):
        result1 = json.loads(result1)
    if isinstance(result2, str):
        result2 = json.loads(result2)

    return result1.get('status') == 'success' and result2.get('status') == 'success'


def main():
    """Main test runner"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Test Rita message actions',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-generate test IDs, run all tests
  python platform_scripts/rita_messages/test_actions.py

  # Run specific test with custom IDs (clear and readable)
  python platform_scripts/rita_messages/test_actions.py \\
    --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \\
    --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \\
    --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \\
    --test complete

  # Using short flags
  python platform_scripts/rita_messages/test_actions.py \\
    -c 2c5e478d-0827-4403-8780-9dee982676f0 \\
    -tn be0cc838-7530-4961-a887-139f9c9e5012 \\
    -m ebc08133-cd88-4d5a-b672-55a4cdfe2433 \\
    -t reasoning
        """
    )
    parser.add_argument('--conversation-id', '--conv', '-c',
                        help='Conversation ID (auto-generated if not provided)')
    parser.add_argument('--tenant-id', '--tenant', '-tn',
                        help='Tenant/organization ID (uses "test-tenant-001" if not provided)')
    parser.add_argument('--message-id', '--msg', '-m',
                        help='Message ID (must be an existing assistant message in the DB)')
    parser.add_argument('--test', '-t', choices=['reasoning', 'sources', 'tasks', 'complete', 'grouped', 'all'],
                        default='all',
                        help='Run specific test (default: all)')

    args = parser.parse_args()

    print("\n" + "="*60)
    print("🚀 Rita Message Actions - Test Runner")
    print("="*60)

    # Load environment variables
    print("\n📁 Loading environment variables from .env...")
    env_vars = load_env()

    # Parse RabbitMQ configuration
    rabbitmq_url = env_vars.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    queue_name = env_vars.get('QUEUE_NAME', 'rita_responses')

    print(f"✅ RabbitMQ URL: {rabbitmq_url}")
    print(f"✅ Queue Name: {queue_name}")

    # Generate or use provided test identifiers
    test_ids = {
        'tenant_id': args.tenant_id or 'test-tenant-001',
        'conversation_id': args.conversation_id or f'test-conv-{uuid.uuid4()}',
        'message_id': args.message_id  # Use provided message_id or None
    }

    print(f"\n📋 Test Configuration:")
    print(f"   Tenant ID: {test_ids['tenant_id']}")
    print(f"   Conversation ID: {test_ids['conversation_id']}")
    if test_ids['message_id']:
        print(f"   Message ID: {test_ids['message_id']}")
    else:
        print(f"   Message ID: (will generate new UUIDs for each test)")

    # Define test mapping
    test_map = {
        'reasoning': ('Reasoning Message', test_reasoning_message),
        'sources': ('Sources Message', test_sources_message),
        'tasks': ('Tasks Message', test_tasks_message),
        'complete': ('Complete Message', test_complete_message),
        'grouped': ('Grouped Messages', test_grouped_messages),
    }

    # Run tests based on selection
    results = []

    try:
        if args.test == 'all':
            # Run all tests
            for test_key, (test_name, test_func) in test_map.items():
                results.append((test_name, test_func(rabbitmq_url, queue_name, test_ids)))
        else:
            # Run specific test
            test_name, test_func = test_map[args.test]
            results.append((test_name, test_func(rabbitmq_url, queue_name, test_ids)))

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)

    success_count = 0
    for test_name, result in results:
        # Parse JSON string if needed
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                pass  # If it's not JSON, treat as boolean

        if isinstance(result, dict):
            status = "✅ PASS" if result.get('status') == 'success' else "❌ FAIL"
        else:
            status = "✅ PASS" if result else "❌ FAIL"

        if "✅" in status:
            success_count += 1

        print(f"{status} - {test_name}")

    print("\n" + "="*60)
    print(f"Results: {success_count}/{len(results)} tests passed")
    print("="*60)

    if success_count == len(results):
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {len(results) - success_count} test(s) failed")
        sys.exit(1)


if __name__ == '__main__':
    main()