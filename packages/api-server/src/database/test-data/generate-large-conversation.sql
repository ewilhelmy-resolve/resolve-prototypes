-- Test Data Generator: Large Conversation for Pagination Testing
-- Creates a conversation with 500+ messages to test infinite scroll pagination
--
-- USAGE:
-- 1. Update the test_org_id and test_user_id variables below
-- 2. Run this script: psql $DATABASE_URL -f generate-large-conversation.sql
-- 3. Use the generated conversation_id for testing
--
-- CLEANUP:
-- DELETE FROM conversations WHERE title = 'Pagination Test - 500 Messages';

-- Variables (UPDATE THESE for your test environment)
DO $$
DECLARE
  test_org_id UUID := 'YOUR_ORG_ID_HERE'; -- Replace with actual org ID from organizations table
  test_user_id UUID := 'YOUR_USER_ID_HERE'; -- Replace with actual user ID from user_profiles table
  test_conv_id UUID;
  base_timestamp TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '30 days';
  i INTEGER;
  message_role TEXT;
  message_content TEXT;
  message_metadata JSONB;
BEGIN
  -- Create test conversation
  INSERT INTO conversations (organization_id, user_id, title, created_at, updated_at)
  VALUES (
    test_org_id,
    test_user_id,
    'Pagination Test - 500 Messages',
    base_timestamp,
    base_timestamp
  )
  RETURNING id INTO test_conv_id;

  RAISE NOTICE 'Created conversation: %', test_conv_id;

  -- Generate 500 messages alternating between user and assistant
  FOR i IN 1..500 LOOP
    -- Alternate between user and assistant
    IF i % 2 = 1 THEN
      message_role := 'user';
      message_content := format('User message #%s - Testing pagination with a longer message that includes some details about the question being asked. What can you help me with today?', i);
      message_metadata := NULL;
    ELSE
      message_role := 'assistant';
      message_content := format('Assistant response #%s - Here is a helpful response to your question. This message is part of the pagination testing suite and contains enough text to make it realistic.', i);

      -- Add metadata to some assistant messages for variety
      IF i % 10 = 0 THEN
        message_metadata := jsonb_build_object(
          'reasoning', jsonb_build_object(
            'content', format('Reasoning for message #%s: Analyzing the user request and preparing response.', i),
            'title', 'Analysis'
          )
        );
      ELSIF i % 15 = 0 THEN
        message_metadata := jsonb_build_object(
          'sources', jsonb_build_array(
            jsonb_build_object(
              'url', format('https://example.com/doc-%s', i),
              'title', format('Reference Document %s', i),
              'snippet', 'This is a reference document used in the response.'
            )
          )
        );
      ELSE
        message_metadata := NULL;
      END IF;
    END IF;

    -- Insert message with realistic timestamp progression
    INSERT INTO messages (
      organization_id,
      conversation_id,
      user_id,
      message,
      role,
      status,
      created_at,
      processed_at,
      metadata
    )
    VALUES (
      test_org_id,
      test_conv_id,
      test_user_id,
      message_content,
      message_role,
      'completed',
      base_timestamp + (i * INTERVAL '5 minutes'), -- Space messages 5 minutes apart
      CASE
        WHEN message_role = 'assistant' THEN base_timestamp + (i * INTERVAL '5 minutes') + INTERVAL '2 seconds'
        ELSE NULL
      END,
      message_metadata
    );

    -- Log progress every 100 messages
    IF i % 100 = 0 THEN
      RAISE NOTICE 'Generated % messages...', i;
    END IF;
  END LOOP;

  RAISE NOTICE 'Successfully generated 500 messages in conversation: %', test_conv_id;
  RAISE NOTICE 'Total conversation duration: ~42 hours (500 messages * 5 min)';
  RAISE NOTICE 'Message frequency: Every 5 minutes';
  RAISE NOTICE '';
  RAISE NOTICE 'To test pagination:';
  RAISE NOTICE '  1. Navigate to conversation: %', test_conv_id;
  RAISE NOTICE '  2. Scroll to top of chat to trigger pagination';
  RAISE NOTICE '  3. Verify scroll position is maintained';
  RAISE NOTICE '';
  RAISE NOTICE 'To cleanup: DELETE FROM conversations WHERE id = ''%'';', test_conv_id;
END $$;

-- Verify the data
SELECT
  c.id as conversation_id,
  c.title,
  COUNT(m.id) as message_count,
  MIN(m.created_at) as first_message,
  MAX(m.created_at) as last_message,
  MAX(m.created_at) - MIN(m.created_at) as duration
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.title = 'Pagination Test - 500 Messages'
GROUP BY c.id, c.title;
