# 斗地主在线游戏 - Project Brief

## Project Overview
Building an online multiplayer Dou Dizhu (Chinese card game) platform with real-time gameplay, user management, and room-based multiplayer sessions.

## Project Scope
- **Type**: Multiplayer online card game
- **Architecture**: Monorepo with separate client and server applications
- **Target Users**: Players who want to play Dou Dizhu online with friends
- **Core Features**: User authentication, room management, real-time card gameplay

## High-Level Goals
1. **User System**: Simple authentication without password verification (demo system)
2. **Room System**: Create/join rooms, player management, game session coordination
3. **Game System**: Full Dou Dizhu card game implementation with real-time multiplayer

## Project Structure
- **Monorepo Setup**: Using Turbo + pnpm for workspace management
- **Client Application**: Next.js frontend with Socket.IO for real-time communication
- **Server Application**: Express.js backend with Socket.IO, MongoDB, and Redis

## Success Criteria
- Users can register/login and create/join game rooms
- Real-time multiplayer Dou Dizhu gameplay works smoothly
- Proper game state management and session handling
- Clean, responsive UI for all game interactions

## Constraints
- Demo system (simplified authentication)
- Focus on core gameplay over advanced features
- Real-time performance is critical for gameplay experience
