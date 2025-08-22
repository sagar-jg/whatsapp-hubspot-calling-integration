# Deployment Guide

This guide covers deploying the WhatsApp HubSpot Calling Integration to production.

## Prerequisites

### Required Services

1. **Twilio Account**
   - WhatsApp Business API access
   - Phone number for voice calls
   - Webhook endpoints configured

2. **HubSpot Developer Account**
   - Created HubSpot app with calling permissions
   - OAuth credentials configured

3. **Infrastructure**
   - Server with Docker support
   - Redis instance
   - SSL certificate
   - Domain name

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sagar-jg/whatsapp-hubspot-calling-integration.git
   cd whatsapp-hubspot-calling-integration
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Prepare the server**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Deploy the application**
   ```bash
   # Make deployment script executable
   chmod +x scripts/deploy.sh
   
   # Run deployment
   sudo ./scripts/deploy.sh
   ```

3. **Configure SSL (if using nginx)**
   ```bash
   # Create SSL directory
   mkdir -p ssl
   
   # Copy your SSL certificates
   cp your-cert.pem ssl/cert.pem
   cp your-key.pem ssl/key.pem
   
   # Start with nginx profile
   docker-compose --profile production up -d
   ```

### Option 2: Manual Deployment

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start Redis**
   ```bash
   redis-server --daemonize yes
   ```

4. **Start the application**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

### Option 3: Cloud Deployment

#### AWS ECS

1. **Build and push Docker image**
   ```bash
   # Build image
   docker build -t whatsapp-calling .
   
   # Tag for ECR
   docker tag whatsapp-calling:latest YOUR_ECR_URI:latest
   
   # Push to ECR
   aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_ECR_URI
   docker push YOUR_ECR_URI:latest
   ```

2. **Create ECS task definition** (see `deployment/aws/task-definition.json`)

3. **Create ECS service**

#### Google Cloud Run

1. **Build and deploy**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT/whatsapp-calling
   gcloud run deploy --image gcr.io/YOUR_PROJECT/whatsapp-calling --platform managed
   ```

#### Azure Container Instances

1. **Build and push to ACR**
   ```bash
   az acr build --registry YOUR_REGISTRY --image whatsapp-calling .
   ```

2. **Deploy to ACI**
   ```bash
   az container create --resource-group YOUR_RG --name whatsapp-calling --image YOUR_REGISTRY.azurecr.io/whatsapp-calling
   ```

## Configuration

### Twilio Webhooks

Configure the following webhook URLs in your Twilio console:

- **Voice URL**: `https://your-domain.com/api/webhooks/twilio/voice`
- **Status Callback**: `https://your-domain.com/api/webhooks/twilio/status`
- **WhatsApp Status**: `https://your-domain.com/api/webhooks/twilio/whatsapp`

### HubSpot App

1. **Update OAuth redirect URLs**:
   - `https://your-domain.com/login`
   - `https://your-domain.com/auth/callback`

2. **Configure webhook endpoints** (if needed):
   - `https://your-domain.com/api/webhooks/hubspot/calling`

### SSL Configuration

#### Let's Encrypt (Free SSL)

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Generate certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Monitoring and Maintenance

### Health Checks

- **Application**: `https://your-domain.com/health`
- **Redis**: `redis-cli ping`
- **Docker**: `docker-compose ps`

### Logging

1. **View application logs**
   ```bash
   docker-compose logs -f app
   ```

2. **View specific service logs**
   ```bash
   docker-compose logs redis
   docker-compose logs nginx
   ```

3. **Log rotation** (configure logrotate)
   ```bash
   sudo nano /etc/logrotate.d/whatsapp-calling
   ```

### Backup

1. **Redis data backup**
   ```bash
   # Create backup
   redis-cli --rdb backup.rdb
   
   # Restore backup
   cp backup.rdb /var/lib/redis/dump.rdb
   sudo systemctl restart redis
   ```

2. **Application backup**
   ```bash
   # Backup configuration
   tar -czf backup-$(date +%Y%m%d).tar.gz .env ssl/ logs/
   ```

### Updates

1. **Update application**
   ```bash
   git pull
   sudo ./scripts/deploy.sh
   ```

2. **Rollback if needed**
   ```bash
   git checkout PREVIOUS_COMMIT
   sudo ./scripts/deploy.sh
   ```

## Security Considerations

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Environment Variables

- Never commit `.env` files
- Use strong, unique passwords
- Rotate JWT secrets regularly
- Use different credentials for each environment

### Network Security

- Use HTTPS only
- Configure CORS properly
- Implement rate limiting
- Use secure headers

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   sudo netstat -tulpn | grep :3000
   ```

2. **Redis connection issues**
   ```bash
   redis-cli ping
   ```

3. **SSL certificate issues**
   ```bash
   openssl x509 -in ssl/cert.pem -text -noout
   ```

4. **Docker issues**
   ```bash
   docker system prune -a
   docker-compose down -v
   ```

### Performance Tuning

1. **Redis optimization**
   ```bash
   # Edit redis.conf
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

2. **Node.js optimization**
   ```bash
   # Set environment variables
   NODE_ENV=production
   UV_THREADPOOL_SIZE=16
   ```

3. **Nginx optimization**
   ```nginx
   worker_processes auto;
   worker_connections 1024;
   keepalive_timeout 65;
   ```

## Scaling

### Horizontal Scaling

1. **Load balancer setup**
2. **Multiple application instances**
3. **Redis cluster for session sharing**
4. **CDN for static assets**

### Vertical Scaling

1. **Increase server resources**
2. **Optimize database queries**
3. **Enable Redis persistence**
4. **Use Redis clustering**

## Support

For deployment issues:

1. Check the application logs
2. Verify environment configuration
3. Test webhook endpoints
4. Confirm SSL certificates
5. Create an issue on GitHub with deployment details