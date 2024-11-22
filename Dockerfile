# Use the official Node.js image
FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Expose the port (same as defined in Kubernetes ConfigMap or Secret)
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
