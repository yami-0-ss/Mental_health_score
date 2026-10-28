# Mental_health_score
# Student Mental Health Score Predictor

An end-to-end machine learning project that predicts a student's **mental health score** from their social media usage, daily routine and stress level. A trained scikit-learn pipeline is served through a **FastAPI** backend, and a responsive **HTML / CSS / JavaScript** frontend lets anyone try it in the browser.

**Live API:** https://mental-health-score-3-9g50.onrender.com/

**Interactive API docs (Swagger):** https://mental-health-score-3-9g50.onrender.com/docs

**GitHub:** https://github.com/yami-0-ss/Mental_health_score

> The API is hosted on Render's free tier and sleeps after a period of inactivity. The first request can take 30-60 seconds while it wakes up. After that, responses are fast.

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [How it works](#how-it-works)
5. [Input features](#input-features)
6. [API reference](#api-reference)
7. [Frontend](#frontend)
8. [Project structure](#project-structure)
9. [Run locally](#run-locally)
10. [Deployment on Render](#deployment-on-render)
11. [Troubleshooting](#troubleshooting)
12. [Future improvements](#future-improvements)
13. [Disclaimer](#disclaimer)
14. [Author](#author)

---

## Overview

Students spend a large part of their day on social media. This project explores whether habits such as screen time, sleep, study time, physical activity and stress level can be used to estimate a mental health score.

The project covers the full workflow: a trained model, a validated REST API, a user-friendly web interface and a live cloud deployment.

## Features

- Predicts a mental health score from **12 input fields**
- **FastAPI** backend with automatic request validation (Pydantic) and built-in Swagger docs
- Country grouping: the top 9 countries are kept as they are, all others are grouped as `Other`
- Modern, responsive frontend that works on mobile and desktop
- Animated score gauge and loading animation while the model predicts
- Client-side validation plus graceful handling of API validation errors (422), server errors, timeouts and a stopped server
- CORS enabled, so the frontend can be hosted on any domain

## Tech stack

| Layer | Tools |
|-------|-------|
| Machine learning | scikit-learn pipeline (ColumnTransformer with StandardScaler, OrdinalEncoder, OneHotEncoder and FunctionTransformer), pandas, joblib |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Frontend | HTML5, CSS3, Vanilla JavaScript (Fetch API) |
| Deployment | Render (backend), any static host for the frontend |
| Version control | Git and GitHub |

## How it works

```
Browser (index.html + script.js)
        |  POST /predict  (JSON)
        v
FastAPI (main.py)
  - validates the input with Pydantic
  - groups the country into top countries or "Other"
  - builds a pandas DataFrame
        |
        v
Trained scikit-learn pipeline (Mental_Health_Model.pkl)
        |
        v
{"predicted_mental_health_score": 6.78}
        |
        v
Frontend shows the score on an animated gauge
```

## Input features

| Field | Type | Allowed values |
|-------|------|----------------|
| `age` | integer | 10 to 100 |
| `gender` | string | `Male`, `Female` |
| `country` | string | Any country name |
| `academic_level` | string | `High School`, `Undergraduate`, `Graduate` |
| `most_used_platform` | string | `Facebook`, `LinkedIn`, `Instagram`, `Snapchat`, `Twitter`, `YouTube`, `TikTok`, `LINE`, `KakaoTalk`, `VKontakte`, `WhatsApp`, `WeChat` |
| `purpose_of_use` | string | `Networking`, `Education`, `Entertainment`, `News` |
| `avg_daily_usage_hours` | float | 0 to 24 |
| `daily_unlocks` | integer | 0 or more |
| `study_hours` | float | 0 to 24 |
| `physical_activity_hours` | float | 0 to 24 |
| `sleep_hours_per_night` | float | 0 to 24 |
| `stress_level` | string | `Low`, `Medium`, `High`, `Very High` |

The backend also creates one extra feature, `Grouped_country`, from the country value before sending the data to the model.

## API reference

**Base URL:** `https://mental-health-score-3-9g50.onrender.com`

### `GET /`
Health check. Returns a welcome message.

### `POST /predict`
Returns the predicted mental health score, rounded to 2 decimals.

**Example request**

```bash
curl -X POST https://mental-health-score-3-9g50.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 20,
    "gender": "Female",
    "country": "India",
    "academic_level": "Undergraduate",
    "most_used_platform": "Instagram",
    "purpose_of_use": "Entertainment",
    "avg_daily_usage_hours": 4.5,
    "daily_unlocks": 60,
    "study_hours": 3,
    "physical_activity_hours": 1,
    "sleep_hours_per_night": 7,
    "stress_level": "Medium"
  }'
```

**Example response**

```json
{
  "predicted_mental_health_score": 6.78
}
```

**Status codes**

| Status | Meaning |
|--------|---------|
| `200` | Prediction returned |
| `422` | A field is missing or has an invalid value. The response lists the failing fields. |
| `500` | Unexpected server error |

## Frontend

The frontend is three files with no frameworks or build step:

- `index.html` - page structure and all form fields
- `style.css` - responsive layout, gauge, loading and error styles
- `script.js` - validation, the Fetch API call, result and error handling

The API address is set at the top of `script.js`:

```js
const API_BASE = "https://mental-health-score-3-9g50.onrender.com";
const REQUEST_TIMEOUT_MS = 60000;
```

For local testing, change `API_BASE` to `http://127.0.0.1:2200`.

## Project structure

```
Mental_health_score/
├── main.py                   # FastAPI app and /predict endpoint
├── Mental_Health_Model.pkl   # trained scikit-learn pipeline
├── requirements.txt          # pinned dependencies
├── .python-version           # Python 3.12.8 for Render
├── index.html                # frontend page
├── style.css                 # frontend styles
├── script.js                 # frontend logic
└── README.md
```

## Run locally

1. **Clone the repository**

   ```bash
   git clone https://github.com/yami-0-ss/Mental_health_score.git
   cd Mental_health_score
   ```

2. **Create a virtual environment** (Python 3.12 recommended)

   ```bash
   python -m venv venv
   venv\Scripts\activate          # Windows
   source venv/bin/activate       # macOS / Linux
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Start the API**

   ```bash
   python -m uvicorn main:app --reload --port 2200
   ```

   The API runs at http://127.0.0.1:2200 and the docs at http://127.0.0.1:2200/docs.

5. **Open the frontend**

   Set `API_BASE` in `script.js` to `http://127.0.0.1:2200`, then open `index.html` in your browser (or use the VS Code Live Server extension).

## Deployment on Render

| Setting | Value |
|---------|-------|
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Python version | `3.12.8` (via the `.python-version` file or the `PYTHON_VERSION` environment variable) |

Suggested `requirements.txt`:

```
fastapi
uvicorn
pydantic
joblib==1.4.2
pandas==2.2.3
numpy==2.2.6
scipy==1.15.3
scikit-learn==1.6.1
```

The pinned versions match the scikit-learn version the model was saved with.

## Troubleshooting

| Problem | Cause and fix |
|---------|---------------|
| `AttributeError: ... has no attribute '_RemainderColsList'` on startup | The model was saved with scikit-learn 1.6.1 but the server installed a newer version. Pin `scikit-learn==1.6.1` in `requirements.txt`. |
| Build is very slow, then fails on scipy (missing Fortran compiler) | Render used Python 3.14, which has no prebuilt files for the pinned packages. Set the Python version to 3.12.8. |
| Frontend shows "Cannot reach the server" | The API is not running, or `API_BASE` in `script.js` points to the wrong address. Open the `/docs` page to check, then fix `API_BASE`. |
| First request is slow or times out | Render's free tier sleeps when idle. Wait up to 60 seconds. |
| Frontend on `https://` cannot call the API | Use the `https://` Render URL, not `http://127.0.0.1`. |

## Future improvements

- Show which inputs influenced the score the most
- Add charts that compare the user's habits with the average
- Add model evaluation metrics and training notebook details to this README
- Host the frontend on Netlify or GitHub Pages
- Add automated tests for the API

## Disclaimer

This project is for learning and demonstration only. The score is an estimate produced by a machine learning model and is **not a medical diagnosis**. If you are struggling with your mental health, please speak to a doctor or a qualified counsellor.

## Author

Built by **Yamini More**
GitHub: [yami-0-ss](https://github.com/yami-0-ss)
