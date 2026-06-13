{
  "name": "UserProfile",
  "type": "object",
  "properties": {
    "total_xp": {
      "type": "number",
      "default": 0,
      "description": "Total experience points"
    },
    "current_level": {
      "type": "number",
      "default": 1,
      "description": "Current level (starts at 1)"
    },
    "streak_days": {
      "type": "number",
      "default": 0,
      "description": "Consecutive days streak"
    },
    "last_login": {
      "type": "string",
      "format": "date",
      "description": "Last login date"
    },
    "monthly_budget": {
      "type": "number",
      "description": "Monthly budget target"
    },
    "financial_goal": {
      "type": "string",
      "enum": [
        "save_more",
        "reduce_debt",
        "invest",
        "emergency_fund",
        "retirement"
      ],
      "description": "Primary financial goal"
    },
    "notifications_enabled": {
      "type": "boolean",
      "default": true
    },
    "bank_connected": {
      "type": "boolean",
      "default": false,
      "description": "Whether bank is connected"
    },
    "bank_provider": {
      "type": "string",
      "description": "Connected bank provider (plaid, tink, truelayer)"
    },
    "bank_access_token": {
      "type": "string",
      "description": "Bank API access token"
    },
    "bank_last_sync": {
      "type": "string",
      "format": "date-time",
      "description": "Last bank synchronization time"
    }
  },
  "required": []
}