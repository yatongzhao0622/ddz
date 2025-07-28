# Product Context - 斗地主在线游戏

## Game Overview
**Dou Dizhu (斗地主)** is a popular Chinese card game typically played by three players. This online implementation focuses on providing a real-time multiplayer experience.

## Core Product Features

### User Management
- **Simple Authentication**: Demo system without password verification
- **User Profile**: Basic username-based identification
- **Session Management**: JWT-based authentication

### Room System
- **Room Creation**: Users can create named game rooms
- **Room Discovery**: Browse available rooms
- **Player Management**: 3-player capacity per room
- **Room States**: `waiting`, `playing`, `finished`

### Game Mechanics
- **Player Roles**: 
  - Landlord (地主): 1 player
  - Farmers (农民): 2 players
- **Game Phases**:
  - `bidding`: Players bid to become landlord
  - `playing`: Active card gameplay
  - `finished`: Game completed
- **Card Management**: Full deck distribution and hand management

### Real-time Features
- **Live Updates**: Socket.IO for real-time game state synchronization
- **Player Actions**: Ready/unready, bidding, card plays
- **Game Events**: Turn notifications, game state changes

## User Experience Flow

### New User Journey
1. Visit `/login` → Register/Login
2. Redirect to `/` → See room list or current room
3. Join/Create room → Wait for players
4. Ready up → Start game → Play Dou Dizhu

### Room Management Flow
- **Not in room**: Show room list + create room option
- **In room**: Show game interface
- **Room full**: Auto-start game when all players ready

## Product Constraints
- **Demo Focus**: Simplified authentication for demonstration
- **Real-time Performance**: Critical for gameplay experience
- **3-Player Limit**: Fixed game format
- **Session-based**: Games are temporary, no persistent history

## Success Metrics
- Smooth real-time gameplay without lag
- Intuitive room creation and joining
- Clear game state communication
- Responsive UI across different devices
