# 🛡️ ToxGuard — Toxic Comment Classifier

A Chrome extension + FastAPI backend that scans web pages for toxic comments and highlights them with a **three-tier classification system**: 🔴 Toxic (very bad), 🟡 Medium, 🟢 Safe.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![Chrome](https://img.shields.io/badge/chrome-extension-yellow.svg)

## Features

- **Real-time scanning** — Analyze any web page's comments with one click
- **Three-tier classification** — Red (3+ toxic categories), Yellow (1–2 categories), Green (safe)
- **6 toxicity categories** — Toxic, Severe Toxic, Obscene, Threat, Insult, Identity Hate
- **Adjustable threshold** — Fine-tune sensitivity with the threshold slider
- **Visual highlighting** — Glowing borders with hover tooltips on the page
- **Privacy-first** — Model runs on your server, no data sent to third parties

## Project Structure

```
Toxic_Comment_Classifier/
├── server/                   # FastAPI backend
│   ├── app/
│   │   ├── main.py           # API endpoints
│   │   ├── config.py         # Environment config
│   │   ├── classifier.py     # ML model + prediction
│   │   └── middleware.py     # Auth + rate limiting
│   ├── models/               # ML model files
│   ├── tests/                # API tests
│   ├── Dockerfile            # Docker support
│   └── requirements.txt
├── extension/                # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html/js/css
│   └── icons/
├── streamlit/                # Streamlit demo app
│   └── app.py
├── docs/                     # Documentation
│   └── privacy-policy.md
└── README.md
```

## Quick Start

### 1. Backend Server

```bash
cd server
python -m venv tcc && source tcc/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Edit .env for production
python -m app.main
```

The API will be running at `http://localhost:4000`.

### 2. Chrome Extension

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Navigate to any webpage and click the ToxGuard icon

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Classify comments (requires API key in production) |

### Example Request

```bash
curl -X POST http://localhost:4000/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"comments": ["Hello!", "You are terrible!"], "threshold": 0.5}'
```

## Configuration

All settings are configurable via `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `API_KEY` | `toxguard-dev-key-change-me` | API authentication key |
| `CORS_ORIGINS` | `["*"]` | Allowed origins |
| `RATE_LIMIT` | `30/minute` | Request rate limit |
| `MAX_COMMENT_LENGTH` | `500` | Max chars per comment |

## Testing

```bash
cd server
python -m pytest tests/ -v
```

## Docker

```bash
cd server
docker build -t toxguard-server .
docker run -p 4000:4000 toxguard-server
```

## License

MIT — see [LICENSE](LICENSE) for details.
