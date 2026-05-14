import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get('GEMINI_API_KEY')
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
resp = requests.get(url)
data = resp.json()

models = []
for m in data.get('models', []):
    if 'generateContent' in m.get('supportedGenerationMethods', []):
        if 'gemini' in m.get('name', ''):
            models.append(m['name'])

print(models)
