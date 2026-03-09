import os
import shutil
import platform
import subprocess
import zipfile
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

app = FastAPI(title="Local File Manager")

# Mount a directory to serve static UI files
UI_DIR = Path(__file__).parent / "static"
UI_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=UI_DIR), name="static")

ROOT_DIR = Path(os.path.expanduser("~")) # Start from user home directory by default, or configurable

@app.get("/")
def read_root():
    return FileResponse(UI_DIR / "index.html")

# Data Models
class PathRequest(BaseModel):
    path: str

class RenameRequest(BaseModel):
    path: str
    new_name: str

class MoveCopyRequest(BaseModel):
    source: str
    destination: str

class CreateRequest(BaseModel):
    path: str
    is_folder: bool

class ArchiveRequest(BaseModel):
    paths: list[str]
    destination: str

def get_absolute_path(rel_path: str) -> Path:
    # Resolve relative to a safe root if needed, but for local tool we allow full paths or relative to ROOT_DIR
    p = Path(rel_path)
    if not p.is_absolute():
        p = ROOT_DIR / p
    return p.resolve()

@app.get("/api/files")
def list_files(path: str = ""):
    try:
        current_path = get_absolute_path(path)
        if not current_path.exists() or not current_path.is_dir():
            raise HTTPException(status_code=404, detail="Directory not found")
            
        items = []
        for item in current_path.iterdir():
            stat = item.stat()
            items.append({
                "name": item.name,
                "path": str(item),
                "is_dir": item.is_dir(),
                "size": stat.st_size if item.is_file() else 0,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "extension": item.suffix.lower() if item.is_file() else ""
            })
            
        return {
            "current_path": str(current_path),
            "parent_path": str(current_path.parent) if current_path != current_path.parent else None,
            "items": sorted(items, key=lambda x: (not x["is_dir"], x["name"].lower()))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/create")
def create_item(req: CreateRequest):
    try:
        path = get_absolute_path(req.path)
        if req.is_folder:
            path.mkdir(parents=True, exist_ok=False)
        else:
            path.touch(exist_ok=False)
        return {"message": f"Created {'folder' if req.is_folder else 'file'} successfully"}
    except FileExistsError:
        raise HTTPException(status_code=400, detail="File or folder already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/rename")
def rename_item(req: RenameRequest):
    try:
        src = get_absolute_path(req.path)
        dst = src.parent / req.new_name
        if dst.exists():
            raise HTTPException(status_code=400, detail="A file with the new name already exists")
        src.rename(dst)
        return {"message": "Renamed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/move")
def move_item(req: MoveCopyRequest):
    try:
        src = get_absolute_path(req.source)
        dst = get_absolute_path(req.destination)
        shutil.move(str(src), str(dst))
        return {"message": "Moved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/copy")
def copy_item(req: MoveCopyRequest):
    try:
        src = get_absolute_path(req.source)
        dst = get_absolute_path(req.destination)
        if src.is_dir():
            shutil.copytree(str(src), str(dst))
        else:
            shutil.copy2(str(src), str(dst))
        return {"message": "Copied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/delete")
def delete_item(req: PathRequest):
    try:
        path = get_absolute_path(req.path)
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        return {"message": "Deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/archive/zip")
def zip_items(req: ArchiveRequest):
    try:
        with zipfile.ZipFile(req.destination, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for p in req.paths:
                path = get_absolute_path(p)
                if path.is_dir():
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, path.parent)
                            zipf.write(file_path, arcname)
                else:
                    zipf.write(path, path.name)
        return {"message": "Compressed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/archive/unzip")
def unzip_item(req: MoveCopyRequest): # source = zip file, dest = folder
    try:
        src = get_absolute_path(req.source)
        dst = get_absolute_path(req.destination)
        
        if not dst.exists():
            dst.mkdir(parents=True, exist_ok=True)
            
        with zipfile.ZipFile(src, 'r') as zipf:
            zipf.extractall(dst)
        return {"message": "Extracted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/open")
def open_file(req: PathRequest):
    try:
        path = str(get_absolute_path(req.path))
        if platform.system() == 'Windows':
            os.startfile(path)
        elif platform.system() == 'Darwin': # macOS
            subprocess.call(('open', path))
        else: # Linux
            subprocess.call(('xdg-open', path))
        return {"message": "Opened successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
