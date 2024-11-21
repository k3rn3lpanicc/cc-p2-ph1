FROM node:18-slim

ENV PORT=3000
ENV API_KEY=T7EN9tmHlWn0mABKfOZGHg==9KILceps3XR8koMB

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Build the .env file

RUN echo "PORT=${PORT}" > .env
RUN echo "API_KEY=${API_KEY}" >> .env

# Expose the app's port
EXPOSE ${PORT}

# Start the app
CMD ["node", "app.js"]
