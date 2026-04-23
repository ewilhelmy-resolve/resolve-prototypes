# Agent Markdown Definition Format

Agents can be created by POSTing a markdown definition to `POST /agents/metadata` with `markdown_text`.

## Placeholder Types

- `<|placeholder|>` — Creation-time parameters. Specified when creating the agent, not at execution time.
- `{%param_name}` — Execution-time parameters. Substituted when the agent is invoked.

## Generic Agent Template

```markdown
## Agent Name
<|agent_name|>
## Role
<|role|>
## Backstory
<|backstory|>
## Goal
<|goal|>
## Task
You will be provided information in the following sections below:
  1. 'Utterance': An problem or task description by the user.
  2. 'Transcript': If provided, this will have the user's conversation with the assistant in the form of a JSON list. The assistant asks the user for some necessary details related to the task and the user tries to answer as best as the user can. This conversation (if present) will provide more information for the task and must be taken into account wherever appropriate. The transcript is a list where each item is a dict with two attributes: `role` and `content`. `content` is what has been uttered. Items with `role`='assistant' are uttered by the assistant. Items with `role`='user' are uttered by the user.
  3. 'Additional Information': If provided, this will have some additional information that might be relevant for the task.
All the above information will together provide the necessary context for the task you need to perform: <|short_goal|>
<|task|>
===== Additional Information =====
{%additional_information}
===============
===== Utterance =====
{%utterance}
===============
===== Transcript =====
{%transcript}
===============
## Expected Output
Should be a well-formed JSON with the following attribute(s):
  - `success`: true/false indicating <|success_condition|>
  - `need_inputs`: A JSON list of dicts where each dict item in the list has two attributes: `name` and `description`, where `name` is the name of a parameter whose value the user should provide; and `description` is a description for that parameter which will be shown when asking for its value.
  <|other_outputs|>
## Tools/Skills
<|list_tool_names|>
## Configs
```json
<|configs|>
```
```

## Well-Known Execution Parameters

| Parameter | Description |
|---|---|
| `utterance` | User's problem or task description |
| `transcript` | JSON list of `{role, content}` conversation history |
| `additional_information` | Extra context for the task |

## Example: HelloAgent

```markdown
## Agent Name
HelloAgent
## Role
Greeter
## Backstory
A Cheerful Person
## Goal
Say Hello
## Task
You will be provided information in the following sections below:
  1. 'Utterance': An problem or task description by the user.
  2. 'Transcript': If provided, this will have the user's conversation with the assistant...
  3. 'Additional Information': If provided, this will have some additional information...
All the above information will together provide the necessary context for the task you need to perform: greet a person by saying hello.
You need to identify the name of the user from the context. If you cannot identify the name, then you must ask that from the user politely. When you have the user's name, you must greet the user as: 'Hello <user name>!'. You cannot greet until you know the user's name.
===== Additional Information =====
{%additional_information}
===============
===== Utterance =====
{%utterance}
===============
===== Transcript =====
{%transcript}
===============
## Expected Output
Should be a well-formed JSON with the following attribute(s):
  - `success`: true/false indicating whether the user could be greeted appropriately.
  - `need_inputs`: A JSON list of dicts where each dict item in the list has two attributes: `name` and `description`, where `name` is the name of a parameter whose value the user should provide; and `description` is a description for that parameter which will be shown when asking for its value.
  - `message`: Value should be 'Hello <user name>!' if the user name was identified
## Tools/Skills
none
## Configs
```json
{
  "llm_parameters": {
    "model": "gpt-4o"
  }
}
```
```

## Creating an Agent from Markdown

```bash
curl -X POST https://llm-service-staging.resolve.io/agents/metadata \
  -H 'Content-Type: application/json' \
  -d '{
  "markdown_text": "<agent definition markdown>"
}'
```

Response includes the created `AgentMetadataApiData` with auto-generated `eid`, parsed tasks, etc.
