# Z-Archiver PC (Local File Manager)

A lightweight **local file manager** web app built with **FastAPI** + **Tailwind CSS**.
It lets you browse, create, rename, move/copy, delete, and archive files and folders on your local machine via a friendly web UI.

> ⚠️ This project interacts directly with your filesystem. Run it only in environments where you trust the code and understand the security implications.

---

## 🚀 Features

- Browse and navigate directories on the local machine
- Create folders and empty files
- Rename, move, copy, and delete items
- ZIP multiple files/folders and extract ZIP archives
- Open files/folders using the OS default application
- Theme selector (Light, Dark Soft, Dark High Contrast)
- Accent color picker

---

## 🧰 Requirements

- Python 3.10+ (recommended)

---

## ⚙️ Setup

1. **Clone / open** this folder.
2. Create a virtual environment (optional but recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```powershell
pip install -r requirements.txt
```

---

## ▶️ Run

Start the server:

```powershell
python main.py
```

Then open your browser at:

```
http://localhost:8000/
```

---

## 🔧 Project Structure

- `main.py` — FastAPI backend (file operations + archive support)
- `requirements.txt` — Python dependencies
- `static/` — Web UI assets
  - `index.html` — UI layout + modal dialogs
  - `app.js` — frontend logic (calls backend endpoints)
- `theme.py` — helper script to apply theme class replacements (optional)

---

## 🧩 Backend API

The frontend communicates with these endpoints (JSON payloads):

- `GET /api/files?path=` — list directory contents
- `POST /api/files/create` — create file or folder
- `POST /api/files/rename` — rename item
- `POST /api/files/move` — move item
- `POST /api/files/copy` — copy item
- `POST /api/files/delete` — delete item
- `POST /api/archive/zip` — create ZIP archive
- `POST /api/archive/unzip` — extract ZIP archive
- `POST /api/open` — open file/folder in OS default app

---

## 🛠️ Customization

- Change the starting root directory by modifying `ROOT_DIR` in `main.py`.
- Modify frontend appearance by editing `static/index.html` / `static/app.js`.
- The `theme.py` script can be used to rewrite Tailwind utility classes in `static/index.html` and `static/app.js` with custom theme class names.

---

## ⚠️ Security Note

This app is designed as a local tool. It exposes filesystem operations over HTTP without authentication.
**Do not run it on a public network or expose it to untrusted users.**

---

## 🧪 Troubleshooting

- If the UI does not load, ensure the server is running and that you can access `http://localhost:8000/`.
- Verify dependencies are installed (`pip list`).

---

## 📝 License

No license specified. Use at your own risk.
