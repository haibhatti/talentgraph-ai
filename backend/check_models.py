import os
from groq import Groq
from dotenv import load_dotenv

# Load your API key from .env
load_dotenv()

try:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    models = client.models.list()
    
    print("\n=== YOUR ACTIVE GROQ MODELS ===")
    for m in models.data:
        print(f"- {m.id}")
    print("===============================\n")
except Exception as e:
    print(f"Error connecting to Groq: {e}")