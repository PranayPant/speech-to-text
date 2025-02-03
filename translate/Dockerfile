# Debian based image to allow for grpcio installation
FROM python:3.11-slim-buster

# Set the working directory
WORKDIR /app

# Create a data directory
RUN mkdir -p /app/data

# Copy the application code
COPY ./src/ ./

RUN pip install -r requirements.txt

# Command to run the FastAPI server
CMD ["fastapi", "run", "./server.py", "--port", "8001"]