{
  "name": "Transaction",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Transaction description"
    },
    "amount": {
      "type": "number",
      "description": "Transaction amount"
    },
    "type": {
      "type": "string",
      "enum": [
        "income",
        "expense"
      ],
      "description": "Transaction type"
    },
    "category": {
      "type": "string",
      "enum": [
        "salary",
        "freelance",
        "investment",
        "gift",
        "food",
        "transport",
        "housing",
        "utilities",
        "entertainment",
        "shopping",
        "health",
        "education",
        "savings",
        "other"
      ],
      "description": "Transaction category"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Transaction date"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    }
  },
  "required": [
    "title",
    "amount",
    "type",
    "category",
    "date"
  ]
}