# Active Context - 斗地主在线游戏

## Current Status
**Phase**: Initial Memory Bank Setup Complete
**Focus**: Project initialization and foundation setup

## Current Priorities

### Immediate Next Steps
1. **Project Structure Setup**
   - Initialize monorepo with Turbo + pnpm
   - Create client and server package directories
   - Configure workspace dependencies and scripts

2. **Foundation Development**
   - Set up Next.js client application with TailwindCSS
   - Initialize Express server with Socket.IO
   - Configure MongoDB connection and basic schemas
   - Set up Redis for session management

3. **Core Systems Implementation**
   - User authentication system (simplified demo version)
   - Room management functionality
   - Basic Socket.IO event handling setup

## Key Components Analysis

### User System Requirements
- **Route Protection**: All pages except `/login` require authentication
- **Login Flow**: Register/login functionality with automatic redirects
- **Session Management**: JWT-based authentication with Redis storage

### Room System Requirements  
- **Main Page Logic**:
  - If user in room → redirect to `/room/:roomId`
  - If user not in room → show room list + create room option
- **Room Page Logic**:
  - If user not in room → redirect to `/`
  - If user in room → show game interface

### Game System Requirements
- **Real-time Communication**: Socket.IO for all game interactions
- **State Management**: Server-authoritative game state
- **Player Management**: 3-player rooms with ready/unready system

## Technical Implementation Focus

### Architecture Decisions
- **Monorepo Structure**: Clean separation between client/server
- **State Management**: Redux on client, server-side sessions
- **Real-time Strategy**: Socket.IO for all live interactions
- **Data Strategy**: MongoDB for persistence, Redis for sessions

### Development Approach
- **Functional Programming**: Follow FP patterns over OOP
- **TypeScript**: Strong typing throughout the stack
- **Event-Driven**: Socket.IO event-based architecture
- **Validation**: Multi-layer validation (client + server)

## Current Blockers
- None identified - ready to begin implementation

## Success Criteria for Current Phase
- [x] Memory Bank initialized with project context
- [ ] Monorepo structure created and configured
- [ ] Basic client and server applications scaffolded
- [ ] Development environment fully functional
- [ ] Database connections established

## Next Major Milestones
1. **Foundation Complete**: Working dev environment with client/server
2. **User System**: Authentication and route protection working  
3. **Room System**: Room creation, joining, and basic management
4. **Game Core**: Basic game session creation and player management
5. **Real-time**: Socket.IO integration for live updates

## Implementation Notes
- Focus on getting basic structure working before advanced features
- Prioritize real-time communication architecture early
- Keep authentication simple but functional for demo purposes
- Ensure proper error handling and connection management from start
