# Tech Context - 斗地主在线游戏

## Technology Stack

### Core Technologies
- **Language**: TypeScript throughout the stack
- **Package Management**: pnpm for efficient dependency management
- **Build System**: Turbo for monorepo orchestration
- **Architecture**: Monorepo with separate client/server packages

### Frontend Stack
- **Framework**: Next.js (React-based)
- **Styling**: TailwindCSS for utility-first styling
- **State Management**: Redux for client-side state
- **Real-time**: socket.io-client for WebSocket communication

### Backend Stack
- **Server Framework**: Express.js
- **Real-time**: Socket.IO for WebSocket handling
- **Database**: 
  - MongoDB with Mongoose ODM for data persistence
  - Redis (ioredis) for session storage and caching
- **Authentication**: jsonwebtoken (JWT) for session management
- **Configuration**: dotenv for environment variables

## Data Models

### Users Collection
```typescript
interface User {
  _id: ObjectId;
  username: string;  // No password - demo system only
}
```

### Rooms Collection
```typescript
interface Room {
  _id: ObjectId;
  name: string;
  createdBy: ObjectId;        // User who created the room
  players: ObjectId[];        // Array of user IDs (max 3)
  status: 'waiting' | 'playing' | 'finished';
  gameSessionId: ObjectId;    // Reference to active game session
  createdAt: Date;
  updatedAt: Date;
}
```

### Game Sessions Collection
```typescript
interface GameSession {
  _id: ObjectId;
  roomId: ObjectId;
  players: [{
    userId: ObjectId;
    username: string;
    cards: Card[];              // Player's current hand
    isLandlord: boolean;        // Is this player the landlord?
    isReady: boolean;           // Ready for game start
  }];
  state: {
    currentPlayer: ObjectId;    // Whose turn it is
    landlord: ObjectId;         // The landlord player
    gamePhase: 'bidding' | 'playing' | 'finished';
  };
  deck: Card[];                 // Remaining cards in deck
}
```

## API Design

### RESTful Endpoints
- **GET `/user-info`**: Get current user information (id, name, roomId)
- **POST `/login`**: User authentication
- **POST `/regist`**: User registration  
- **POST `/logout`**: User logout

### Socket.IO Events
- **Room Management**:
  - `join-room`: Join a specific room
  - `leave-room`: Leave current room
  - `create-room`: Create new room
  - `ready-toggle`: Toggle ready state
  - `start-game`: Begin game when all players ready

- **Game Events** (to be defined during implementation):
  - Card play events
  - Turn management
  - Game state updates

## Development Environment

### Package Structure
```
ddz-01/
├── packages/
│   ├── client/          # Next.js frontend
│   └── server/          # Express backend
├── package.json         # Root package.json with workspaces
├── turbo.json          # Turbo configuration
└── pnpm-workspace.yaml # pnpm workspace configuration
```

### Build & Development
- **Development**: `pnpm dev` for concurrent client/server development
- **Build**: `turbo build` for optimized production builds
- **Dependencies**: Shared dependencies managed at workspace root

## Security Considerations

### Authentication
- **Simplified**: Demo system without password verification
- **JWT**: Stateless token-based authentication
- **Session Management**: Redis for server-side session storage

### Input Validation
- **Client**: UI-level validation for user experience
- **Server**: Comprehensive validation for all API endpoints
- **Game Logic**: Server-side enforcement of game rules

## Performance Requirements

### Real-time Performance
- **Latency**: Sub-100ms for game actions
- **Concurrency**: Support multiple concurrent games
- **Connection Management**: Efficient Socket.IO connection handling

### Scalability Preparation
- **Database**: MongoDB with proper indexing
- **Caching**: Redis for session and frequently accessed data
- **Connection Pooling**: Optimized database connections

## Development Guidelines

### Code Organization
- **Functional Programming**: Prefer FP over OOP (user preference)
- **TypeScript**: Strong typing throughout
- **Modular Structure**: Clear separation of concerns
- **Event-Driven**: Socket.IO event-based architecture

### Error Handling
- **Graceful Failures**: Proper error boundaries and fallbacks
- **Logging**: Structured logging for debugging and monitoring
- **Validation**: Multi-layer validation (client + server)
