"""
API module wrapper so that `uvicorn api.main:app` works out of the box
as well as `uvicorn server:app`.
"""
import sys
import os

# Add root directory to sys.path so server can be imported regardless of execution directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from server import app
