# Use the official Node.js Alpine image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy the rest of the application code
COPY ./app/ ./

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 8000

# Install ffmpeg
RUN apk add ffmpeg

# Start the application
CMD ["node", "./server/index.js"]
