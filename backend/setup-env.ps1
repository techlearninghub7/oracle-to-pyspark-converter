# Basic Python Environment Setup Script with Cleanup

# 0. Remove existing .venv if it exists
if (Test-Path .venv) {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item .venv -Recurse -Force
}

# 1. Create virtual environment
python -m venv .venv

# 2. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install packages from requirements.txt if it exists
if (Test-Path requirements.txt) {
    pip install -r requirements.txt --no-cache-dir
}

Write-Host "Python environment setup complete!" -ForegroundColor Green
Write-Host "Virtual environment activated. To deactivate, run 'deactivate'" -ForegroundColor Green

uvicorn main:app --reload --port 8000