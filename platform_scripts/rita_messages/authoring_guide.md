# Guide to Authoring Activity Control JSON

This document provides a guide on how to create the frontend JSON file that defines the user interface for a custom activity in Actions Express.

## 1. Root Structure

The JSON file defines the name, description, and UI controls for the activity. The root object contains a `data` property, which in turn holds the configuration.

The primary object within `data` is `rootSettings`, which contains the list of UI controls.

```json
{
  "innerCode": 200,
  "data": {
    "name": "My Activity Name",
    "description": "A short description of what this activity does.",
    "Timeout": null,
    "class": [],
    "rootSettings": {
      "isCollapse": false,
      "activitySettings": [
        // ... control objects go here ...
      ]
    }
  }
}
```

-   **`name`**: The display name of the activity.
-   **`description`**: A brief explanation of the activity's purpose.
-   **`activitySettings`**: An array of JSON objects, where each object represents a single UI control (e.g., a textbox, checkbox, or dropdown).

---

## 2. Control Properties

Each object within the `activitySettings` array defines a control. These have mandatory and optional properties.

### Mandatory Control Properties

| Property      | Description                                                                                                                                 | Example                               |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------ |
| `value`       | The initial value of the control. Can be a static value, empty (`""`), or a variable placeholder (`%variable_name%`).                         | `"Hello World"`, `"%tenant_id%"`      |
| `key`         | The internal name of the control. **This is critical**, as it must match the property name in the backend script that receives the value.    | `"reasoning_content"`                 |
| `label`       | The display text for the control in the UI.                                                                                                 | `"Reasoning Content"`                 |
| `baseType`    | The base type of the control. The most common is `control`. Other values are `group` and `hostGroup` for grouping multiple controls.          | `"control"`                           |
| `controlType` | The type of UI element to display.                                                                                                          | `"textbox"`, `"textarea"`, `"hidden"` |

### Optional Control Properties

| Property     | Description                                                                                                | Example               |
| :----------- | :--------------------------------------------------------------------------------------------------------- | :-------------------- |
| `required`   | `true` or `false`. If `true`, the user must provide a value for this control before saving.                  | `true`                |
| `labelKey`   | Used for translation purposes. It is typically derived from the activity name and the control label.         | `"reasoning_title"`   |
| `styleClass` | Adds a CSS class to the control for custom styling. For example, `xl-textarea` makes a `textarea` larger.    | `"xl-textarea"`       |
| `disabled`   | `true` or `false`. If `true`, the control is visible but cannot be edited by the user.                       | `false`               |

---

## 3. Control Types (`controlType`)

The `controlType` property determines the appearance and behavior of the UI control.

| Control Type  | Description                                                              |
| :------------ | :----------------------------------------------------------------------- |
| `textbox`     | A standard single-line text input field.                                 |
| `textarea`    | A multi-line text input area.                                            |
| `checkbox`    | A standard checkbox. Its `value` should be `true` or `false` (boolean).  |
| `dropdown`    | A dropdown list. Requires the `controlOptions` property to be set.       |
| `password`    | A text input that masks the characters.                                  |
| `hidden`      | A control that is not visible to the user but passes data to the backend.|
| `autocomplete`| A textbox with auto-completion suggestions.                              |

---

## 4. Special Properties for Specific Control Types

Some control types have their own unique properties.

-   **For `dropdown` and `radiobutton`:**
    -   `controlOptions`: An array of key-value pairs that define the items in the list.
      ```json
      "controlOptions": [
        { "key": "1", "value": "Option 1" },
        { "key": "2", "value": "Option 2" }
      ]
      ```

-   **For `password`:**
    -   `encrypt`: A boolean (`true`/`false`) that determines if the value should be encrypted.

-   **For `checkbox`:**
    -   `convertBoolTo`: Can be set to `"number"` to send `1` for `true` and `0` for `false` to the backend.

---

## Full Example

The following is the complete JSON for the "Rita Reasoning Message" activity. It demonstrates the use of hidden fields for system variables, text inputs for user-provided content, and a checkbox for a boolean flag.

```json
{
  "innerCode": 200,
  "data": {
    "name": "Rita Reasoning Message",
    "description": "Sends a reasoning-only message to Rita. Use this to show step-by-step analysis or thinking process to the user.",
    "Timeout": null,
    "class": [],
    "rootSettings": {
      "isCollapse": false,
      "activitySettings": [
        {
          "value": "%rita_rabbitmq_url%",
          "required": true,
          "key": "rabbitmq_url",
          "label": "RabbitMQ URL",
          "labelKey": "rabbitmq_url",
          "baseType": "control",
          "controlType": "hidden"
        },
        {
          "value": "%rita_chat_queue_name%",
          "required": true,
          "key": "queue_name",
          "label": "Queue Name",
          "labelKey": "queue_name",
          "baseType": "control",
          "controlType": "hidden"
        },
        {
          "value": "Thinking...",
          "required": false,
          "key": "reasoning_title",
          "label": "Reasoning Title",
          "labelKey": "reasoning_title",
          "baseType": "control",
          "controlType": "textbox"
        },
        {
          "value": "",
          "required": true,
          "key": "reasoning_content",
          "label": "Reasoning Content",
          "labelKey": "reasoning_content",
          "baseType": "control",
          "controlType": "textarea",
          "styleClass": "xl-textarea"
        },
        {
          "value": "%tenant_id%",
          "required": true,
          "key": "tenant_id",
          "label": "Tenant ID",
          "labelKey": "tenant_id",
          "baseType": "control",
          "controlType": "hidden"
        },
        {
          "value": "%message_id%",
          "required": true,
          "key": "message_id",
          "label": "Message ID",
          "labelKey": "message_id",
          "baseType": "control",
          "controlType": "hidden"
        },
        {
          "value": "%conversation_id%",
          "required": true,
          "key": "conversation_id",
          "label": "Conversation ID",
          "labelKey": "conversation_id",
          "baseType": "control",
          "controlType": "hidden"
        },
        {
          "value": false,
          "required": false,
          "key": "turn_complete",
          "label": "Turn complete - If not set, shows a spinner after this message",
          "labelKey": "turn_complete",
          "baseType": "control",
          "controlType": "checkbox"
        }
      ]
    }
  }
}
```
