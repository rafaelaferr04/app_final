{
  "name": "CourseProgress",
  "type": "object",
  "properties": {
    "course_id": {
      "type": "string",
      "description": "Course identifier"
    },
    "level": {
      "type": "number",
      "description": "Course level (1-3)"
    },
    "lessons_completed": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of completed lessons"
    },
    "quiz_scores": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Quiz scores"
    },
    "xp_earned": {
      "type": "number",
      "description": "Experience points earned"
    },
    "completed": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "course_id",
    "level"
  ]
}