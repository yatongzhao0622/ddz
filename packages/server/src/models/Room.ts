import mongoose, { Document, Schema, Model } from 'mongoose';

// Room Interface (based on design.md specifications)
export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  roomName: string;
  maxPlayers: number;
  players: {
    userId: mongoose.Types.ObjectId;
    username: string;
    isReady: boolean;
    joinedAt: Date;
  }[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  gameSession?: mongoose.Types.ObjectId;
  settings: {
    isPrivate: boolean;
    autoStart: boolean;
    minPlayers: number;
  };
  
  // Instance methods
  addPlayer(userId: mongoose.Types.ObjectId, username: string): Promise<IRoom>;
  removePlayer(userId: mongoose.Types.ObjectId): Promise<IRoom>;
  togglePlayerReady(userId: mongoose.Types.ObjectId): Promise<IRoom>;
  checkAllPlayersReady(): boolean;
  canStartGame(): boolean;
  startGame(): Promise<IRoom>;
  resetAfterGame(): Promise<IRoom>;
  toSafeObject(): any;
}

// Room Model Interface with custom static methods
export interface IRoomModel extends Model<IRoom> {
  findAvailableRooms(): Promise<IRoom[]>;
  findVisibleRooms(userId?: mongoose.Types.ObjectId): Promise<IRoom[]>;
  findByRoomCode(roomCode: string): Promise<IRoom | null>;
  findUserCurrentRoom(userId: mongoose.Types.ObjectId): Promise<IRoom | null>;
  createRoom(roomData: {
    roomName: string;
    createdBy: mongoose.Types.ObjectId;
    creatorUsername: string;
    settings?: Partial<IRoom['settings']>;
  }): Promise<IRoom>;
}

// Player Sub-schema
const PlayerSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  isReady: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Room Schema
const RoomSchema = new Schema<IRoom>({
  roomName: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    minlength: [2, 'Room name must be at least 2 characters'],
    maxlength: [50, 'Room name must not exceed 50 characters']
  },
  maxPlayers: {
    type: Number,
    default: 3,
    min: 2,
    max: 4,
    required: true
  },
  players: {
    type: [PlayerSchema],
    default: [],
    validate: {
      validator: function(players: IRoom['players']) {
        return players.length <= this.maxPlayers;
      },
      message: 'Cannot exceed maximum player limit'
    }
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    default: null
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    autoStart: {
      type: Boolean,
      default: true
    },
    minPlayers: {
      type: Number,
      default: 3,
      min: 2,
      max: 4
    }
  }
}, {
  timestamps: true,
  collection: 'rooms'
});

// Indexes for performance
RoomSchema.index({ status: 1 });
RoomSchema.index({ createdBy: 1 });
RoomSchema.index({ 'players.userId': 1 });
RoomSchema.index({ createdAt: -1 });

// Instance Methods (Functional Programming Style)
RoomSchema.methods.addPlayer = async function(userId: mongoose.Types.ObjectId, username: string): Promise<IRoom> {
  // Check if room is full
  if (this.players.length >= this.maxPlayers) {
    throw new Error('Room is full');
  }
  
  // Check if player already in room
  const existingPlayer = this.players.find((p: IRoom['players'][0]) => p.userId.toString() === userId.toString());
  if (existingPlayer) {
    throw new Error('Player already in room');
  }
  
  // Add player
  this.players.push({
    userId,
    username,
    isReady: false,
    joinedAt: new Date()
  });
  
  return await this.save();
};

RoomSchema.methods.removePlayer = async function(userId: mongoose.Types.ObjectId): Promise<IRoom> {
  const playerIndex = this.players.findIndex((p: IRoom['players'][0]) => p.userId.toString() === userId.toString());
  if (playerIndex === -1) {
    throw new Error('Player not found in room');
  }
  
  this.players.splice(playerIndex, 1);
  
  // If room becomes empty, you might want to delete it or mark it for cleanup
  if (this.players.length === 0) {
    this.status = 'finished';
  }
  
  return await this.save();
};

RoomSchema.methods.togglePlayerReady = async function(userId: mongoose.Types.ObjectId): Promise<IRoom> {
  const player = this.players.find((p: IRoom['players'][0]) => p.userId.toString() === userId.toString());
  if (!player) {
    throw new Error('Player not found in room');
  }
  
  player.isReady = !player.isReady;
  return await this.save();
};

