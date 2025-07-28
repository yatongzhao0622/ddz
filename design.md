# 斗地主在线游戏

## tech stack

- typescript
- monorepo, turbo, pnpm
- client
    - nextjs
    - socket.io-client
    - tailwindcss
    - redux
- server
    - express
    - socket.io
    - mongoose
    - ioredis
    - dotenv
    - jsonwebtoken

## data model

- Users Collection - 只是一个演示系统，不需要验证密码
    
    ```jsx
    {
      _id: ObjectId,
      username: String
    }
    ```
    
- Rooms Collection
    
    ```jsx
    {
      _id: ObjectId,
      name: String,
      createdBy: ObjectId,
      players: [ObjectId],
      status: String, // 'waiting', 'playing', 'finished'
      gameSessionId: ObjectId,
      createdAt: Date,
      updatedAt: Date
    }
    ```
    
- Game Sessions Collection
    
    ```jsx
    {
      _id: ObjectId,
      roomId: ObjectId,
      players: [{
    	  userId: ObjectId,
    	  username: String,
    	  cards: [Card],
    	  isLandlord: Boolean,
    	  isReady: Boolean,
      }],
      state: {
    	  currentPlayer: ObjectId,
    	  landlord: ObjectId,
    	  gamePhase: String, // 'bidding', 'playing', 'finished'
      },
      deck: [Card]
    }
    ```
    

## components

- 用户系统
    - 前端
        - 规则
            - 所有除了`/login`之外的页面，都应该保证用户已经登陆，如未登录，重定向到`/login`页面
            - `/login` 页面，如用户已登陆，重定向到`/`主页
        - 页面
            - `/login` 登陆页，提供登陆注册功能
    - 后端
        - restful API
            - `/user-info GET`
                - id
                - name
                - roomId
            - `/login POST`
            - `/regist POST`
            - `/logout POST`
- 房间系统
    - 前端
        - 页面
            - `/` 主页
                - 当前用户已加入某个房间，重定向到该房间`/room/:roomId`
                - 当前用户未加入房间
                    - 显示房间列表，创建房间按钮
            - `/room/:roomId` 房间详情页
                - 当前用户不在房间内，重定向到`/`
                - 当前用户在房间内
                    - 显示打牌系统
    - 后端
        - socket.io
            - 加入房间
            - 离开房间
            - 准备/取消准备
            - 开始游戏
            - 创建房间
- 打牌系统