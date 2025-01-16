# Use the latest Python Alpine image
FROM python:3.11-alpine

# Set the working directory
WORKDIR /app

# Copy the application code
COPY ./src/ ./

RUN pip install --no-cache-dir -r requirements.txt

# Command to run the FastAPI server
CMD ["fastapi", "run", "./server.py", "--port", "8001"]