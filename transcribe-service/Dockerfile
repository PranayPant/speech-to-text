# Use the official Node.js Alpine image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy the rest of the application code
COPY ./app/server.js ./app/package*.json .

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 8000

# Generate self-signed SSL certificate
RUN apk add --no-cache openssl && \
    openssl req -x509 -newkey rsa:4096 -keyout /app/key.pem -out /app/cert.pem -sha256 -days 3650 -nodes -subj "/C=XX/ST=StateName/L=CityName/O=CompanyName/OU=CompanySectionName/CN=CommonNameOrHostname"

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Start the application
CMD ["node", "server.js"]
