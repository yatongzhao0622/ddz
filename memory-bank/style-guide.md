# Style Guide - 斗地主在线游戏

## Code Style Guidelines

### General Principles
- **Functional Programming**: Prefer FP patterns over OOP (user requirement)
- **TypeScript**: Use strong typing throughout the codebase
- **Immutability**: Favor immutable data structures and pure functions
- **Composition**: Prefer function composition over inheritance

### TypeScript Standards
- **Strict Mode**: Enable strict TypeScript compilation
- **Interface Definitions**: Use interfaces for all data structures
- **Type Guards**: Implement proper type checking and validation
- **Generic Types**: Use generics for reusable components and functions

### Frontend Code Style (Next.js + React)

#### Component Structure
```typescript
// Functional components with TypeScript
interface ComponentProps {
  // Props interface definition
}

const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic using hooks
  return (
    // JSX with TailwindCSS classes
  );
};

export default ComponentName;
```

#### Functional Patterns
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Pure Functions**: Component logic should be pure where possible
- **Immutable Updates**: Use proper state update patterns
- **Function Composition**: Compose complex logic from simple functions

#### State Management (Redux)
```typescript
// Action creators as pure functions
const createAction = (payload: PayloadType) => ({
  type: 'ACTION_TYPE',
  payload
});

// Reducers as pure functions
const reducer = (state: StateType, action: ActionType): StateType => {
  switch (action.type) {
    case 'ACTION_TYPE':
      return { ...state, updatedField: action.payload };
    default:
      return state;
  }
};
```

### Backend Code Style (Express + Node.js)

#### Route Handlers
```typescript
// Pure function handlers
const handleRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await processRequest(req.body);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
};

// Separate business logic from HTTP concerns
const processRequest = async (data: RequestData): Promise<ResponseData> => {
  // Pure business logic
};
```

#### Socket.IO Event Handlers
```typescript
// Functional event handlers
const handleSocketEvent = (socket: Socket) => (data: EventData) => {
  const result = processEvent(data);
  socket.emit('response', result);
};

// Pure event processing functions
const processEvent = (data: EventData): ResponseData => {
  // Pure game logic
};
```

### Database Patterns

#### Mongoose Schemas
```typescript
// Clean schema definitions
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true },
  // Additional fields
});

// Separate business logic from schema
const createUser = async (userData: CreateUserData): Promise<IUser> => {
  return await User.create(userData);
};
```

## Naming Conventions

### File Naming
- **Components**: PascalCase (e.g., `GameRoom.tsx`)
- **Utilities**: camelCase (e.g., `gameLogic.ts`)
- **Constants**: UPPERCASE (e.g., `GAME_CONSTANTS.ts`)
- **Types**: PascalCase with suffix (e.g., `GameTypes.ts`)

### Variable Naming
- **Functions**: camelCase, descriptive verbs (e.g., `calculateScore`)
- **Variables**: camelCase, descriptive nouns (e.g., `playerCards`)
- **Constants**: UPPERCASE with underscores (e.g., `MAX_PLAYERS`)
- **Types/Interfaces**: PascalCase with descriptive names

### Function Design
- **Pure Functions**: No side effects where possible
- **Single Responsibility**: Each function should have one clear purpose
- **Descriptive Names**: Function names should clearly indicate what they do
- **Small Functions**: Keep functions focused and manageable

## Project Structure Guidelines

### Directory Organization
```
packages/
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Redux store and slices
│   │   ├── utils/          # Pure utility functions
│   │   └── types/          # TypeScript type definitions
└── server/
    ├── src/
    │   ├── routes/         # Express route handlers
    │   ├── models/         # Database models
    │   ├── services/       # Business logic services
    │   ├── utils/          # Pure utility functions
    │   ├── middleware/     # Express middleware
    │   └── types/          # TypeScript type definitions
```

### Import Organization
```typescript
// External libraries first
import React from 'react';
import { Socket } from 'socket.io';

// Internal imports grouped by type
import { GameState } from '../types/GameTypes';
import { calculateWinner } from '../utils/gameLogic';
import GameCard from '../components/GameCard';
```

## Error Handling Guidelines

### Functional Error Handling
```typescript
// Use Result/Either patterns for error handling
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

const processAction = (input: InputType): Result<OutputType, ErrorType> => {
  try {
    const result = performAction(input);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
};
```

### Validation Patterns
```typescript
// Pure validation functions
const validateInput = (input: unknown): input is ValidInputType => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'requiredField' in input
  );
};
```

## Documentation Standards

### Code Comments
- **Function Documentation**: JSDoc for all public functions
- **Complex Logic**: Inline comments for non-obvious code
- **Business Rules**: Clear comments explaining game rules and logic

### Commit Messages
- **Format**: `type(scope): description`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Examples**: 
  - `feat(auth): add user registration endpoint`
  - `fix(game): resolve card distribution bug`

## Performance Guidelines

### Frontend Performance
- **Component Optimization**: Use React.memo for pure components
- **State Updates**: Minimize unnecessary re-renders
- **Bundle Size**: Code splitting and lazy loading where appropriate

### Backend Performance
- **Database Queries**: Optimize MongoDB queries and indexing
- **Socket.IO**: Efficient event handling and room management
- **Memory Management**: Proper cleanup of game sessions and connections

This style guide ensures consistent, maintainable, and performant code following functional programming principles throughout the project.
