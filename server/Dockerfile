FROM node:20

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Trivy CLI (official repo, modern keyring path)
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release; \
    install -d -m 0755 /etc/apt/keyrings; \
    curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /etc/apt/keyrings/trivy.gpg; \
    echo "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" > /etc/apt/sources.list.d/trivy.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends trivy; \
    rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
