# System Patterns - 斗地主在线游戏

## Architectural Patterns

### Monorepo Pattern
- **Structure**: Single repository with multiple packages
- **Management**: Turbo + pnpm for workspace coordination
- **Benefits**: Shared dependencies, coordinated builds, unified development

### Client-Server Pattern
- **Separation**: Clear boundary between frontend and backend
- **Communication**: RESTful APIs for static data, Socket.IO for real-time events
- **State Management**: Client-side Redux for UI state, server-side session management

### Real-time Communication Pattern
- **Technology**: Socket.IO for bidirectional communication
- **Events**: Room join/leave, game actions, state synchronization
- **Reliability**: Connection management and reconnection handling

## Data Patterns

### Document-Based Storage
- **Database**: MongoDB for flexible document storage
- **Collections**: Users, Rooms, Game Sessions
- **Relationships**: ObjectId references between collections

### Session Management Pattern
- **Authentication**: JWT tokens for stateless authentication
- **Session Storage**: Redis for temporary game state and user sessions
- **Persistence**: MongoDB for permanent data (users, room history)

### State Management Patterns
- **Client State**: Redux for UI state management and caching
- **Server State**: In-memory game sessions with Redis backup
- **Synchronization**: Socket.IO events for state sync between client/server

## Game Logic Patterns

### State Machine Pattern
- **Game Phases**: `bidding` → `playing` → `finished`
- **Room States**: `waiting` → `playing` → `finished`
- **Player States**: Ready/unready, active/inactive

### Event-Driven Pattern
- **Game Events**: Card plays, turn changes, game state updates
- **Room Events**: Player join/leave, ready state changes
- **Real-time Broadcast**: Socket.IO rooms for targeted event distribution

### Command Pattern
- **User Actions**: Join room, play card, ready up
- **Validation**: Server-side action validation
- **Execution**: State changes with event broadcasts

## Security Patterns

### Authentication Pattern
- **Simplified**: Demo system with basic username authentication
- **Token-based**: JWT for session management
- **Route Protection**: Middleware for authenticated routes

### Input Validation Pattern
- **Client-side**: Basic UI validation for better UX
- **Server-side**: Comprehensive validation for security
- **Game Rules**: Server enforcement of game logic rules

## Scalability Patterns

### Horizontal Scaling Preparation
- **Stateless Server**: JWT-based authentication
- **Redis Session Store**: Shared session storage
- **Socket.IO Adapter**: Redis adapter for multi-instance support

### Performance Patterns
- **Efficient Updates**: Minimal data transfer for real-time events
- **Connection Pooling**: Database connection optimization
- **Caching**: Redis for frequently accessed data

## Error Handling Patterns

### Graceful Degradation
- **Connection Loss**: Reconnection strategies
- **Invalid Actions**: Clear error messages and state recovery
- **Server Errors**: Proper error responses and logging

### Validation Pattern
- **Multi-layer**: Client UI validation + server business logic validation
- **Game Rules**: Server-side enforcement of Dou Dizhu rules
- **Data Integrity**: Schema validation and constraint enforcement
