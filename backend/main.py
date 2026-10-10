# TAATVA Obsidian - backend (the "engine room").
# For now it only has a "health" page that says the backend is alive.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Obsidian by TAATVA")

# Let our website (on port 3000) talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    # If you can see this, the backend is running
    return {"status": "ok", "app": "Obsidian", "team": "TAATVA"}
