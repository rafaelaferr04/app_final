{
  "name": "Achievement",
  "type": "object",
  "properties": {
    "achievement_id": {
      "type": "string",
      "description": "Achievement identifier"
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "icon": {
      "type": "string"
    },
    "xp_reward": {
      "type": "number"
    },
    "unlocked_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "achievement_id",
    "title"
  ]
}