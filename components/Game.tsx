import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { LevelData } from '../types';
import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT, COLORS, PHYSICS_CONFIG, CAT_PLAYER, CAT_BLOCK, CAT_SENSOR } from '../constants';
import { audioController } from '../services/audioService';

interface GameProps {
  level: LevelData;
  onLevelComplete: (coins: number) => void;
  onGameOver: (reason: string) => void;
  onBack: () => void;
}

const Game: React.FC<GameProps> = ({ level, onLevelComplete, onGameOver, onBack }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerRef = useRef<Matter.Body | null>(null);
  const isGroundedRef = useRef<boolean>(false);
  const touchInputRef = useRef({ left: false, right: false, jump: false });
  const isLevelClearingRef = useRef<boolean>(false); // 标记是否正在播放通关动画
  
  const [blocksLeft, setBlocksLeft] = useState(level.blockLimit);
  const [coinsLeft, setCoinsLeft] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [particles, setParticles] = useState<{x:number, y:number, vx:number, vy:number, color:string, life:number}[]>([]);
  const [scale, setScale] = useState(1);
  const [isMuted, setIsMuted] = useState(audioController.getMuted());

  // 响应式缩放计算
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, GAME_WIDTH); // 32px padding
      const newScale = maxWidth / GAME_WIDTH;
      setScale(newScale);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 关卡切换时重置状态
  useEffect(() => {
    setBlocksLeft(level.blockLimit);
    setCoinsLeft(0);
    setError(null);
    setIsPaused(false);
    setParticles([]);
    isLevelClearingRef.current = false;
  }, [level]);

  // BGM 控制
  useEffect(() => {
    audioController.play();
    return () => {
      audioController.stop();
    };
  }, []);

  const toggleMute = () => {
    const muted = audioController.toggleMute();
    setIsMuted(muted);
  };

  // 暂停逻辑
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.enabled = !isPaused;
    }
  }, [isPaused]);

  useEffect(() => {
    if (!sceneRef.current) return;

    // 稳健的 Matter.js 导入处理
    // @ts-ignore
    const MatterInstance = Matter.default || Matter;

    if (!MatterInstance || !MatterInstance.Engine) {
      console.error("Matter.js 未正确加载", MatterInstance);
      setError("物理引擎加载失败");
      return;
    }

    const Engine = MatterInstance.Engine,
          Render = MatterInstance.Render,
          Runner = MatterInstance.Runner,
          Bodies = MatterInstance.Bodies,
          Composite = MatterInstance.Composite,
          Events = MatterInstance.Events,
          World = MatterInstance.World,
          Body = MatterInstance.Body;

    let engine: Matter.Engine;
    let render: Matter.Render;
    let runner: Matter.Runner;
    let initialCoins = 0;

    try {
      engine = Engine.create();
      engineRef.current = engine;
      engine.gravity.y = 1.5; // 稍重的重力以获得干脆的跳跃手感

      render = Render.create({
        element: sceneRef.current,
        engine: engine,
        options: {
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          wireframes: false,
          background: COLORS.bg,
          pixelRatio: window.devicePixelRatio || 1
        }
      });

      // --- 关卡解析 ---
      const worldBodies: Matter.Body[] = [];
      let playerStart = { x: 100, y: 100 };

      level.grid.forEach((row, r) => {
        [...row].forEach((char, c) => {
          const x = c * TILE_SIZE + TILE_SIZE / 2;
          const y = r * TILE_SIZE + TILE_SIZE / 2;

          if (char === '#') {
            // 墙壁
            worldBodies.push(Bodies.rectangle(x, y, TILE_SIZE, TILE_SIZE, { 
              isStatic: true,
              label: 'wall',
              render: { visible: false } // Disable default render
            }));
          } else if (char === 'P') {
            playerStart = { x, y };
          } else if (char === 'B') {
            // 预置方块 (静态)
            worldBodies.push(Bodies.rectangle(x, y, TILE_SIZE - 2, TILE_SIZE - 2, { 
              isStatic: true,
              label: 'block',
              collisionFilter: { category: CAT_BLOCK },
              render: { visible: false }
            }));
          } else if (char === 'o') {
            // 金币
            initialCoins++;
            worldBodies.push(Bodies.circle(x, y, TILE_SIZE / 4, { 
              isStatic: true, 
              label: 'coin',
              isSensor: true,
              collisionFilter: { category: CAT_SENSOR },
              render: { visible: false }
            }));
          } else if (char === 'C') {
            // 宝箱
            worldBodies.push(Bodies.rectangle(x, y, TILE_SIZE * 0.8, TILE_SIZE * 0.8, { 
              isStatic: true, 
              label: 'chest',
              isSensor: true,
              collisionFilter: { category: CAT_SENSOR },
              render: { visible: false }
            }));
          }
        });
      });

      setCoinsLeft(initialCoins);

      // --- 创建玩家 (使用组合体进行地面检测) ---
      const playerBody = Bodies.rectangle(playerStart.x, playerStart.y, TILE_SIZE * 0.7, TILE_SIZE * 0.7, {
        label: 'playerBody',
        render: { visible: false }
      });
      
      const playerSensor = Bodies.rectangle(playerStart.x, playerStart.y + TILE_SIZE * 0.35, TILE_SIZE * 0.5, 5, {
        isSensor: true,
        label: 'playerSensor',
        render: { visible: false }
      });

      const player = Body.create({
        parts: [playerBody, playerSensor],
        label: 'player',
        inertia: Infinity, // 防止旋转
        friction: 0.0,
        frictionAir: 0.05,
        collisionFilter: { category: CAT_PLAYER }
      });

      playerRef.current = player;
      worldBodies.push(player);

      // 死亡判定底板
      const ground = Bodies.rectangle(GAME_WIDTH/2, GAME_HEIGHT + 200, GAME_WIDTH + 200, 400, { 
        isStatic: true, 
        label: 'death',
        render: { visible: false }
      });
      worldBodies.push(ground);

      Composite.add(engine.world, worldBodies);

      // --- 3D 渲染辅助函数 ---
      const draw3DBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, colorDark: string) => {
        const depth = 6;
        
        // 侧面 (右)
        ctx.fillStyle = colorDark;
        ctx.beginPath();
        ctx.moveTo(x + w/2, y - h/2);
        ctx.lineTo(x + w/2 + depth, y - h/2 - depth);
        ctx.lineTo(x + w/2 + depth, y + h/2 - depth);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.fill();

        // 顶面
        ctx.beginPath();
        ctx.moveTo(x - w/2, y - h/2);
        ctx.lineTo(x - w/2 + depth, y - h/2 - depth);
        ctx.lineTo(x + w/2 + depth, y - h/2 - depth);
        ctx.lineTo(x + w/2, y - h/2);
        ctx.fill();

        // 正面
        ctx.fillStyle = color;
        ctx.fillRect(x - w/2, y - h/2, w, h);
        
        // 边框
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w/2, y - h/2, w, h);
      };

      // --- 自定义渲染 (2.5D 像素风格) ---
      Events.on(render, 'afterRender', () => {
        const ctx = render.context;
        const bodies = Composite.allBodies(engine.world);

        const sortedBodies = [...bodies].sort((a, b) => {
           if (Math.abs(a.position.y - b.position.y) > 2) { 
             return b.position.y - a.position.y; // Y Descending
           }
           return a.position.x - b.position.x; // X Ascending
        });

        sortedBodies.forEach(body => {
          // 跳过不需要绘制的物体
          if (['death', 'playerSensor'].includes(body.label)) return;

          const { x, y } = body.position;

          // 处理组合体部分 (玩家)
          if (body.label === 'player') {
             draw3DBlock(ctx, x, y, TILE_SIZE * 0.7, TILE_SIZE * 0.7, COLORS.player, COLORS.playerDark);
             
             // 脸部
             ctx.fillStyle = '#fb923c'; 
             ctx.fillRect(x - 10, y - 5, 6, 6);
             ctx.fillRect(x + 4, y - 5, 6, 6);
             ctx.fillStyle = '#1e293b'; 
             const dir = Math.sign(body.velocity.x) || 1;
             ctx.fillRect(x + (2*dir) - 6, y + 2, 4, 4);
             ctx.fillRect(x + (2*dir) + 2, y + 2, 4, 4);

             // 接地特效：当在地面时显示小灰尘
             if (isGroundedRef.current) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(x - 14, y + 10, 4, 2);
                ctx.fillRect(x + 10, y + 10, 4, 2);
             }
          }
          else if (body.label === 'block') {
             draw3DBlock(ctx, x, y, TILE_SIZE - 2, TILE_SIZE - 2, COLORS.block, COLORS.blockDark);
             // 脸部
             ctx.fillStyle = '#78350f'; 
             ctx.fillRect(x - 8, y - 5, 4, 4);
             ctx.fillRect(x + 4, y - 5, 4, 4);
             ctx.fillRect(x - 4, y + 5, 8, 2);
          }
          else if (body.label === 'wall') {
             draw3DBlock(ctx, x, y, TILE_SIZE, TILE_SIZE, COLORS.wall, COLORS.wallDark);
          }
          else if (body.label === 'chest') {
             draw3DBlock(ctx, x, y, TILE_SIZE * 0.8, TILE_SIZE * 0.8, COLORS.chest, COLORS.chestDark);
             ctx.fillStyle = '#fbbf24';
             ctx.fillRect(x - 5, y - 2, 10, 4);
             ctx.fillStyle = '#fcd34d';
             ctx.fillRect(x - 14, y - 8, 28, 2);
          }
          else if (body.label === 'coin') {
             // 金币做个简单的跳动效果
             const offset = Math.sin(Date.now() / 200) * 3;
             ctx.beginPath();
             ctx.arc(x, y + offset, TILE_SIZE/4, 0, Math.PI * 2);
             ctx.fillStyle = COLORS.coin;
             ctx.fill();
             ctx.lineWidth = 2;
             ctx.strokeStyle = '#b45309';
             ctx.stroke();
             ctx.fillStyle = '#fcd34d';
             ctx.font = '12px VT323';
             ctx.fillText('$', x - 3, y + offset + 4);
          }
        });

        // --- 通关动画渲染 ---
        if (isLevelClearingRef.current) {
          ctx.save();
          // 半透明遮罩
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

          // 动态文字
          const time = Date.now();
          const scale = 1 + Math.sin(time / 200) * 0.1;
          const yOffset = Math.sin(time / 300) * 10;
          
          ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2 + yOffset);
          ctx.scale(scale, scale);
          
          ctx.font = '60px VT323';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // 文字阴影
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#78350f';
          ctx.strokeText('LEVEL CLEAR!', 0, 0);
          
          // 文字主体
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('LEVEL CLEAR!', 0, 0);
          
          ctx.restore();
        }
      });

      // --- 碰撞逻辑 (着地检测 & 交互) ---
      Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        pairs.forEach(pair => {
          const { bodyA, bodyB } = pair;
          
          // 着地检测
          if ((bodyA.label === 'playerSensor' && !bodyB.isSensor) || 
              (bodyB.label === 'playerSensor' && !bodyA.isSensor)) {
            isGroundedRef.current = true;
          }

          // 金币/宝箱 碰撞
          const other = bodyA.label === 'player' || bodyA.label === 'playerBody' || bodyA.label === 'playerSensor' ? bodyB : bodyA;
          const playerPart = other === bodyA ? bodyB : bodyA; // 发生碰撞的玩家部分

          if (other.label === 'coin' || other.label === 'chest') {
             // 检查碰撞的是否是玩家的一部分
             const isPlayer = playerPart.parent && playerPart.parent.label === 'player';
             
             if (isPlayer) {
               if (other.label === 'coin') {
                 World.remove(engine.world, other);
                 setCoinsLeft(prev => prev - 1);
               } else if (other.label === 'chest') {
                 // 必须收集所有金币
                 // 注意：这里读取的是实时物理世界中的金币数量
                 const coinsRemaining = Composite.allBodies(engine.world).filter(b => b.label === 'coin').length;
                 
                 // 如果收集完所有金币，且尚未触发通关
                 if (coinsRemaining === 0 && !isLevelClearingRef.current) {
                   isLevelClearingRef.current = true; // 锁定状态

                   // 触发烟花特效
                   for(let i=0; i<80; i++) {
                      setParticles(prev => [...prev, {
                        x: other.position.x, 
                        y: other.position.y,
                        vx: (Math.random() - 0.5) * 15, // 更大的爆炸范围
                        vy: (Math.random() - 0.5) * 15 - 8,
                        color: ['#f00', '#0f0', '#00f', '#ff0', '#fff', '#ffa500'][Math.floor(Math.random()*6)],
                        life: 150 // 更长的生命周期
                      }]);
                   }

                   // 延迟调用通关回调
                   setTimeout(() => {
                      onLevelComplete(initialCoins);
                      Runner.stop(runner); // 动画播放完再停止
                   }, 2500);
                 }
               }
             }
          }
        });
      });

      // --- 逻辑循环 ---
      runner = Runner.create();
      runnerRef.current = runner;
      Runner.run(runner, engine);
      Render.run(render);

    } catch (e) {
      console.error("Error initializing game:", e);
      setError("游戏初始化错误");
      return;
    }

    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
      keys[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let tickCounter = 0;
    
    // 逻辑更新事件
    Events.on(engine, 'beforeUpdate', () => {
      if (!playerRef.current) return;
      const player = playerRef.current;
      
      // 如果正在播放通关动画，冻结玩家移动
      if (isLevelClearingRef.current) {
        MatterInstance.Body.setVelocity(player, { x: 0, y: 0 }); // 停止玩家
        // 保持玩家悬停或站立
        if (player.velocity.y > 0) MatterInstance.Body.setVelocity(player, { x: 0, y: player.velocity.y });
        return;
      }

      // 使用 Query 进行严格的着地检测
      const sensor = player.parts.find(p => p.label === 'playerSensor');
      if (sensor) {
        const collisions = MatterInstance.Query.collides(sensor, Composite.allBodies(engine.world).filter(b => b.id !== player.id && !b.isSensor));
        isGroundedRef.current = collisions.length > 0;
      }

      // 移动
      const speed = 3;
      // 精确跳跃 1 格高度
      const jumpForce = 9; 
      
      let dx = 0;
      if (keys['KeyA'] || keys['ArrowLeft'] || touchInputRef.current.left) dx -= speed;
      if (keys['KeyD'] || keys['ArrowRight'] || touchInputRef.current.right) dx += speed;

      MatterInstance.Body.setVelocity(player, {
        x: dx,
        y: player.velocity.y
      });

      // 跳跃 (仅在着地时)
      if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space'] || touchInputRef.current.jump)) {
        if (isGroundedRef.current && player.velocity.y >= 0 && player.velocity.y < 1) {
             MatterInstance.Body.setVelocity(player, { x: player.velocity.x, y: -jumpForce });
        }
      }

      // 坠落检测
      if (player.position.y > GAME_HEIGHT + 50) {
        if (!player.isStatic) { 
           player.isStatic = true; 
           onGameOver("你掉进了无尽深渊！");
        }
      }

      // 四连消除逻辑
      tickCounter++;
      if (tickCounter % 15 === 0) {
        const blocks = Composite.allBodies(engine.world).filter(b => b.label === 'block');
        const toRemove = new Set<Matter.Body>();
        const gridMap: { [key: string]: Matter.Body } = {};
        
        blocks.forEach(b => {
           const gx = Math.round(b.position.x / TILE_SIZE);
           const gy = Math.round(b.position.y / TILE_SIZE);
           gridMap[`${gx},${gy}`] = b;
        });

        for (const key in gridMap) {
           const [gx, gy] = key.split(',').map(Number);
           // 水平检测
           let countH = 1;
           let i = 1;
           while (gridMap[`${gx + i},${gy}`]) { countH++; i++; }
           if (countH >= 4) {
             for (let k = 0; k < countH; k++) toRemove.add(gridMap[`${gx + k},${gy}`]);
           }
           
           // 垂直检测
           let countV = 1;
           let j = 1;
           while (gridMap[`${gx},${gy + j}`]) { countV++; j++; }
           if (countV >= 4) {
             for (let k = 0; k < countV; k++) toRemove.add(gridMap[`${gx},${gy + k}`]);
           }
        }

        if (toRemove.size > 0) {
          // 添加消除特效
          const debris: {x:number, y:number, vx:number, vy:number, color:string, life:number}[] = [];
          toRemove.forEach(body => {
             for(let k=0; k<12; k++) {
                debris.push({
                   x: body.position.x + (Math.random() - 0.5) * 20,
                   y: body.position.y + (Math.random() - 0.5) * 20,
                   vx: (Math.random() - 0.5) * 12,
                   vy: (Math.random() - 0.5) * 12,
                   color: COLORS.block,
                   life: 40 + Math.random() * 20
                });
             }
          });
          setParticles(prev => [...prev, ...debris]);
          
          World.remove(engine.world, Array.from(toRemove));
        }
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (render) {
        Render.stop(render);
        if (render.canvas) render.canvas.remove();
      }
      if (runner) Runner.stop(runner);
      if (engine) {
        World.clear(engine.world, false);
        Engine.clear(engine);
      }
      // Stop music on unmount
      audioController.stop();
    };
  }, [level, onLevelComplete, onGameOver]);

  // 粒子系统循环
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
       setParticles(prev => prev.map(p => ({
         ...p,
         x: p.x + p.vx,
         y: p.y + p.vy,
         vy: p.vy + 0.5, // 重力
         life: p.life - 1
       })).filter(p => p.life > 0));
    }, 16);
    return () => clearInterval(interval);
  }, [particles]);

  const placeBlock = (targetX: number, targetY: number) => {
    if (isPaused || blocksLeft <= 0 || !engineRef.current || !playerRef.current || isLevelClearingRef.current) return;
    
    // @ts-ignore
    const MatterInstance = Matter.default || Matter;

    const gx = Math.floor(targetX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const gy = Math.floor(targetY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const gridPos = { x: gx, y: gy };

    // 检查范围 (限制放置范围以保持合理性)
    const playerPos = playerRef.current.position;
    const dist = Math.hypot(gridPos.x - playerPos.x, gridPos.y - playerPos.y);
    if (dist > TILE_SIZE * 6) return; 

    // 检查是否被占用
    const bodies = MatterInstance.Composite.allBodies(engineRef.current.world);
    const isOccupied = bodies.some((b: any) => 
      MatterInstance.Bounds.contains(b.bounds, gridPos) && 
      MatterInstance.Vertices.contains(b.vertices, gridPos)
    );

    if (!isOccupied) {
       // 创建静态空中方块
       const newBlock = MatterInstance.Bodies.rectangle(gridPos.x, gridPos.y, TILE_SIZE - 2, TILE_SIZE - 2, {
         label: 'block',
         isStatic: true, // 空中静止
         collisionFilter: { category: CAT_BLOCK },
         render: { visible: false }
       });
       MatterInstance.World.add(engineRef.current.world, newBlock);
       setBlocksLeft(prev => prev - 1);

       // 放置方块特效
       const burstParticles: any[] = [];
       for(let k=0; k<8; k++) {
          burstParticles.push({
             x: gridPos.x + (Math.random() - 0.5) * 10,
             y: gridPos.y + (Math.random() - 0.5) * 10,
             vx: (Math.random() - 0.5) * 5,
             vy: (Math.random() - 0.5) * 5,
             color: COLORS.block,
             life: 20 + Math.random() * 10
          });
       }
       setParticles(prev => [...prev, ...burstParticles]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const gx = Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const gy = Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    setCursorPos({ x: gx, y: gy });
  };

  const handleMouseClick = (e: React.MouseEvent) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    placeBlock(x, y);
  };

  // 触摸逻辑
  const handleTouchStart = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
    e.preventDefault();
    if (action === 'jump') touchInputRef.current.jump = true;
    else if (action === 'left') touchInputRef.current.left = true;
    else if (action === 'right') touchInputRef.current.right = true;
  };
  const handleTouchEnd = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
    e.preventDefault();
    if (action === 'jump') touchInputRef.current.jump = false;
    else if (action === 'left') touchInputRef.current.left = false;
    else if (action === 'right') touchInputRef.current.right = false;
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // 防止双重触发
    // 允许放置方块
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / scale;
    const y = (touch.clientY - rect.top) / scale;
    placeBlock(x, y);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center w-[600px] h-[400px] bg-red-100 border-4 border-red-500 text-red-900 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="relative select-none flex flex-col items-center">
      <div 
        style={{ 
          width: GAME_WIDTH * scale, 
          height: GAME_HEIGHT * scale,
          position: 'relative'
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: GAME_WIDTH, height: GAME_HEIGHT }} className="relative">
          <div className="absolute top-2 left-2 right-2 flex justify-between text-2xl font-bold text-slate-700 pointer-events-none z-10">
            <div className="bg-white/80 px-2 rounded">关卡 {level.id}: {level.name}</div>
            <div className="flex gap-4 bg-white/80 px-2 rounded">
              <span className={coinsLeft === 0 ? "text-green-600 animate-pulse" : ""}>
                金币: {coinsLeft}
              </span>
              <span className={blocksLeft === 0 ? "text-red-500" : ""}>
                方块: {blocksLeft}
              </span>
            </div>
          </div>
          
          {/* 右上角按钮组 */}
          <div className="absolute top-2 right-2 z-20 pointer-events-auto flex gap-2">
            <button 
              onClick={toggleMute} 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              )}
            </button>
            <button onClick={() => setIsPaused(true)} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
          </div>

          <div 
            ref={sceneRef}
            className="cursor-none border-4 border-slate-700 rounded bg-blue-50 relative overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseClick}
            onTouchStart={handleCanvasTouchStart}
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
          >
            {/* 彩带特效 */}
            {particles.map((p, i) => (
              <div key={i} style={{
                  position: 'absolute',
                  left: p.x, top: p.y,
                  width: 8, height: 8,
                  backgroundColor: p.color,
                  pointerEvents: 'none'
              }} />
            ))}
          </div>
          
          {/* 网格光标 (仅鼠标模式/PC端 显示) */}
          {!isPaused && (
            <div 
              className="absolute pointer-events-none border-2 border-slate-900 z-20 transition-all duration-75 hidden lg:block"
              style={{
                left: cursorPos.x - TILE_SIZE/2,
                top: cursorPos.y - TILE_SIZE/2,
                width: TILE_SIZE,
                height: TILE_SIZE,
                opacity: blocksLeft > 0 ? 1 : 0.3,
                borderColor: blocksLeft > 0 ? '#000' : '#f00'
              }}
            >
              <div className="absolute top-[-2px] left-[-2px] w-3 h-3 border-t-4 border-l-4 border-slate-900"/>
              <div className="absolute top-[-2px] right-[-2px] w-3 h-3 border-t-4 border-r-4 border-slate-900"/>
              <div className="absolute bottom-[-2px] left-[-2px] w-3 h-3 border-b-4 border-l-4 border-slate-900"/>
              <div className="absolute bottom-[-2px] right-[-2px] w-3 h-3 border-b-4 border-r-4 border-slate-900"/>
            </div>
          )}

          {/* 暂停菜单遮罩 */}
          {isPaused && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white p-8 border-4 border-slate-800 rounded shadow-xl text-center pointer-events-auto">
                  <h2 className="text-3xl font-bold mb-6">已暂停</h2>
                  <div className="flex flex-col gap-4 w-48">
                    <button onClick={() => setIsPaused(false)} className="bg-amber-400 py-2 border-b-4 border-amber-600 font-bold hover:bg-amber-500 active:translate-y-1 active:border-b-0">
                      继续游戏
                    </button>
                    <button onClick={onBack} className="bg-slate-200 py-2 border-b-4 border-slate-400 font-bold hover:bg-slate-300 active:translate-y-1 active:border-b-0">
                      返回菜单
                    </button>
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 虚拟控制按钮 (移动端显示 - PC端隐藏) */}
      <div className="flex justify-between w-full max-w-[600px] mt-4 px-2 select-none touch-none lg:hidden">
        <div className="flex gap-4">
          <button 
            className="w-16 h-16 bg-slate-200 rounded-full border-4 border-slate-400 active:bg-slate-300 active:scale-95 flex items-center justify-center"
            onTouchStart={handleTouchStart('left')}
            onTouchEnd={handleTouchEnd('left')}
            onMouseDown={() => touchInputRef.current.left = true}
            onMouseUp={() => touchInputRef.current.left = false}
          >
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button 
            className="w-16 h-16 bg-slate-200 rounded-full border-4 border-slate-400 active:bg-slate-300 active:scale-95 flex items-center justify-center"
            onTouchStart={handleTouchStart('right')}
            onTouchEnd={handleTouchEnd('right')}
            onMouseDown={() => touchInputRef.current.right = true}
            onMouseUp={() => touchInputRef.current.right = false}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        
        <button 
          className="w-20 h-20 bg-amber-400 rounded-full border-4 border-amber-600 active:bg-amber-500 active:scale-95 flex items-center justify-center shadow-lg"
          onTouchStart={handleTouchStart('jump')}
          onTouchEnd={handleTouchEnd('jump')}
          onMouseDown={() => touchInputRef.current.jump = true}
          onMouseUp={() => touchInputRef.current.jump = false}
        >
           <span className="font-bold text-xl text-slate-900">JUMP</span>
        </button>
      </div>

      <div className="mt-4 text-center text-slate-500 text-sm hidden lg:block font-bold bg-white/50 px-4 py-1 rounded-full">
        [WASD / 方向键] 移动 & 跳跃 • [鼠标点击] 放置/消除方块
      </div>
    </div>
  );
};

export default Game;