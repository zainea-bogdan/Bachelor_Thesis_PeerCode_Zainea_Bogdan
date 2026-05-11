# import os
# from dotenv import load_dotenv
# from google import genai

# load_dotenv("rag_module/.env")

# api_key = os.getenv("GEMINI_API_KEY")
# client = genai.Client(api_key=api_key)

# for model in client.models.list():
#     print(model.name)

# import os
# from dotenv import load_dotenv
# from google import genai

# load_dotenv("rag_module/.env")

# api_key = os.getenv("GEMINI_API_KEY")
# gemini_model = os.getenv("GEMINI_MODEL")
# client = genai.Client(api_key=api_key)

# response = client.models.generate_content(
#     model=gemini_model,
#     contents="Say hello and confirm you are working."
# )

# print(response.text)


from dotenv import load_dotenv
import os
from google import genai

load_dotenv('rag_module/.env')
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

response = client.models.generate_content(
    model='gemini-3.1-pro-preview',
    contents='Say hello.'
)
print(response.text)
