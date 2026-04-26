'use strict';

// ═══════════════════════════════════════════════════════════
//  MATH UTILITIES
// ═══════════════════════════════════════════════════════════
function lerp(a, b, t)   { return a + (b - a) * t; }
function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }
function dist(a, b)      { const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }

function normalizeAngle(a) {
  while (a >  Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}

function catmullRom(p0,p1,p2,p3,t) {
  const t2=t*t, t3=t2*t;
  return {
    x: .5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y: .5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
  };
}

function generateSpline(waypoints, segs) {
  const pts=[], n=waypoints.length;
  for (let i=0;i<n;i++) {
    const p0=waypoints[(i-1+n)%n], p1=waypoints[i],
          p2=waypoints[(i+1)%n],   p3=waypoints[(i+2)%n];
    for (let j=0;j<segs;j++) pts.push(catmullRom(p0,p1,p2,p3,j/segs));
  }
  return pts;
}

function nearestOnSpline(spline, pos) {
  let best=Infinity, idx=0;
  const px=pos.x, py=pos.y;
  for (let i=0,n=spline.length;i<n;i++) {
    const dx=spline[i].x-px, dy=spline[i].y-py;
    const d2=dx*dx+dy*dy;
    if (d2<best){ best=d2; idx=i; }
  }
  return { d:Math.sqrt(best), idx };
}

// ═══════════════════════════════════════════════════════════
//  TRACK DATA
// ═══════════════════════════════════════════════════════════
const TRACKS = [
  {
    id:0, name:'Sahara Circuit', description:'Fast & flowing desert track',
    theme:'desert', bgColor:'#c8a050', trackColor:'#484848',
    laps:3, trackWidth:150,
    waypoints:[
      {x:700, y:2050},{x:1100,y:2080},{x:1600,y:2090},{x:2100,y:2070},
      {x:2600,y:2020},{x:2950,y:1880},{x:3220,y:1660},{x:3360,y:1400},
      {x:3300,y:1140},{x:3080,y:950}, {x:2780,y:840}, {x:2380,y:800},
      {x:1980,y:810}, {x:1680,y:760}, {x:1480,y:820},{x:1270,y:760},
      {x:1060,y:840}, {x:820, y:980}, {x:580, y:1180},{x:480, y:1480},
      {x:530, y:1780},{x:640, y:1970}
    ],
    grid:[
      {x:700, y:2050,angle:0.1},
      {x:540, y:2085,angle:0.1},
      {x:540, y:2015,angle:0.1}
    ]
  },
  {
    id:1, name:'Forest Rally', description:'Technical forest circuit with tight hairpins',
    theme:'forest', bgColor:'#1e4a18', trackColor:'#555',
    laps:3, trackWidth:125,
    waypoints:[
      {x:820, y:2350},{x:1300,y:2320},{x:1720,y:2220},{x:2060,y:2020},
      {x:2260,y:1780},{x:2340,y:1520},{x:2280,y:1270},{x:2080,y:1070},
      {x:1820,y:940}, {x:1540,y:900}, {x:1300,y:940}, {x:1100,y:1060},
      {x:940, y:1220},{x:870, y:1430},{x:900, y:1640},{x:980, y:1850},
      {x:890, y:2050},{x:820, y:2200}
    ],
    grid:[
      {x:820, y:2350,angle:0.0},
      {x:660, y:2375,angle:0.0},
      {x:660, y:2325,angle:0.0}
    ]
  }
];

// ═══════════════════════════════════════════════════════════
//  KART DATA
// ═══════════════════════════════════════════════════════════
const KARTS = [
  {
    id:0, name:'Speed Demon', description:'Blazing fast, hard to control',
    maxSpeed:220, acceleration:155, handling:1.25, braking:280, friction:72,
    color:'#ff3333', bodyColor:'#bb0000', wheelColor:'#111', width:28, height:18
  },
  {
    id:1, name:'Road King', description:'Balanced speed and control',
    maxSpeed:185, acceleration:130, handling:1.65, braking:255, friction:65,
    color:'#4488ff', bodyColor:'#1144cc', wheelColor:'#111', width:26, height:17
  },
  {
    id:2, name:'Iron Grip', description:'Slow but incredibly precise',
    maxSpeed:155, acceleration:105, handling:2.1, braking:310, friction:55,
    color:'#33dd33', bodyColor:'#1a881a', wheelColor:'#111', width:24, height:16
  }
];

// ═══════════════════════════════════════════════════════════
//  INPUT MANAGER
// ═══════════════════════════════════════════════════════════
class InputManager {
  constructor() {
    this.keys  = {};
    this.touch = { up:false, down:false, left:false, right:false };
    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  }
  get up()    { return !!(this.keys['w']||this.keys['arrowup']   ||this.touch.up);    }
  get down()  { return !!(this.keys['s']||this.keys['arrowdown'] ||this.touch.down);  }
  get left()  { return !!(this.keys['a']||this.keys['arrowleft'] ||this.touch.left);  }
  get right() { return !!(this.keys['d']||this.keys['arrowright']||this.touch.right); }
}

// ═══════════════════════════════════════════════════════════
//  KART (physics entity)
// ═══════════════════════════════════════════════════════════
class Kart {
  constructor(data, x, y, angle) {
    Object.assign(this, {
      name:data.name, maxSpeed:data.maxSpeed, acceleration:data.acceleration,
      handling:data.handling, braking:data.braking, friction:data.friction,
      color:data.color, bodyColor:data.bodyColor, wheelColor:data.wheelColor,
      width:data.width, height:data.height
    });
    this.x=x; this.y=y; this.angle=angle;
    this.speed=0; this.vx=0; this.vy=0;
    this.offTrack=false; this.isPlayer=false;
  }

  update(input, spline, trackWidth, dt) {
    const near = nearestOnSpline(spline, this);
    this.offTrack = near.d > trackWidth/2 + 12;
    const cap = this.maxSpeed * (this.offTrack ? 0.38 : 1);

    if (input.up) {
      this.speed = Math.min(this.speed + this.acceleration*dt, cap);
    } else if (input.down) {
      if (this.speed > 0)
        this.speed = Math.max(this.speed - this.braking*dt, 0);
      else
        this.speed = Math.max(this.speed - this.acceleration*0.45*dt, -this.maxSpeed*0.3);
    } else {
      if (this.speed > 0) this.speed = Math.max(this.speed - this.friction*dt, 0);
      else if (this.speed < 0) this.speed = Math.min(this.speed + this.friction*dt, 0);
    }
    if (this.offTrack && this.speed > cap) this.speed = lerp(this.speed, cap, Math.min(4*dt,1));

    const sf  = clamp(Math.abs(this.speed)/(this.maxSpeed*0.25), 0, 1);
    const dir = this.speed >= 0 ? 1 : -1;
    if (input.left)  this.angle -= this.handling*sf*dir*dt;
    if (input.right) this.angle += this.handling*sf*dir*dt;

    this.vx = Math.cos(this.angle)*this.speed;
    this.vy = Math.sin(this.angle)*this.speed;
    this.x  = clamp(this.x + this.vx*dt, 30, 4170);
    this.y  = clamp(this.y + this.vy*dt, 30, 3170);
  }
}

// ═══════════════════════════════════════════════════════════
//  AI KART
// ═══════════════════════════════════════════════════════════
class AIKart extends Kart {
  constructor(data, x, y, angle, spline) {
    super(data, x, y, angle);
    this._spline = spline;
    this._aiInput = {up:false,down:false,left:false,right:false};
    this.aiVariance = 1;
  }
  update(_, spline, trackWidth, dt) {
    const near = nearestOnSpline(this._spline, this);
    const ahead = Math.round(28*this.aiVariance);
    const target = this._spline[(near.idx+ahead)%this._spline.length];
    const diff = normalizeAngle(Math.atan2(target.y-this.y, target.x-this.x) - this.angle);
    const tight = Math.abs(diff) > 0.45;
    this._aiInput.up    = !tight;
    this._aiInput.down  = tight && this.speed > this.maxSpeed*0.55;
    this._aiInput.left  = diff < -0.04;
    this._aiInput.right = diff >  0.04;
    super.update(this._aiInput, this._spline, trackWidth, dt);
  }
}

// ═══════════════════════════════════════════════════════════
//  GAME
// ═══════════════════════════════════════════════════════════
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.input  = new InputManager();

    // Race state
    this.state          = 'menu';
    this.selectedKart   = 0;
    this.selectedTrack  = 0;
    this.player         = null;
    this.aiKarts        = [];
    this.spline         = null;
    this.currentTrack   = null;
    this.checkpoints    = [];
    this.lap            = 1;
    this.raceTime       = 0;
    this.lapTimes       = [];       // completed lap durations
    this.lastLapTime    = 0;        // raceTime when last lap started
    this.bestLap        = Infinity;
    this.countdownTimer = 0;
    this.lastTime       = 0;
    this.camera         = {x:0,y:0};
    this._lapFlash      = 0;
    this._lapFlashMsg   = '';
    this._trees         = null;
    this._starCache     = null;
    this._netTimer      = 0;

    // Multiplayer
    this.isMultiplayer  = false;
    this.isHost         = false;
    this.socket         = null;
    this.opponentKartId = 0;
    this.opponentKart   = null;   // ghost kart driven by opponent's network data

    this._setupCanvas();
    this._bindUI();
    this._drawPreviews();
    this._connectSocket();
    requestAnimationFrame(t => this._loop(t));
  }

  // ─── SETUP ──────────────────────────────────────────────
  _setupCanvas() {
    const resize = () => { this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
  }

  // ─── SOCKET.IO ──────────────────────────────────────────
  _connectSocket() {
    try {
      this.socket = io({ autoConnect: true });
    } catch(_) { this.socket = null; return; }

    this.socket.on('room-created', ({ code }) => {
      document.getElementById('roomCodeDisplay').textContent = code;
      document.getElementById('hostStatus').textContent = 'Waiting for opponent…';
    });

    this.socket.on('opponent-joined', ({ kartId }) => {
      this.opponentKartId = kartId;
      document.getElementById('hostStatus').textContent = 'Opponent joined! Starting…';
    });

    this.socket.on('room-joined', ({ code, trackId, hostKartId }) => {
      this.selectedTrack  = trackId;
      this.opponentKartId = hostKartId;
      document.getElementById('hostStatus').textContent = 'Connected! Race starting…';
    });

    this.socket.on('join-error', msg => {
      document.getElementById('joinError').textContent = msg;
    });

    this.socket.on('race-start', () => {
      this.isMultiplayer = true;
      this._startRace();
    });

    // Live position from opponent (interpolate toward it)
    this.socket.on('opponent-update', data => {
      if (!this.opponentKart) return;
      this.opponentKart.targetX = data.x;
      this.opponentKart.targetY = data.y;
      this.opponentKart.angle   = data.angle;
      this.opponentKart.speed   = data.speed;
      this.opponentKart.netLap  = data.lap ?? this.opponentKart.netLap;
    });

    // Opponent finished a lap
    this.socket.on('opponent-lap', ({ lap, lapTime }) => {
      if (!this.opponentKart) return;
      this.opponentKart.lapTimes.push(lapTime);
      this.opponentKart.netLap   = lap + 1;
      this.opponentKart.lastLapTime = this.raceTime;
      const best = Math.min(...this.opponentKart.lapTimes);
      if (lapTime <= best) this.opponentKart.bestLap = lapTime;
    });

    this.socket.on('opponent-finished', () => {
      if (this.opponentKart) this.opponentKart.finished = true;
    });

    this.socket.on('opponent-disconnected', () => {
      this._showOverlay('Opponent disconnected', '#ff4444');
      setTimeout(() => this._clearOverlay(), 3000);
    });
  }

  _emitKartUpdate() {
    if (!this.socket || !this.isMultiplayer || !this.player) return;
    this.socket.emit('kart-update', {
      x:this.player.x, y:this.player.y,
      angle:this.player.angle, speed:this.player.speed,
      lap:this.lap
    });
  }

  // ─── UI BINDING ─────────────────────────────────────────
  _bindUI() {
    const $ = id => document.getElementById(id);

    // Menu
    $('playBtn').onclick = () => this._setState('selecting-kart');

    // Kart select
    document.querySelectorAll('.kart-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.kart-option').forEach(e=>e.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedKart = +el.dataset.kart;
      });
    });
    $('selectKartBtn').onclick  = () => this._setState('selecting-track');
    $('backToMenuBtn').onclick  = () => this._setState('menu');

    // Track select
    document.querySelectorAll('.track-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.track-option').forEach(e=>e.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedTrack = +el.dataset.track;
      });
    });
    $('toModeBtn').onclick     = () => this._setState('mode-select');
    $('backToKartBtn').onclick = () => this._setState('selecting-kart');

    // Mode select
    $('soloModeCard').addEventListener('click', () => {
      this.isMultiplayer = false;
      this._startRace();
    });
    $('multiModeCard').addEventListener('click', () => this._setState('multi-lobby'));
    $('backToTrackBtn').onclick = () => this._setState('selecting-track');

    // Multiplayer lobby tabs
    $('tabHost').addEventListener('click', () => {
      $('tabHost').classList.add('active'); $('tabJoin').classList.remove('active');
      $('hostPanel').classList.remove('hidden'); $('joinPanel').classList.add('hidden');
    });
    $('tabJoin').addEventListener('click', () => {
      $('tabJoin').classList.add('active'); $('tabHost').classList.remove('active');
      $('joinPanel').classList.remove('hidden'); $('hostPanel').classList.add('hidden');
    });

    // Host
    $('hostCancelBtn').onclick = () => this._setState('mode-select');

    // Join
    const codeInput = $('codeInput');
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
      $('joinError').textContent = '';
    });
    $('joinRoomBtn').onclick = () => {
      const code = codeInput.value.trim();
      if (code.length !== 4) { $('joinError').textContent='Enter a 4-character code'; return; }
      this.isHost = false;
      this.socket.emit('join-room', { code, kartId: this.selectedKart });
    };
    $('joinCancelBtn').onclick = () => this._setState('mode-select');

    // Results
    $('playAgainBtn').onclick = () => {
      this.isMultiplayer = false;
      this._startRace();
    };
    $('mainMenuBtn').onclick = () => this._setState('menu');

    // Mobile buttons
    const dirs = {btnLeft:'left',btnRight:'right',btnUp:'up',btnDown:'down'};
    for (const [id,dir] of Object.entries(dirs)) {
      const btn=$(id);
      if(!btn) continue;
      const set = v => { this.input.touch[dir]=v; btn.classList.toggle('pressed',v); };
      btn.addEventListener('touchstart', e=>{e.preventDefault();set(true); },{passive:false});
      btn.addEventListener('touchend',   e=>{e.preventDefault();set(false);},{passive:false});
      btn.addEventListener('touchcancel',e=>{e.preventDefault();set(false);},{passive:false});
      btn.addEventListener('mousedown', ()=>set(true));
      btn.addEventListener('mouseup',   ()=>set(false));
      btn.addEventListener('mouseleave',()=>set(false));
    }
  }

  _setState(state) {
    this.state = state;
    const map = {
      'menu':'menuScreen', 'selecting-kart':'kartSelectScreen',
      'selecting-track':'trackSelectScreen', 'mode-select':'modeSelectScreen',
      'multi-lobby':'multiLobbyScreen', 'results':'resultsScreen'
    };
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if (map[state]) document.getElementById(map[state]).classList.add('active');

    const racing = ['racing','countdown','finished'].includes(state);
    document.getElementById('mobileControls').classList.toggle('racing', racing);

    // When entering multiplayer lobby as host, create room immediately
    if (state === 'multi-lobby') {
      document.getElementById('roomCodeDisplay').textContent = '----';
      document.getElementById('hostStatus').textContent = 'Waiting for opponent…';
      document.getElementById('joinError').textContent  = '';
      document.getElementById('codeInput').value        = '';
      // Default to HOST tab
      document.getElementById('tabHost').classList.add('active');
      document.getElementById('tabJoin').classList.remove('active');
      document.getElementById('hostPanel').classList.remove('hidden');
      document.getElementById('joinPanel').classList.add('hidden');

      this.isHost = true;
      if (this.socket) {
        this.socket.emit('create-room', { kartId: this.selectedKart, trackId: this.selectedTrack });
      }
    }
  }

  // ─── PREVIEWS ───────────────────────────────────────────
  _drawPreviews() {
    TRACKS.forEach((track,i) => {
      const cvs = document.getElementById(`trackCanvas${i}`);
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      const sp  = generateSpline(track.waypoints, 8);
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      sp.forEach(p=>{ if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y; });
      const pad=12, sc=Math.min((cvs.width-pad*2)/(maxX-minX),(cvs.height-pad*2)/(maxY-minY))*.9;
      const ox=pad+(cvs.width -pad*2-(maxX-minX)*sc)/2;
      const oy=pad+(cvs.height-pad*2-(maxY-minY)*sc)/2;
      const mp=p=>({x:ox+(p.x-minX)*sc,y:oy+(p.y-minY)*sc});
      ctx.fillStyle=track.bgColor; ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.beginPath();
      sp.forEach((p,j)=>{const m=mp(p);j===0?ctx.moveTo(m.x,m.y):ctx.lineTo(m.x,m.y);});
      ctx.closePath();
      ctx.strokeStyle='#fff'; ctx.lineWidth=9; ctx.stroke();
      ctx.strokeStyle=track.trackColor; ctx.lineWidth=7; ctx.stroke();
      const s0=mp(sp[0]);
      ctx.fillStyle='#ff4400'; ctx.beginPath(); ctx.arc(s0.x,s0.y,5,0,Math.PI*2); ctx.fill();
    });

    KARTS.forEach((kart,i)=>{
      const div=document.getElementById(`kartPreview${i}`);
      if(!div)return;
      const cvs=document.createElement('canvas'); cvs.width=130; cvs.height=64;
      cvs.style.display='block'; div.appendChild(cvs);
      const ctx=cvs.getContext('2d');
      ctx.translate(65,32);
      this._drawKartShape(ctx, kart, 2.8);
    });
  }

  // ─── RACE START ──────────────────────────────────────────
  _startRace() {
    const trackData = TRACKS[this.selectedTrack];
    const kartData  = KARTS[this.selectedKart];
    this.currentTrack = trackData;
    this.spline       = generateSpline(trackData.waypoints, 20);
    this._trees       = null;

    const n = this.spline.length;
    this.checkpoints = [
      { pt:this.spline[Math.floor(n*0.33)], passed:false },
      { pt:this.spline[Math.floor(n*0.67)], passed:false }
    ];

    const grid = trackData.grid;

    // In multiplayer, host = grid[0], guest = grid[1]
    const myIdx  = (this.isMultiplayer && !this.isHost) ? 1 : 0;
    const oppIdx = myIdx === 0 ? 1 : 0;

    this.player = new Kart({...kartData}, grid[myIdx].x, grid[myIdx].y, grid[myIdx].angle);
    this.player.isPlayer = true;

    if (this.isMultiplayer) {
      const oppData = KARTS[this.opponentKartId];
      this.opponentKart = {
        ...oppData,
        x:grid[oppIdx].x, y:grid[oppIdx].y,
        targetX:grid[oppIdx].x, targetY:grid[oppIdx].y,
        angle:grid[oppIdx].angle, speed:0,
        vx:0, vy:0,
        netLap:1, lapTimes:[], lastLapTime:0, bestLap:Infinity,
        finished:false
      };
      this.aiKarts = [];
    } else {
      this.opponentKart = null;
      this.aiKarts = [];
      for (let i=1;i<grid.length;i++) {
        const aiData = KARTS[(this.selectedKart+i)%KARTS.length];
        const ai = new AIKart({...aiData}, grid[i].x, grid[i].y, grid[i].angle, this.spline);
        ai.aiVariance = 0.82 + Math.random()*0.22;
        this.aiKarts.push(ai);
      }
    }

    this.lap          = 1;
    this.raceTime     = 0;
    this.lapTimes     = [];
    this.lastLapTime  = 0;
    this.bestLap      = Infinity;
    this.countdownTimer = 3.6;
    this._lapFlash    = 0;
    this._lapFlashMsg = '';
    this._netTimer    = 0;
    this.camera       = { x:grid[myIdx].x, y:grid[myIdx].y };

    this._setState('countdown');
  }

  // ─── GAME UPDATE ─────────────────────────────────────────
  _update(dt) {
    if (this.state === 'countdown') {
      this.countdownTimer -= dt;
      this.camera.x = lerp(this.camera.x, this.player.x, 0.08);
      this.camera.y = lerp(this.camera.y, this.player.y, 0.08);
      if (this.countdownTimer <= 0) {
        this.state = 'racing';
        document.getElementById('mobileControls').classList.add('racing');
      }
      return;
    }
    if (this.state !== 'racing') return;

    this.raceTime += dt;
    if (this._lapFlash > 0) this._lapFlash -= dt;

    // Player physics
    this.player.update(this.input, this.spline, this.currentTrack.trackWidth, dt);

    // AI or opponent interpolation
    if (this.isMultiplayer) {
      if (this.opponentKart) {
        const a = clamp(8*dt, 0, 1);
        this.opponentKart.x = lerp(this.opponentKart.x, this.opponentKart.targetX, a);
        this.opponentKart.y = lerp(this.opponentKart.y, this.opponentKart.targetY, a);
      }
      // Send position to server at 20 Hz
      this._netTimer += dt;
      if (this._netTimer >= 0.05) { this._emitKartUpdate(); this._netTimer=0; }
    } else {
      this.aiKarts.forEach(ai=>ai.update(null,this.spline,this.currentTrack.trackWidth,dt));
    }

    this._checkLaps();

    this.camera.x = lerp(this.camera.x, this.player.x, 0.1);
    this.camera.y = lerp(this.camera.y, this.player.y, 0.1);
  }

  // ─── LAP DETECTION ──────────────────────────────────────
  _checkLaps() {
    const near = nearestOnSpline(this.spline, this.player);
    const n    = this.spline.length;

    // Intermediate checkpoints
    this.checkpoints.forEach(cp => {
      if (!cp.passed && dist(this.player, cp.pt) < 95) cp.passed = true;
    });

    const allPassed = this.checkpoints.every(c=>c.passed);
    const nearStart = near.idx < n*0.08 || near.idx > n*0.92;

    if (allPassed && nearStart && dist(this.player, this.spline[0]) < 115) {
      const wp = this.currentTrack.waypoints;
      const dx = wp[1].x-wp[0].x, dy = wp[1].y-wp[0].y;
      // Confirm moving in the correct direction
      if (this.player.vx*dx + this.player.vy*dy > 0) {
        this._completeLap();
      }
    }
  }

  _completeLap() {
    const lapTime = this.raceTime - this.lastLapTime;
    this.lapTimes.push(lapTime);
    const isNewBest = lapTime < this.bestLap;
    if (isNewBest) this.bestLap = lapTime;

    this.lastLapTime = this.raceTime;
    this.checkpoints.forEach(c=>c.passed=false);

    this._lapFlash    = 1.4;
    this._lapFlashMsg = isNewBest
      ? `LAP ${this.lap}  ·  ${this._fmt(lapTime)}  ·  NEW BEST!`
      : `LAP ${this.lap}  ·  ${this._fmt(lapTime)}`;

    // Broadcast to opponent
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('lap-complete', { lap:this.lap, lapTime });
    }

    if (this.lap >= this.currentTrack.laps) {
      this.state = 'finished';
      if (this.isMultiplayer && this.socket) this.socket.emit('race-finish');
      setTimeout(()=>this._showResults(), 2200);
    } else {
      this.lap++;
    }
  }

  // ─── RESULTS ────────────────────────────────────────────
  _showResults() {
    const panels = document.getElementById('resultsPanels');
    panels.innerHTML = '';
    const myBest = this.lapTimes.length ? Math.min(...this.lapTimes) : Infinity;

    // Build panel HTML
    const buildPanel = (label, lapTimes, totalTime, isWinner) => {
      const div = document.createElement('div');
      div.className = 'results-panel' + (isWinner ? ' winner' : '');
      const best = lapTimes.length ? Math.min(...lapTimes) : Infinity;
      let rows = lapTimes.map((t,i)=>{
        const isBest = t===best && lapTimes.length>1;
        return `<tr class="${isBest?'best-lap':''}"><td>Lap ${i+1}</td><td>${this._fmt(t)}</td></tr>`;
      }).join('');
      div.innerHTML = `
        <div class="results-name">
          ${label}
          ${isWinner?'<span class="results-badge gold">WINNER</span>':''}
        </div>
        <table class="results-table">
          <thead><tr><th>Lap</th><th>Time</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total-time">Total: <span>${this._fmt(totalTime)}</span></div>
        ${best!==Infinity?`<div class="total-time" style="margin-top:4px">Best lap: <span>${this._fmt(best)}</span></div>`:''}
      `;
      return div;
    };

    if (this.isMultiplayer && this.opponentKart) {
      const oppTotal = this.opponentKart.lapTimes.reduce((a,b)=>a+b,0);
      const myWins   = this.raceTime <= oppTotal || !this.opponentKart.finished;
      panels.appendChild(buildPanel('YOU',      this.lapTimes,               this.raceTime, myWins));
      panels.appendChild(buildPanel('OPPONENT', this.opponentKart.lapTimes,  oppTotal,      !myWins));
    } else {
      panels.appendChild(buildPanel('YOUR RACE', this.lapTimes, this.raceTime, true));
    }

    this._setState('results');
  }

  _fmt(sec) {
    const m=Math.floor(sec/60), s=(sec%60).toFixed(2).padStart(5,'0');
    return `${m}:${s}`;
  }

  _showOverlay(msg, color='#fff') {
    this._overlayMsg   = msg;
    this._overlayColor = color;
    this._overlayTimer = 3;
  }
  _clearOverlay() { this._overlayTimer = 0; }

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  _render() {
    const {canvas,ctx}=this;
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    const isMenu=['menu','selecting-kart','selecting-track','mode-select','multi-lobby','results'].includes(this.state);
    if (isMenu) {
      ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,W,H);
      this._drawStars(ctx,W,H);
      return;
    }

    // World render
    ctx.save();
    ctx.translate(Math.round(W/2-this.camera.x), Math.round(H/2-this.camera.y));
    this._drawWorld(ctx);
    this._drawTrack(ctx);
    this.aiKarts.forEach(ai=>this._drawKartEntity(ctx,ai,false));
    if (this.opponentKart) this._drawKartEntity(ctx, this.opponentKart, true);
    if (this.player)       this._drawKartEntity(ctx, this.player, false);
    ctx.restore();

    // HUD overlays
    if (['racing','finished'].includes(this.state)) this._drawHUD(ctx,W,H);
    this._drawMinimap(ctx,W,H);
    if (this.state==='countdown') this._drawCountdown(ctx,W,H);
    if (this.state==='finished')  this._drawFinishedBanner(ctx,W,H);
    if (this._lapFlash>0)         this._drawLapFlash(ctx,W,H);
    if (this._overlayTimer>0)     this._drawOverlay(ctx,W,H);
  }

  // ─── BACKGROUND / WORLD ──────────────────────────────────
  _drawStars(ctx,W,H) {
    if (!this._starCache) {
      this._starCache=Array.from({length:90},()=>({
        x:Math.random(),y:Math.random(),r:Math.random()*1.6+.3,a:Math.random()*.7+.3
      }));
    }
    this._starCache.forEach(s=>{
      ctx.fillStyle=`rgba(210,210,255,${s.a})`;
      ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2); ctx.fill();
    });
  }

  _drawWorld(ctx) {
    const track=this.currentTrack;
    ctx.fillStyle=track.bgColor; ctx.fillRect(0,0,4300,3300);

    if (track.theme==='desert') {
      ctx.fillStyle='rgba(0,0,0,0.04)';
      for(let x=0;x<4300;x+=100) for(let y=0;y<3300;y+=100)
        if(((x/100+y/100)%2)===0) ctx.fillRect(x,y,50,50);
      ctx.fillStyle='rgba(180,130,40,0.35)';
      [[400,600],[1800,400],[3200,500],[3500,1800],[300,2700],[2800,2800]].forEach(([rx,ry])=>{
        ctx.beginPath();
        ctx.ellipse(rx,ry,80+Math.sin(rx)*30,45+Math.cos(ry)*20,Math.sin(rx)*.5,0,Math.PI*2);
        ctx.fill();
      });
    } else {
      if (!this._trees) this._buildTrees();
      this._trees.forEach(t=>{
        ctx.fillStyle='rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(t.x+8,t.y+8,t.r,t.r*.6,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=t.dark?'#173a12':'#1e5218';
        ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=t.dark?'#1f4e19':'#2a6e22';
        ctx.beginPath(); ctx.arc(t.x-t.r*.2,t.y-t.r*.2,t.r*.65,0,Math.PI*2); ctx.fill();
      });
    }
  }

  _buildTrees() {
    this._trees=[];
    const half=this.currentTrack.trackWidth/2+30;
    let att=0;
    while(this._trees.length<100&&att<2000){
      att++;
      const t={x:80+Math.random()*4100,y:80+Math.random()*3050,r:18+Math.random()*28,dark:Math.random()>.5};
      if(nearestOnSpline(this.spline,t).d>half+t.r) this._trees.push(t);
    }
  }

  // ─── TRACK RENDER ────────────────────────────────────────
  _drawTrack(ctx) {
    const {spline,currentTrack:track}=this;
    const W=track.trackWidth;
    ctx.lineJoin='round'; ctx.lineCap='round';

    const path=()=>{
      ctx.beginPath();
      spline.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      ctx.closePath();
    };

    // Curb (red/white alternating)
    path(); ctx.strokeStyle='#cc1111'; ctx.lineWidth=W+28; ctx.stroke();
    ctx.save(); ctx.setLineDash([22,22]);
    path(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=W+28; ctx.stroke();
    ctx.restore();

    // White edge line
    path(); ctx.strokeStyle='#e0e0e0'; ctx.lineWidth=W+16; ctx.stroke();

    // Road
    path(); ctx.strokeStyle=track.trackColor; ctx.lineWidth=W; ctx.stroke();

    // Subtle lane texture
    ctx.save(); ctx.setLineDash([28,28]);
    path(); ctx.strokeStyle='#3e3e3e'; ctx.lineWidth=W-12; ctx.stroke();
    ctx.restore();

    // Centre yellow dashes
    ctx.save(); ctx.setLineDash([26,24]);
    path(); ctx.strokeStyle='#eecc00'; ctx.lineWidth=3.5; ctx.stroke();
    ctx.restore();

    // Start/finish checkered flag
    this._drawStartLine(ctx);
  }

  _drawStartLine(ctx) {
    const sp=this.spline[0], sp1=this.spline[1];
    const a=Math.atan2(sp1.y-sp.y,sp1.x-sp.x);
    const hw=this.currentTrack.trackWidth/2+5, sq=13;
    ctx.save();
    ctx.translate(sp.x,sp.y); ctx.rotate(a+Math.PI/2);
    const cols=Math.ceil(hw*2/sq);
    for(let i=-Math.ceil(cols/2);i<=Math.ceil(cols/2);i++) {
      for(let row=-1;row<=1;row++) {
        ctx.fillStyle=(i+row)%2===0?'#ffffff':'#111111';
        ctx.fillRect(i*sq-sq/2, row*sq-sq/2, sq, sq);
      }
    }
    ctx.restore();
  }

  // ─── KART RENDER ─────────────────────────────────────────
  _drawKartEntity(ctx, kart, isOpponent) {
    ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);

    if (isOpponent) {
      ctx.globalAlpha = 0.88;
    }
    this._drawKartShape(ctx, kart, 1);
    ctx.restore();

    // Name tag above opponent
    if (isOpponent) {
      ctx.save();
      ctx.font = 'bold 12px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,.55)';
      ctx.fillRect(kart.x-24, kart.y-46, 48, 16);
      ctx.fillStyle = kart.color;
      ctx.fillText('OPPONENT', kart.x, kart.y-38);
      ctx.restore();
    }

    if (kart.isPlayer && kart.offTrack) {
      ctx.save();
      ctx.font='bold 13px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#ff8800';
      ctx.fillText('OFF TRACK', kart.x, kart.y-34);
      ctx.restore();
    }
  }

  _drawKartShape(ctx, kart, scale) {
    ctx.save();
    ctx.scale(scale, scale);
    const w=kart.width, h=kart.height;

    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(3,4,w*.55,h*.38,0,0,Math.PI*2); ctx.fill();

    ctx.fillStyle=kart.bodyColor;
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,3.5); ctx.fill();

    ctx.fillStyle=kart.color;
    ctx.beginPath(); ctx.roundRect(-w/2+2,-h/2+2,w*.52,h-4,2.5); ctx.fill();

    ctx.fillStyle='rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.roundRect(-w/2+3,-h/2+3,w*.28,h-6,2); ctx.fill();

    // Rear wing
    ctx.fillStyle=kart.bodyColor;
    ctx.fillRect(w/2-5,-h/2-3,7,h+6);
    ctx.fillStyle='#222';
    ctx.fillRect(w/2-3,-h/2-5,3,3);
    ctx.fillRect(w/2-3, h/2+2,3,3);

    // Wheels
    const ww=8,wh=5;
    ctx.fillStyle=kart.wheelColor;
    ctx.fillRect(-w/2-4,-h/2-3,ww,wh); ctx.fillRect(-w/2-4,h/2-2,ww,wh);
    ctx.fillRect( w/2-4,-h/2-3,ww,wh); ctx.fillRect( w/2-4,h/2-2,ww,wh);
    ctx.fillStyle='#555';
    ctx.fillRect(-w/2-2,-h/2-2,4,3); ctx.fillRect(-w/2-2,h/2-1,4,3);
    ctx.fillRect( w/2-2,-h/2-2,4,3); ctx.fillRect( w/2-2,h/2-1,4,3);

    ctx.restore();
  }

  // ─── HUD ────────────────────────────────────────────────
  _drawHUD(ctx,W,H) {
    if (!this.player) return;
    const speed    = Math.round(Math.abs(this.player.speed)*0.18);
    const curLap   = this.raceTime - this.lastLapTime;
    const lapLabel = `LAP ${Math.min(this.lap,this.currentTrack.laps)} / ${this.currentTrack.laps}`;

    if (this.isMultiplayer && this.opponentKart) {
      this._drawMultiHUD(ctx, W, H, speed, curLap, lapLabel);
    } else {
      this._drawSoloHUD(ctx, W, H, speed, curLap, lapLabel);
    }

    if (this.player.offTrack) {
      ctx.fillStyle='rgba(255,100,0,0.09)'; ctx.fillRect(0,0,W,H);
    }
  }

  _drawSoloHUD(ctx, W, H, speed, curLap, lapLabel) {
    ctx.fillStyle='rgba(0,0,0,0.68)'; ctx.fillRect(0,0,W,66);
    ctx.textBaseline='middle';

    // Left — total time + current lap
    ctx.textAlign='left';
    ctx.font=`bold 20px "Segoe UI",Arial`; ctx.fillStyle='#ddd';
    ctx.fillText(`TOTAL  ${this._fmt(this.raceTime)}`, 16, 22);

    ctx.font=`14px "Segoe UI",Arial`; ctx.fillStyle='rgba(255,204,0,0.85)';
    ctx.fillText(`LAP TIME  ${this._fmt(curLap)}`, 16, 48);

    // Centre — lap count
    ctx.textAlign='center';
    ctx.font=`bold 24px "Segoe UI",Arial`; ctx.fillStyle='#fff';
    ctx.fillText(lapLabel, W/2, 33);

    // Right — speed + best lap
    ctx.textAlign='right';
    ctx.font=`bold 20px "Segoe UI",Arial`; ctx.fillStyle='#ffcc00';
    ctx.fillText(`${speed} km/h`, W-16, 22);

    if (this.bestLap < Infinity) {
      ctx.font=`13px "Segoe UI",Arial`; ctx.fillStyle='rgba(255,255,255,0.5)';
      ctx.fillText(`BEST  ${this._fmt(this.bestLap)}`, W-16, 48);
    }
  }

  _drawMultiHUD(ctx, W, H, speed, curLap, lapLabel) {
    ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,76);

    // Divider
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(W/2-1,0,2,76);

    const drawSide = (isLeft, lap, lapTimes, raceTime, lastLapTime, color, name, spd) => {
      const base = isLeft ? 14 : W/2+14;
      ctx.textBaseline='middle';

      // Color stripe
      ctx.fillStyle=color; ctx.fillRect(base, 8, 4, 60);

      ctx.textAlign='left';
      ctx.font=`bold 11px "Segoe UI",Arial`; ctx.fillStyle=color;
      ctx.fillText(name.toUpperCase(), base+10, 20);

      ctx.font=`bold 18px "Segoe UI",Arial`; ctx.fillStyle='#fff';
      ctx.fillText(`LAP ${Math.min(lap,this.currentTrack.laps)}/${this.currentTrack.laps}`, base+10, 40);

      const curT = this._fmt(raceTime - lastLapTime);
      ctx.font=`13px "Segoe UI",Arial`; ctx.fillStyle='#ffcc00';
      ctx.fillText(curT, base+10, 60);

      if (lapTimes.length>0) {
        const best=Math.min(...lapTimes);
        ctx.textAlign = isLeft ? 'right' : 'left';
        const bx = isLeft ? W/2-14 : W-14;
        ctx.font=`12px "Segoe UI",Arial`; ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.fillText(`BEST ${this._fmt(best)}`, bx, 60);
      }
      if (isLeft) {
        ctx.textAlign='right'; ctx.font=`bold 16px "Segoe UI",Arial`; ctx.fillStyle='#ffcc00';
        ctx.fillText(`${spd} km/h`, W/2-14, 20);
      }
    };

    drawSide(true,  this.lap,                    this.lapTimes,               this.raceTime, this.lastLapTime, this.player.color, 'YOU', speed);
    const opp=this.opponentKart;
    drawSide(false, opp.netLap||1, opp.lapTimes, this.raceTime, opp.lastLapTime||0, opp.color, 'OPPONENT', 0);
  }

  // ─── MINIMAP ─────────────────────────────────────────────
  _drawMinimap(ctx,W,H) {
    if(!this.spline||!['racing','finished','countdown'].includes(this.state))return;
    const mw=Math.min(W*.21,155),mh=mw*.72;
    const mx=W-mw-14,my=H-mh-14,pad=9;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    this.spline.forEach(p=>{if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y;});
    const sc=Math.min((mw-pad*2)/(maxX-minX),(mh-pad*2)/(maxY-minY));
    const ox=mx+pad+((mw-pad*2)-(maxX-minX)*sc)/2;
    const oy=my+pad+((mh-pad*2)-(maxY-minY)*sc)/2;
    const mp=p=>({x:ox+(p.x-minX)*sc,y:oy+(p.y-minY)*sc});

    ctx.fillStyle='rgba(0,0,0,0.72)';
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(mx,my,mw,mh,7); else ctx.rect(mx,my,mw,mh);
    ctx.fill();

    ctx.beginPath();
    this.spline.forEach((p,i)=>{const m=mp(p);i===0?ctx.moveTo(m.x,m.y):ctx.lineTo(m.x,m.y);});
    ctx.closePath();
    ctx.strokeStyle='#555';ctx.lineWidth=4.5;ctx.stroke();
    ctx.strokeStyle='#888';ctx.lineWidth=3;ctx.stroke();

    const dot=(p,color,r)=>{const m=mp(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(m.x,m.y,r,0,Math.PI*2);ctx.fill();};
    this.aiKarts.forEach(ai=>dot(ai,ai.color,2.8));
    if(this.opponentKart) dot(this.opponentKart,this.opponentKart.color,2.8);
    if(this.player){
      dot(this.player,'#fff',4);
      const m=mp(this.player);
      ctx.fillStyle='#ffcc00';
      ctx.beginPath();ctx.arc(m.x+Math.cos(this.player.angle)*5,m.y+Math.sin(this.player.angle)*5,1.8,0,Math.PI*2);ctx.fill();
    }
  }

  // ─── COUNTDOWN ───────────────────────────────────────────
  _drawCountdown(ctx,W,H) {
    const t=this.countdownTimer;
    let text,color;
    if(t>2.6){text='3';color='#ff4444';}
    else if(t>1.6){text='2';color='#ffaa00';}
    else if(t>0.6){text='1';color='#ffff44';}
    else{text='GO!';color='#44ff88';}
    const frac=(t%1+1)%1, scale=1+(1-frac)*.35, alpha=Math.min(1,frac*3.5);
    ctx.save();
    ctx.globalAlpha=alpha; ctx.translate(W/2,H*.45); ctx.scale(scale,scale);
    const fs=Math.round(88/scale);
    ctx.font=`bold ${fs}px "Segoe UI",Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillText(text,4,4);
    ctx.fillStyle=color; ctx.fillText(text,0,0);
    ctx.restore();
  }

  // ─── LAP FLASH ───────────────────────────────────────────
  _drawLapFlash(ctx,W,H) {
    const a=Math.min(this._lapFlash,0.45);
    ctx.fillStyle=`rgba(255,220,0,${a})`; ctx.fillRect(0,0,W,H);

    const msgAlpha=Math.min(1,this._lapFlash*1.6);
    if(msgAlpha>0.05&&this._lapFlashMsg){
      ctx.save();
      ctx.globalAlpha=msgAlpha;
      ctx.font=`bold ${Math.round(W*0.042)}px "Segoe UI",Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillText(this._lapFlashMsg,W/2+2,H*.17+2);
      ctx.fillStyle='#fff'; ctx.fillText(this._lapFlashMsg,W/2,H*.17);
      ctx.restore();
    }
  }

  // ─── FINISHED BANNER ─────────────────────────────────────
  _drawFinishedBanner(ctx,W,H) {
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(0,0,W,H);
    ctx.font=`bold ${Math.round(W*0.07)}px "Segoe UI",Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#ffcc00'; ctx.fillText('RACE COMPLETE!',W/2,H/2);
  }

  // ─── OVERLAY (disconnect etc.) ────────────────────────────
  _drawOverlay(ctx,W,H) {
    if(!this._overlayTimer)return;
    this._overlayTimer-=0.016;
    const alpha=Math.min(1,this._overlayTimer);
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,.55)';
    const msg=this._overlayMsg||'';
    ctx.font=`bold 20px "Segoe UI",Arial`;
    const tw=ctx.measureText(msg).width+30;
    ctx.fillRect(W/2-tw/2,H*.1-18,tw,36);
    ctx.fillStyle=this._overlayColor||'#fff';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(msg,W/2,H*.1);
    ctx.restore();
  }

  // ─── GAME LOOP ───────────────────────────────────────────
  _loop(timestamp) {
    const dt=Math.min((timestamp-(this.lastTime||timestamp))/1000,0.05);
    this.lastTime=timestamp;
    this._update(dt);
    this._render();
    requestAnimationFrame(t=>this._loop(t));
  }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.addEventListener('load',()=>{ window.game=new Game(); });
