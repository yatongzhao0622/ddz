# 🚀 Deployment Guide - Dou Dizhu Online Game

## Environment Configuration

### Local Development
1. **Client (.env.local)**:
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

2. **Server (.env)**:
```env
PORT=3001
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/doudizhu
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Local Network Access (Multiple Devices)
To access from other computers/phones on the same network:

1. **Find your local IP address**:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr show`
   - Look for something like `192.168.1.100`

2. **Update Client (.env.local)**:
```env
NEXT_PUBLIC_SERVER_URL=http://192.168.1.100:3001
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api
```

3. **Update Server (.env)**:
```env
PORT=3001
CLIENT_URL=http://192.168.1.100:3000
```

4. **Start both services**:
```bash
# Terminal 1 - Server
cd packages/server
npm run dev

# Terminal 2 - Client  
cd packages/client
npm run dev
```

5. **Access from any device on the network**:
   - Game: `http://192.168.1.100:3000`
   - Server: `http://192.168.1.100:3001`

### Production Deployment

#### Option 1: Single VPS/Server
1. **Client (.env.local)**:
```env
NEXT_PUBLIC_SERVER_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

2. **Server (.env)**:
```env
PORT=3001
CLIENT_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/doudizhu
REDIS_URL=redis://redis-host:6379
JWT_SECRET=super-secure-production-secret
```

#### Option 2: Separate Domains
1. **Client (.env.local)**:
```env
NEXT_PUBLIC_SERVER_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
```

2. **Server (.env)**:
```env
PORT=3001
CLIENT_URL=https://app.your-domain.com
```

## Deployment Platforms

### Vercel (Client) + Railway/Render (Server)
1. **Deploy Client to Vercel**:
   - Connect GitHub repo
   - Set build command: `cd packages/client && npm run build`
   - Set environment variables in Vercel dashboard

2. **Deploy Server to Railway/Render**:
   - Connect GitHub repo
   - Set start command: `cd packages/server && npm start`
   - Set environment variables in platform dashboard

### Docker Deployment
See `docker-compose.yml` for complete setup.

## Network Troubleshooting

### Common Issues:
1. **Can't connect from other devices**:
   - Check firewall settings
   - Ensure ports 3000 and 3001 are open
   - Verify IP address is correct

2. **Socket.IO connection failed**:
   - Check CORS settings in server
   - Verify NEXT_PUBLIC_SERVER_URL is accessible
   - Check network connectivity

3. **API calls failing**:
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check server is running and accessible
   - Verify authentication tokens

### Testing Network Access:
```bash
# Test server endpoint
curl http://192.168.1.100:3001/health

# Test API endpoint
curl http://192.168.1.100:3001/api/status
```

## Performance Optimization

### Production Settings:
1. **Enable compression** in server
2. **Use CDN** for static assets  
3. **Database indexing** for game queries
4. **Redis caching** for room states
5. **Load balancing** for multiple server instances

### Monitoring:
- **Server logs** for game events
- **Database performance** monitoring
- **Real-time connection** statistics
- **Error tracking** and alerts 