RoomSchema.methods.checkAllPlayersReady = function(): boolean {
  if (this.players.length < this.settings.minPlayers) {
    return false;
  }
  return this.players.every((player: IRoom['players'][0]) => player.isReady);
};

RoomSchema.methods.canStartGame = function(): boolean {
  console.log('🎮 Room - canStartGame - Room status:', this.status);
  console.log('🎮 Room - canStartGame - Players:', this.players);
  console.log('🎮 Room - canStartGame - Min players:', this.settings.minPlayers);
  console.log('🎮 Room - canStartGame - All players ready:', this.checkAllPlayersReady());
  return this.status === 'waiting' && 
         this.players.length >= this.settings.minPlayers && 
         this.checkAllPlayersReady();
};

RoomSchema.methods.startGame = async function(): Promise<IRoom> {
  if (!this.canStartGame()) {
    throw new Error('Cannot start game - not all conditions met');
  }
  
  this.status = 'playing';
  return await this.save();
};

RoomSchema.methods.resetAfterGame = async function(): Promise<IRoom> {
  // Reset room status
  this.status = 'waiting';
  
  // Reset all players' ready status
  this.players.forEach((player: IRoom['players'][0]) => {
    player.isReady = false;
  });
  
  // Clear game session reference
  this.gameSession = undefined;
  
  return await this.save();
};

RoomSchema.methods.toSafeObject = function() {
  return {
    id: this._id.toString(),
    name: this.roomName,
    maxPlayers: this.maxPlayers,
    currentPlayerCount: this.players.length,
    players: this.players.map((player: IRoom['players'][0]) => ({
      userId: player.userId.toString(),
      username: player.username,
      isReady: player.isReady,
      isConnected: player.isConnected || false
    })),
    status: this.status,
    createdBy: this.createdBy.toString(),
    gameSession: this.gameSession?.toString() || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static Methods (Pure Functions)
RoomSchema.statics.findAvailableRooms = function() {
  return this.find({
    status: 'waiting',
    'settings.isPrivate': false,
    $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }
  }).sort({ createdAt: -1 }).limit(20);
};

// New method: Find all visible rooms (includes user's current room even if full)
RoomSchema.statics.findVisibleRooms = function(userId?: mongoose.Types.ObjectId) {
  if (!userId) {
    // If no user ID, return only joinable rooms
    return this.find({
      status: 'waiting',
      'settings.isPrivate': false,
      $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }
    }).sort({ createdAt: -1 }).limit(20);
  }
  
  return this.find({
    $or: [
      // Joinable rooms (not full, not private, waiting)
      {
        status: 'waiting',
        'settings.isPrivate': false,
        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }
      },
      // User's current room (even if full)
      {
        'players.userId': userId,
        status: { $in: ['waiting', 'playing'] }
      }
    ]
  }).sort({ createdAt: -1 }).limit(30);
};

RoomSchema.statics.findUserCurrentRoom = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({
    'players.userId': userId,
    status: { $in: ['waiting', 'playing'] }
  });
};

RoomSchema.statics.createRoom = async function(roomData: {
  roomName: string;
  createdBy: mongoose.Types.ObjectId;
  creatorUsername: string;
  settings?: Partial<IRoom['settings']>;
}): Promise<IRoom> {
  const room = new this({
    roomName: roomData.roomName.trim(),
    createdBy: roomData.createdBy,
    players: [{
      userId: roomData.createdBy,
      username: roomData.creatorUsername,
      isReady: false,
      joinedAt: new Date()
    }],
    settings: {
      isPrivate: false,
      autoStart: true,
      minPlayers: 3,
      ...roomData.settings
    }
  });
  
  return await room.save();
};

// Export the model
export const Room = mongoose.model<IRoom, IRoomModel>('Room', RoomSchema);

// Type-safe helper functions (Pure Functions)
export const roomHelpers = {
  isValidRoomName: (roomName: string): boolean => {
    if (!roomName || typeof roomName !== 'string') return false;
    const trimmed = roomName.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  },
  
  sanitizeRoomName: (roomName: string): string => {
    return roomName.trim().slice(0, 50);
  },
  
  canPlayerJoinRoom: (room: IRoom): boolean => {
    return room.status === 'waiting' && room.players.length < room.maxPlayers;
  },
  
  getPlayersNotReady: (room: IRoom): string[] => {
    return room.players
      .filter(player => !player.isReady)
      .map(player => player.username);
  },
  
  generateRoomCode: (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}; 