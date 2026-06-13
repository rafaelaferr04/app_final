{
  "name": "SavingsGoal",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Goal name"
    },
    "target_amount": {
      "type": "number",
      "description": "Target savings amount"
    },
    "current_amount": {
      "type": "number",
      "description": "Current saved amount"
    },
    "deadline": {
      "type": "string",
      "format": "date",
      "description": "Target date"
    },
    "icon": {
      "type": "string",
      "description": "Goal icon emoji"
    },
    "priority": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high"
      ],
      "default": "medium"
    },
    "completed_date": {
      "type": "string",
      "format": "date",
      "description": "Date when goal was completed"
    },
    "contribution_history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "amount": {
            "type": "number"
          },
          "date": {
            "type": "string",
            "format": "date"
          }
        }
      },
      "description": "History of contributions with dates"
    }
  },
  "required": [
    "title",
    "target_amount",
    "current_amount"
  ]
}