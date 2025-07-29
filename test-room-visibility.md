# 🧪 Room Visibility Test Scenario

## Test Case: Third Player Room Visibility

### Before Fix (Problem):
1. Player 1 creates room "Test Room" (1/3)
2. Player 2 joins room (2/3) 
3. Player 3 joins room (3/3) ← **Room becomes full**
4. ❌ **BUG**: Room disappears from ALL players' room lists
5. ❌ Player 3 can't see room detail page
6. ❌ No way to access room interior

### After Fix (Solution):
1. Player 1 creates room "Test Room" (1/3)
2. Player 2 joins room (2/3)
3. Player 3 joins room (3/3) ← **Room becomes full**
4. ✅ **FIXED**: Each player sees personalized room list:
   - Players 1,2,3: See "Test Room" marked as "我的房间"
   - Other players: Don't see full room (can't join)
5. ✅ All players can access room detail page
6. ✅ All players can use room interior features

## Test Steps:
1. Open 3 browser tabs/devices
2. Login as different users
3. Create room with Player 1
4. Join with Player 2 (room shows 2/3)
5. Join with Player 3 (room shows 3/3)
6. **Verify**: All 3 players still see the room in their lists
7. **Verify**: Room shows as "我的房间" for all 3 players
8. **Verify**: New players don't see the full room
9. **Verify**: All players can navigate to room detail page

## Expected Result:
- ✅ Third player can see and access room
- ✅ Room visibility is personalized per user
- ✅ No more disappearing rooms! 