import mongoose, { Document, Schema, Model } from 'mongoose';

// User Interface (based on design.md specifications)
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isOnline: boolean;
  currentRoomId?: mongoose.Types.ObjectId;
  
  // Instance methods
  toSafeObject(): Partial<IUser>;
  updateLoginStatus(isOnline: boolean): Promise<IUser>;
  joinRoom(roomId: mongoose.Types.ObjectId): Promise<IUser>;
  leaveRoom(): Promise<IUser>;
}

// User Model Interface with custom static methods
export interface IUserModel extends Model<IUser> {
  findByUsername(username: string): Promise<IUser | null>;
  findOnlineUsers(): Promise<IUser[]>;
  findUsersInRoom(roomId: mongoose.Types.ObjectId): Promise<IUser[]>;
  createUser(username: string): Promise<IUser>;
}

// User Schema
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Username must be at least 2 characters'],
    maxlength: [20, 'Username must not exceed 20 characters'],
    match: [/^[a-zA-Z0-9_\u4e00-\u9fff]+$/, 'Username can only contain letters, numbers, underscore, and Chinese characters']
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'users'
});

// Indexes for performance (removing duplicate username index)
UserSchema.index({ isOnline: 1 });
UserSchema.index({ currentRoomId: 1 });

// Instance Methods (Functional Programming Style)
UserSchema.methods.toSafeObject = function(): Partial<IUser> {
  return {
    _id: this._id,
    username: this.username,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    isOnline: this.isOnline,
    currentRoomId: this.currentRoomId
  };
};

UserSchema.methods.updateLoginStatus = async function(isOnline: boolean): Promise<IUser> {
  this.isOnline = isOnline;
  if (isOnline) {
    this.lastLoginAt = new Date();
  }
  return await this.save();
};

UserSchema.methods.joinRoom = async function(roomId: mongoose.Types.ObjectId): Promise<IUser> {
  this.currentRoomId = roomId;
  return await this.save();
};

UserSchema.methods.leaveRoom = async function(): Promise<IUser> {
  this.currentRoomId = null;
  return await this.save();
};

// Static Methods (Pure Functions)
UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.trim() });
};

UserSchema.statics.findOnlineUsers = function() {
  return this.find({ isOnline: true });
};

UserSchema.statics.findUsersInRoom = function(roomId: mongoose.Types.ObjectId) {
  return this.find({ currentRoomId: roomId });
};

UserSchema.statics.createUser = async function(username: string): Promise<IUser> {
  const trimmedUsername = username.trim();
  
  // Check if username already exists  
  const existingUser = await this.findOne({ username: trimmedUsername });
  if (existingUser) {
    throw new Error('Username already exists');
  }
  
  const user = new this({
    username: trimmedUsername,
    isOnline: true,
    lastLoginAt: new Date()
  });
  
  return await user.save();
};

// Pre-save middleware for validation
UserSchema.pre('save', function(next) {
  if (this.isModified('username')) {
    this.username = this.username.trim();
  }
  next();
});

// Export the model with proper typing
export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

// Type-safe helper functions (Pure Functions)
export const userHelpers = {
  isValidUsername: (username: string): boolean => {
    if (!username || typeof username !== 'string') return false;
    const trimmed = username.trim();
    return trimmed.length >= 2 && 
           trimmed.length <= 20 && 
           /^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(trimmed);
  },
  
  sanitizeUsername: (username: string): string => {
    return username.trim().slice(0, 20);
  },
  
  getUserDisplayName: (user: IUser): string => {
    return user.username;
  },
  
  isUserOnline: (user: IUser): boolean => {
    return user.isOnline;
  },
  
  isUserInRoom: (user: IUser): boolean => {
    return !!user.currentRoomId;
  }
}; 