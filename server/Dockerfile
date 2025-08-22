# Use official Node.js LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Set environment variable for production
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
