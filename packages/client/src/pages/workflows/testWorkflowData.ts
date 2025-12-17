import type { WorkflowResponse } from "./types";

export const TEST_WORKFLOW_RESPONSE: WorkflowResponse = {
	action: "workflow_created",
	workflow: [
		{
			task_id: "t1",
			description: "Remove duplicate values from a list of numbers",
			inputs: [],
			outputs: [],
			action: "reuse",
			snippet: {
				id: "37c51a32-42c1-4e57-8ffb-3b96e27b4b25",
				description: "Removes duplicate values from a list of numbers provided in context['numbers'] and stores the result in context['unique_numbers']. Maintains the original order of elements. Handles empty lists gracefully.",
				code: "numbers = context.get('numbers', [])\n\nif not isinstance(numbers, list):\n    context['error'] = 'Input must be a list of numbers'\n    context['unique_numbers'] = []\nelse:\n    try:\n        seen = set()\n        unique_numbers = []\n        for number in numbers:\n            if number not in seen:\n                unique_numbers.append(number)\n                seen.add(number)\n        context['unique_numbers'] = unique_numbers\n    except Exception as e:\n        context['error'] = str(e)\n        context['unique_numbers'] = []\n\n#--end--",
				input_example: '{"numbers": [1, 2, 2, 3, 4, 4, 5]}',
				output_keys: '["unique_numbers", "error"]',
				packages: "[]",
			},
		},
		{
			task_id: "t2",
			description: "Multiply each number in a list by 3",
			inputs: [],
			outputs: [],
			action: "reuse",
			snippet: {
				id: "e6cc885c-1cb5-4124-a912-7da0fbe7da31",
				description: "Multiplies each number in a list provided in context['numbers'] by 3 and stores the result in context['multiplied_numbers']. Handles empty lists gracefully and validates input type.",
				code: "numbers = context.get('numbers', [])\n\nif not isinstance(numbers, list):\n    context['error'] = 'Input must be a list of numbers'\n    context['multiplied_numbers'] = []\nelse:\n    try:\n        multiplied_numbers = [number * 3 for number in numbers]\n        context['multiplied_numbers'] = multiplied_numbers\n    except Exception as e:\n        context['error'] = str(e)\n        context['multiplied_numbers'] = []\n\n#--end--",
				input_example: '{"numbers": [1, 2, 3, 4]}',
				output_keys: '["multiplied_numbers", "error"]',
				packages: "[]",
			},
		},
		{
			task_id: "t3",
			description: "Sort a list of numbers in ascending order",
			inputs: [],
			outputs: [],
			action: "reuse",
			snippet: {
				id: "de9be5db-9d69-4e9f-9fdf-e37c7f2516fc",
				description: "Sorts a list of numbers provided in context['numbers'] in ascending order and stores the result in context['sorted_numbers']. Handles empty lists gracefully and validates input type.",
				code: "numbers = context.get('numbers', [])\n\nif not isinstance(numbers, list):\n    context['error'] = 'Input must be a list of numbers'\n    context['sorted_numbers'] = []\nelse:\n    try:\n        context['sorted_numbers'] = sorted(numbers)\n    except Exception as e:\n        context['error'] = str(e)\n        context['sorted_numbers'] = []\n\n#--end--",
				input_example: '{"numbers": [4, 2, 7, 1, 3]}',
				output_keys: '["sorted_numbers", "error"]',
				packages: "[]",
			},
		},
	],
	visualization: "Workflow Steps:\n========================================\n\nStep 1: Remove duplicate values from a list of numbers\n  [REUSED]\n  Reads:  numbers\n  Writes: unique_numbers, error\n       |\n       | (unique_numbers -> numbers)\n       v\n\nStep 2: Multiply each number in a list by 3\n  [REUSED]\n  Reads:  numbers\n  Writes: multiplied_numbers, error\n       |\n       | (unique_numbers -> numbers)\n       v\n\nStep 3: Sort a list of numbers in ascending order\n  [REUSED]\n  Reads:  numbers\n  Writes: sorted_numbers, error\n\n========================================",
	mappings: {
		"2": { unique_numbers: "numbers" },
		"3": { unique_numbers: "numbers" },
	},
};
