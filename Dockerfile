FROM node:latest

# Set working directory
WORKDIR /root/bot

# Install necessary packages
RUN apt-get update && \
  apt-get install -y \
  python3 \
  coreutils \
  zip \
  tesseract-ocr \
  imagemagick \
  tree \
  webp \
  unzip \
  curl \
  wget \
  libsox-fmt-all \
  sox \
  neofetch \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  ffmpeg \
  chromium

# Install global npm packages
RUN npm install -g npm@latest pm2

# Copy application code
COPY . .

# Install application dependencies
RUN npm i

# Expose the port the app runs on
EXPOSE 80 8888 8080 443 5130 5131 5132 5133 5134 5135 3306

# Start the application
CMD ["pm2-runtime", "start", "index.js"]
