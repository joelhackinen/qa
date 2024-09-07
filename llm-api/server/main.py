from fastapi import FastAPI
from .models import generator
from pydantic import BaseModel

class Question(BaseModel):
    question: str

app = FastAPI()

@app.get("/")
async def main():
    return "POST a message with a JSON document that has a 'question' key."

@app.post("/")
async def ask_question(data: Question):
    return generator(data.question)