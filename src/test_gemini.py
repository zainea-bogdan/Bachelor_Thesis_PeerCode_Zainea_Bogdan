# import os
# from dotenv import load_dotenv
# from google import genai

# load_dotenv("rag_module/.env")

# api_key = os.getenv("GEMINI_API_KEY")
# client = genai.Client(api_key=api_key)

# for model in client.models.list():
#     print(model.name)

import os
from dotenv import load_dotenv
from google import genai

load_dotenv("rag_module/.env")

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents="Say hello and confirm you are working."
)

print(response.text)