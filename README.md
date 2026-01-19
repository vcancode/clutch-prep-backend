 🚀 ClutchPrep Backend
ClutchPrep is an AI-powered exam preparation platform that helps students **study only what actually matters** for exams.
Instead of vague, chapter-level topics, ClutchPrep analyzes **previous years’ question papers** and extracts **question-based, marks-oriented topics** that students can realistically complete in limited time.

This repository contains the **backend service** responsible for:

* OCR extraction from uploaded PDFs
* AI-based exam pattern analysis
* Secure user authentication
* Document storage & progress tracking
* YouTube resource enrichment (quota-controlled)

## ✨ What This Backend Does

* 📄 Accepts **previous year question papers (PDFs)**
* 🧠 Uses **Tesseract OCR** to extract text
* 🤖 Sends cleaned exam data to **Groq’s OpenAI OSS-120B model**
* 📊 Extracts **10–15 question-based exam topics**
* 🧩 Generates **side topics (prerequisites)** for each question
* ▶️ Enriches results with **YouTube playlists** (daily-limited)
* 🧪 Supports **MCQ-based diagnostic tests**
* 📈 Tracks topic-level progress per user
* 🔐 JWT-based authentication & authorization

---

## 🧠 Core Idea (Why ClutchPrep Is Different)

Most tools say:

> “Study Dynamic Programming”

ClutchPrep says:

> “Solve 0/1 Knapsack using Dynamic Programming”

This allows students to:

* Focus on **specific question patterns**
* Cover **5–7 marks topics in under 1–2 hours**
* Avoid wasting time on low-yield chapters

---

## 🛠 Tech Stack

### Backend

* **Node.js**
* **Express.js**
* **MongoDB (Mongoose)**

### AI & OCR

* **Tesseract OCR** – PDF text extraction
* **Groq API** – `openai/gpt-oss-120b` model for analysis

### Authentication

* **JWT (JSON Web Tokens)**

### External APIs

* **YouTube Data API v3** (quota-controlled enrichment)

---

## 📁 Project Structure (High Level)

```
server/
├── controllers/
├── models/
├── routes/
├── middlewares/
├── utils/
├── uploads/
├── app.js
└── server.js
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/clutchprep-backend.git
cd clutchprep-backend
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Create `.env` file

Create a `.env` file in the root directory and add the following:

```env
GROQ_API_KEY=your_groq_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
MONGO_URL=your_mongodb_connection_string
SECRET_KEY=your_jwt_secret_key
```

---

## 🔑 Environment Variables Explained

### 🔹 `GROQ_API_KEY`

Used to access **Groq’s OpenAI OSS-120B model** for exam analysis.

#### How to get it:

1. Go to 👉 [https://console.groq.com](https://console.groq.com)
2. Sign up / log in
3. Navigate to **API Keys**
4. Generate a new API key
5. Make sure your account has access to:

   ```
   openai/gpt-oss-120b
   ```
6. Copy the key and paste it into `.env`

---

### 🔹 `YOUTUBE_API_KEY`

Used for fetching **playlist-level learning resources**.

#### How to get it:

1. Go to 👉 [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Go to **Credentials**
5. Create an **API Key**
6. Restrict it to:

   * YouTube Data API v3
7. Copy the key into `.env`

> ℹ️ Note: Backend enforces **1 YouTube enrichment per user per day** to control quota usage.

---

### 🔹 `MONGO_URL`

MongoDB connection string.

Example:

```env
mongodb+srv://username:password@cluster.mongodb.net/clutchprep
```

You can get this from:

* MongoDB Atlas → Database → Connect → Drivers

---

### 🔹 `SECRET_KEY`

Used for signing JWT tokens.

Example:

```env
SECRET_KEY=super_secure_random_string
```

Use a long, random string in production.

---

## ▶️ Running the Server

```bash
npm start
```

or (for development):

```bash
npm run dev
```

Server runs on:

```
http://localhost:5000
```

---

## 🔐 Authentication Flow

* Signup → JWT issued
* Login → JWT issued
* Protected routes require:

  ```
  Authorization: Bearer <token>
  ```

---

## 📌 Important Notes

* YouTube enrichment uses **calendar-day limits**, not rolling 24-hour windows
* Groq calls are **cost-controlled**
* Parallel heavy requests should be rate-limited in production
* OCR + AI pipelines are CPU & token intensive

---

## 🧩 Frontend Repository

Frontend for ClutchPrep is maintained separately.

👉 **Frontend Repo:**
**(Add link here)**

```
https://github.com/your-username/clutchprep-frontend
```

---

## 📜 License

This project is licensed for educational and research purposes.
Commercial usage should include proper API usage compliance.

---

## 👤 Author

Built with focus on **exam efficiency, not content overload**.

**ClutchPrep** — *Study only what wins you marks.*

---

If you want:

* API documentation
* Postman collection
* Architecture diagram
* Deployment README (Render / Railway)

say **which one** next.
