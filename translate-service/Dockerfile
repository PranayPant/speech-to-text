# Use the official Node.js image from the Docker Hub
FROM node:18

WORKDIR /app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install dependencies using pnpm
RUN npm install

# Copy the local code to the container image
COPY . .

# Expose the port the app runs on
EXPOSE 8001

# Run the application
CMD ["node", "server.js"]