import json
import os

from openai import OpenAI
from pydantic import BaseModel

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

client = OpenAI(
    api_key="ollama",  # Ollama ignores the key; SDK requires a non-empty value
    base_url=OLLAMA_BASE_URL,
)


def ask_ai(prompt: str) -> str:
    response = client.chat.completions.create(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


# --- Structured chat ---


class CardAction(BaseModel):
    action: str  # "create_card" | "update_card" | "delete_card" | "move_card"
    card_id: int | None = None
    column_id: int | None = None
    title: str | None = None
    details: str | None = None
    position: int | None = None


class AIResponse(BaseModel):
    message: str
    actions: list[CardAction] = []


_SYSTEM_PROMPT = """You are an AI assistant for a Kanban board app.
The user's current board state is provided below as JSON.
You can read the board and optionally perform actions on it.

Available actions (include in the "actions" array):
- create_card:  {{"action": "create_card", "column_id": <int>, "title": "<str>", "details": "<str|null>"}}
- update_card:  {{"action": "update_card", "card_id": <int>, "title": "<str|null>", "details": "<str|null>"}}
- delete_card:  {{"action": "delete_card", "card_id": <int>}}
- move_card:    {{"action": "move_card", "card_id": <int>, "column_id": <int>, "position": <int>}}

Always respond with valid JSON matching this schema exactly:
{{
  "message": "<your conversational reply to the user>",
  "actions": [ ...zero or more action objects... ]
}}

Current board:
{board_json}"""


def chat_ai(board_json: str, message: str, history: list[dict]) -> AIResponse:
    system_content = _SYSTEM_PROMPT.format(board_json=board_json)
    messages = [{"role": "system", "content": system_content}]
    messages.extend(history)
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=OLLAMA_MODEL,
        messages=messages,
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return AIResponse(**data)
