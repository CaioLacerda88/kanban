import os

from openai import OpenAI

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"

client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY", "no-key"),
    base_url=GEMINI_BASE_URL,
)


def ask_ai(prompt: str) -> str:
    response = client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content
