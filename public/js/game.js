'use strict';

// ═══════════════════════════════════════════════════════════
//  MATH UTILITIES
// ═══════════════════════════════════════════════════════════
function lerp(a,b,t){return a+(b-a)*t;}
function clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function normalizeAngle(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function catmullRom(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return{x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)};}
function generateSpline(wp,segs){const pts=[],n=wp.length;for(let i=0;i<n;i++){const p0=wp[(i-1+n)%n],p1=wp[i],p2=wp[(i+1)%n],p3=wp[(i+2)%n];for(let j=0;j<segs;j++)pts.push(catmullRom(p0,p1,p2,p3,j/segs));}return pts;}
function nearestOnSpline(sp,pos){let best=Infinity,idx=0;const px=pos.x,py=pos.y;for(let i=0,n=sp.length;i<n;i++){const dx=sp[i].x-px,dy=sp[i].y-py,d2=dx*dx+dy*dy;if(d2<best){best=d2;idx=i;}}return{d:Math.sqrt(best),idx};}

// ═══════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════
const SETTINGS_KEY='kart-racer-settings';
function loadSettings(){try{return Object.assign({master:0.7,music:0.4,sfx:0.8,ghost:true,joystick:false,driftAssist:false},JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch(e){return{master:0.7,music:0.4,sfx:0.8,ghost:true,joystick:false,driftAssist:false};}}
function saveSettings(s){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch(e){}}

// ═══════════════════════════════════════════════════════════
//  PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════
class ParticleSystem {
  constructor(){this.particles=[];this.skidMarks=[];}

  emit(x,y,type,count=1,opts={}){
    for(let i=0;i<count;i++){
      if(type==='spark')   this.particles.push(this._spark(x,y,opts));
      else if(type==='smoke') this.particles.push(this._smoke(x,y,opts));
      else if(type==='flame') this.particles.push(this._flame(x,y,opts));
      else if(type==='dirt')  this.particles.push(this._dirt(x,y,opts));
    }
  }

  addSkid(x,y,angle){this.skidMarks.push({x,y,angle,alpha:0.38,life:10});if(this.skidMarks.length>600)this.skidMarks.splice(0,60);}

  _spark(x,y,opts){const a=opts.angle||Math.random()*Math.PI*2,s=80+Math.random()*180;return{x,y,vx:Math.cos(a)*s*(0.5+Math.random()),vy:Math.sin(a)*s*(0.5+Math.random()),life:0.25+Math.random()*0.3,max:0.25+Math.random()*0.3,r:1.5+Math.random()*2,c:`hsl(${25+Math.random()*35},100%,${55+Math.random()*35}%)`,g:160,t:'spark'};}
  _smoke(x,y,opts){const a=opts.angle||-Math.PI/2;return{x,y,vx:Math.cos(a)*15+(Math.random()-.5)*25,vy:Math.sin(a)*15+(Math.random()-.5)*25,life:0.7+Math.random()*0.5,max:0.7+Math.random()*0.5,r:5+Math.random()*10,c:opts.c||'150,150,150',g:-15,t:'smoke'};}
  _flame(x,y,opts){const a=opts.angle||Math.PI;return{x,y,vx:Math.cos(a)*(80+Math.random()*80),vy:Math.sin(a)*(80+Math.random()*80)+(Math.random()-.5)*30,life:0.12+Math.random()*0.12,max:0.12+Math.random()*0.12,r:4+Math.random()*7,hue:20+Math.random()*35,g:0,t:'flame'};}
  _dirt(x,y,opts){const a=opts.angle||Math.PI;return{x,y,vx:Math.cos(a+(Math.random()-.5)*1.4)*(40+Math.random()*70),vy:Math.sin(a+(Math.random()-.5)*1.4)*(40+Math.random()*70),life:0.4+Math.random()*0.3,max:0.4+Math.random()*0.3,r:2+Math.random()*4,c:opts.c||'#8B6914',g:120,t:'dirt'};}

  update(dt){
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;}
    for(let i=this.skidMarks.length-1;i>=0;i--){const s=this.skidMarks[i];s.life-=dt;s.alpha=Math.max(0,(s.life/10)*0.38);if(s.life<=0)this.skidMarks.splice(i,1);}
  }

  renderSkids(ctx){this.skidMarks.forEach(s=>{ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.fillStyle=`rgba(20,20,20,${s.alpha})`;ctx.fillRect(-7,-3,4,6);ctx.fillRect(3,-3,4,6);ctx.restore();});}

  renderParticles(ctx){this.particles.forEach(p=>{const a=p.life/p.max;ctx.save();ctx.globalAlpha=a;if(p.t==='spark'){ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2);ctx.fill();}else if(p.t==='smoke'){ctx.fillStyle=`rgba(${p.c},${a*0.35})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}else if(p.t==='flame'){const gd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);gd.addColorStop(0,`hsla(${p.hue+30},100%,80%,${a})`);gd.addColorStop(1,`hsla(${p.hue},100%,40%,0)`);ctx.fillStyle=gd;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}else if(p.t==='dirt'){ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.restore();});}
}

// ═══════════════════════════════════════════════════════════
//  TRACK DATA
// ═══════════════════════════════════════════════════════════
const TRACKS = [
  {
    id:0, name:'Sahara Circuit', description:'Fast & flowing desert track',
    theme:'desert', bgColor:'#c8a050', trackColor:'#484848',
    laps:3, trackWidth:150, traction:1.0,
    boostPadTs:[0.1,0.44,0.78], powerUpTs:[0.22,0.55,0.88],
    waypoints:[
      {x:700,y:2050},{x:1100,y:2080},{x:1600,y:2090},{x:2100,y:2070},
      {x:2600,y:2020},{x:2950,y:1880},{x:3220,y:1660},{x:3360,y:1400},
      {x:3300,y:1140},{x:3080,y:950},{x:2780,y:840},{x:2380,y:800},
      {x:1980,y:810},{x:1680,y:760},{x:1480,y:820},{x:1270,y:760},
      {x:1060,y:840},{x:820,y:980},{x:580,y:1180},{x:480,y:1480},
      {x:530,y:1780},{x:640,y:1970}
    ],
    grid:[{x:720,y:2040,angle:0.1},{x:720,y:2065,angle:0.1},{x:685,y:2040,angle:0.1},{x:685,y:2065,angle:0.1}]
  },
  {
    id:1, name:'Forest Rally', description:'Technical forest circuit with tight hairpins',
    theme:'forest', bgColor:'#1e4a18', trackColor:'#555',
    laps:3, trackWidth:125, traction:1.0,
    boostPadTs:[0.12,0.42,0.72], powerUpTs:[0.25,0.55,0.85],
    waypoints:[
      {x:820,y:2350},{x:1300,y:2320},{x:1720,y:2220},{x:2060,y:2020},
      {x:2260,y:1780},{x:2340,y:1520},{x:2280,y:1270},{x:2080,y:1070},
      {x:1820,y:940},{x:1540,y:900},{x:1300,y:940},{x:1100,y:1060},
      {x:940,y:1220},{x:870,y:1430},{x:900,y:1640},{x:980,y:1850},
      {x:890,y:2050},{x:820,y:2200}
    ],
    grid:[{x:840,y:2340,angle:0},{x:840,y:2362,angle:0},{x:808,y:2340,angle:0},{x:808,y:2362,angle:0}]
  },
  {
    id:2, name:'Night City', description:'Urban night circuit with neon lights',
    theme:'night', bgColor:'#050812', trackColor:'#2a2a3e',
    laps:3, trackWidth:140, traction:1.0,
    boostPadTs:[0.07,0.38,0.72], powerUpTs:[0.2,0.5,0.82],
    waypoints:[
      {x:700,y:2500},{x:1200,y:2500},{x:1700,y:2490},{x:2200,y:2460},
      {x:2650,y:2350},{x:2950,y:2100},{x:3100,y:1780},{x:3060,y:1430},
      {x:2850,y:1150},{x:2530,y:950},{x:2100,y:870},{x:1680,y:890},
      {x:1280,y:1010},{x:990,y:1230},{x:820,y:1530},{x:750,y:1880},
      {x:700,y:2180},{x:695,y:2360}
    ],
    grid:[{x:730,y:2488,angle:0},{x:730,y:2512,angle:0},{x:698,y:2488,angle:0},{x:698,y:2512,angle:0}]
  },
  {
    id:3, name:'Ice Valley', description:'Slippery mountain circuit',
    theme:'ice', bgColor:'#d0e8f5', trackColor:'#c0d8ee',
    laps:3, trackWidth:145, traction:0.38,
    boostPadTs:[0.1,0.38,0.68], powerUpTs:[0.18,0.5,0.8],
    waypoints:[
      {x:900,y:2580},{x:1400,y:2540},{x:1900,y:2430},{x:2400,y:2250},
      {x:2830,y:2020},{x:3120,y:1730},{x:3180,y:1380},{x:3070,y:1060},
      {x:2820,y:820},{x:2420,y:680},{x:1980,y:640},{x:1550,y:700},
      {x:1150,y:860},{x:870,y:1080},{x:700,y:1380},{x:680,y:1740},
      {x:760,y:2100},{x:840,y:2380}
    ],
    grid:[{x:930,y:2568,angle:0},{x:930,y:2592,angle:0},{x:898,y:2568,angle:0},{x:898,y:2592,angle:0}]
  }
];

// ═══════════════════════════════════════════════════════════
//  KART DATA
// ═══════════════════════════════════════════════════════════
const KARTS=[
  {id:0,name:'Speed Demon',description:'Blazing fast, hard to control',maxSpeed:220,acceleration:155,handling:1.25,braking:280,friction:72,color:'#ff3333',bodyColor:'#bb0000',wheelColor:'#111',width:28,height:18},
  {id:1,name:'Road King',description:'Balanced speed and control',maxSpeed:185,acceleration:130,handling:1.65,braking:255,friction:65,color:'#4488ff',bodyColor:'#1144cc',wheelColor:'#111',width:26,height:17},
  {id:2,name:'Iron Grip',description:'Slow but incredibly precise',maxSpeed:155,acceleration:105,handling:2.1,braking:310,friction:55,color:'#33dd33',bodyColor:'#1a881a',wheelColor:'#111',width:24,height:16}
];

// ═══════════════════════════════════════════════════════════
//  INPUT MANAGER
// ═══════════════════════════════════════════════════════════
class InputManager {
  constructor(){
    this.keys={};
    this.touch={up:false,down:false,left:false,right:false,drift:false,item:false};
    window.addEventListener('keydown',e=>{
      this.keys[e.key.toLowerCase()]=true;
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(e.key.toLowerCase()))e.preventDefault();
    });
    window.addEventListener('keyup',e=>{this.keys[e.key.toLowerCase()]=false;});
  }
  get up()    {return!!(this.keys['w']||this.keys['arrowup']   ||this.touch.up);}
  get down()  {return!!(this.keys['s']||this.keys['arrowdown'] ||this.touch.down);}
  get left()  {return!!(this.keys['a']||this.keys['arrowleft'] ||this.touch.left);}
  get right() {return!!(this.keys['d']||this.keys['arrowright']||this.touch.right);}
  get drift() {return!!(this.keys[' ']||this.keys['shift']     ||this.touch.drift);}
  get item()  {return!!(this.keys['e']||this.keys['enter']     ||this.touch.item);}
}

// ═══════════════════════════════════════════════════════════
//  VIRTUAL JOYSTICK
// ═══════════════════════════════════════════════════════════
class VirtualJoystick {
  constructor(){
    this.active=false; this.baseX=0; this.baseY=0; this.stickX=0; this.stickY=0;
    this.radius=52; this._id=null;
    this.out={up:false,down:false,left:false,right:false};
  }
  attach(canvas){
    canvas.addEventListener('touchstart',e=>this._ts(e),{passive:false});
    canvas.addEventListener('touchmove', e=>this._tm(e),{passive:false});
    canvas.addEventListener('touchend',  e=>this._te(e),{passive:false});
    canvas.addEventListener('touchcancel',e=>this._te(e),{passive:false});
  }
  _ts(e){
    for(const t of e.changedTouches){
      if(t.clientX<window.innerWidth*0.45&&!this._id){
        this._id=t.identifier; this.active=true;
        this.baseX=t.clientX; this.baseY=t.clientY;
        this.stickX=t.clientX; this.stickY=t.clientY;
        e.preventDefault(); this._calc();
      }
    }
  }
  _tm(e){
    for(const t of e.changedTouches){
      if(t.identifier===this._id){
        const dx=t.clientX-this.baseX,dy=t.clientY-this.baseY,d=Math.sqrt(dx*dx+dy*dy);
        if(d>this.radius){this.stickX=this.baseX+dx/d*this.radius;this.stickY=this.baseY+dy/d*this.radius;}
        else{this.stickX=t.clientX;this.stickY=t.clientY;}
        e.preventDefault(); this._calc();
      }
    }
  }
  _te(e){
    for(const t of e.changedTouches){
      if(t.identifier===this._id){this._id=null;this.active=false;this.stickX=this.baseX;this.stickY=this.baseY;this.out={up:false,down:false,left:false,right:false};}
    }
  }
  _calc(){
    const dx=(this.stickX-this.baseX)/this.radius,dy=(this.stickY-this.baseY)/this.radius;
    this.out.left=dx<-0.28;this.out.right=dx>0.28;this.out.up=dy<-0.25;this.out.down=dy>0.45;
  }
  render(ctx){
    if(!this.active)return;
    ctx.save();
    ctx.beginPath();ctx.arc(this.baseX,this.baseY,this.radius,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(this.stickX,this.stickY,this.radius*0.45,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.38)';ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
//  KART (physics entity)
// ═══════════════════════════════════════════════════════════
class Kart {
  constructor(data,x,y,angle){
    Object.assign(this,{name:data.name,maxSpeed:data.maxSpeed,acceleration:data.acceleration,handling:data.handling,braking:data.braking,friction:data.friction,color:data.color,bodyColor:data.bodyColor,wheelColor:data.wheelColor,width:data.width,height:data.height});
    this.x=x;this.y=y;this.angle=angle;this.speed=0;this.vx=0;this.vy=0;
    this.offTrack=false;this.isPlayer=false;this.lap=1;
    // Drift / boost / powerup state
    this.isDrifting=false;this.driftCharge=0;this.boostTimer=0;this.shieldTimer=0;this.spinTimer=0;this.powerUp=null;
    this._itemPressed=false;
  }

  update(input,spline,trackWidth,dt,traction=1.0){
    const near=nearestOnSpline(spline,this);
    this.offTrack=near.d>trackWidth/2+14;
    let cap=this.maxSpeed*(this.offTrack?0.38:1.0);
    if(this.boostTimer>0){this.boostTimer-=dt;cap=this.maxSpeed*1.22;}
    if(this.spinTimer>0){this.spinTimer-=dt;this.angle+=5*dt;this.speed*=0.93;cap=this.maxSpeed*0.3;}

    if(input.up){this.speed=Math.min(this.speed+this.acceleration*dt,cap);}
    else if(input.down){if(this.speed>0)this.speed=Math.max(this.speed-this.braking*dt,0);else this.speed=Math.max(this.speed-this.acceleration*0.45*dt,-this.maxSpeed*0.3);}
    else{if(this.speed>0)this.speed=Math.max(this.speed-this.friction*dt,0);else if(this.speed<0)this.speed=Math.min(this.speed+this.friction*dt,0);}
    if(this.offTrack&&this.speed>cap)this.speed=lerp(this.speed,cap,Math.min(4*dt,1));

    const sf=clamp(Math.abs(this.speed)/(this.maxSpeed*0.25),0,1);
    const dir=this.speed>=0?1:-1;
    if(input.left) this.angle-=this.handling*sf*dir*dt;
    if(input.right)this.angle+=this.handling*sf*dir*dt;

    // Drift physics
    const wantDrift=input.drift&&Math.abs(this.speed)>this.maxSpeed*0.28&&(input.left||input.right);
    const targetVX=Math.cos(this.angle)*this.speed;
    const targetVY=Math.sin(this.angle)*this.speed;
    const blendRate=wantDrift?2.5:12.0;
    const effectiveBlend=blendRate*traction*(wantDrift?1:1);
    this.vx=lerp(this.vx,targetVX,Math.min(effectiveBlend*dt,1));
    this.vy=lerp(this.vy,targetVY,Math.min(effectiveBlend*dt,1));

    if(wantDrift){this.driftCharge=Math.min(this.driftCharge+dt,2.5);this.isDrifting=true;}
    else{
      if(this.isDrifting&&this.driftCharge>0.4){this.boostTimer=Math.min(this.driftCharge*0.45,1.2);this.speed=Math.min(this.speed*1.2,this.maxSpeed*1.15);}
      this.driftCharge=0;this.isDrifting=false;
    }

    // Activate item
    if(input.item&&!this._itemPressed&&this.powerUp){
      this._itemPressed=true;this._activatePowerUp();
    }
    if(!input.item)this._itemPressed=false;

    this.x=clamp(this.x+this.vx*dt,30,4170);
    this.y=clamp(this.y+this.vy*dt,30,3170);
  }

  _activatePowerUp(){
    // Handled by Game which has full context; stub here overridden via property
    if(this._onActivate)this._onActivate(this.powerUp);
    this.powerUp=null;
  }
}

// ═══════════════════════════════════════════════════════════
//  AI KART
// ═══════════════════════════════════════════════════════════
class AIKart extends Kart {
  constructor(data,x,y,angle,spline){
    super(data,x,y,angle);
    this._spline=spline;this._aiInput={up:false,down:false,left:false,right:false,drift:false,item:false};
    this.aiVariance=1;this._cpPassed=[false,false];
  }
  update(_,spline,trackWidth,dt){
    const near=nearestOnSpline(this._spline,this);
    const n=this._spline.length;
    const ahead=Math.round(28*this.aiVariance);
    const target=this._spline[(near.idx+ahead)%n];
    const diff=normalizeAngle(Math.atan2(target.y-this.y,target.x-this.x)-this.angle);
    const tight=Math.abs(diff)>0.45;
    this._aiInput.up=!tight;this._aiInput.down=tight&&this.speed>this.maxSpeed*0.55;
    this._aiInput.left=diff<-0.04;this._aiInput.right=diff>0.04;
    // Lap tracking
    const cp1=this._spline[Math.floor(n*0.33)],cp2=this._spline[Math.floor(n*0.67)];
    if(!this._cpPassed[0]&&dist(this,cp1)<95)this._cpPassed[0]=true;
    if(!this._cpPassed[1]&&dist(this,cp2)<95)this._cpPassed[1]=true;
    if(this._cpPassed[0]&&this._cpPassed[1]&&near.idx<n*0.08&&near.idx!==0){this.lap++;this._cpPassed=[false,false];}
    super.update(this._aiInput,this._spline,trackWidth,dt,1.0);
  }
}

// ═══════════════════════════════════════════════════════════
//  GHOST RECORDER
// ═══════════════════════════════════════════════════════════
class GhostRecorder {
  constructor(){this.frames=[];this.bestFrames=null;this.recording=false;this._timer=0;this._itvl=0.05;this.ghost=null;this._pi=0;this._pt=0;}
  startRecording(){this.frames=[];this.recording=true;this._timer=0;}
  record(kart,dt){if(!this.recording)return;this._timer+=dt;if(this._timer>=this._itvl){this._timer=0;this.frames.push({x:kart.x,y:kart.y,angle:kart.angle});}}
  finishLap(isBest){this.recording=false;if(isBest)this.bestFrames=[...this.frames];}
  startPlayback(){if(!this.bestFrames||!this.bestFrames.length)return;this._pi=0;this._pt=0;this.ghost={...this.bestFrames[0]};}
  updatePlayback(dt){
    if(!this.ghost||!this.bestFrames)return;
    this._pt+=dt;
    if(this._pt>=this._itvl){this._pt=0;this._pi=(this._pi+1)%this.bestFrames.length;Object.assign(this.ghost,this.bestFrames[this._pi]);}
  }
}

// ═══════════════════════════════════════════════════════════
//  GAME
// ═══════════════════════════════════════════════════════════
class Game {
  constructor(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this.input=new InputManager();
    this.settings=loadSettings();
    this.audio=new AudioEngine();
    this.particles=new ParticleSystem();
    this.joystick=new VirtualJoystick();
    this.ghost=new GhostRecorder();

    this.state='menu';this.selectedKart=0;this.selectedTrack=0;
    this.player=null;this.aiKarts=[];this.spline=null;this.currentTrack=null;
    this.checkpoints=[];this.lap=1;this.raceTime=0;this.lapTimes=[];
    this.lastLapTime=0;this.bestLap=Infinity;this.countdownTimer=0;
    this.lastTime=0;this.camera={x:0,y:0};
    this._lapFlash=0;this._lapFlashMsg='';this._trees=null;this._buildings=null;
    this._starCache=null;this._netTimer=0;this.dayTime=0;

    // Powerups / boost pads / oil
    this.powerUpPickups=[];this.boostPads=[];this.oilSlicks=[];
    this._boostPadCooldown=new Map();

    // Multiplayer
    this.isMultiplayer=false;this.isHost=false;this.socket=null;
    this.mySlot=0;this.opponents=[null,null,null,null];
    this._lobbyPlayers=[];

    // Overlay
    this._overlayMsg='';this._overlayColor='#fff';this._overlayTimer=0;

    // View & pause
    this.viewMode='top-down'; // 'top-down' | 'third-person' | 'first-person'
    this.paused=false;

    this._setupCanvas();
    this._bindUI();
    this._applySettings();
    this._drawPreviews();
    this._connectSocket();
    this.joystick.attach(this.canvas);
    requestAnimationFrame(t=>this._loop(t));
  }

  // ─── SETUP ──────────────────────────────────────────────
  _setupCanvas(){
    const resize=()=>{this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;};
    resize();window.addEventListener('resize',resize);
  }

  _applySettings(){
    const s=this.settings;
    this.audio.vol.master=s.master;this.audio.vol.music=s.music;this.audio.vol.sfx=s.sfx;
    const $=id=>document.getElementById(id);
    if($('masterVol'))$('masterVol').value=Math.round(s.master*100);
    if($('musicVol')) $('musicVol').value=Math.round(s.music*100);
    if($('sfxVol'))   $('sfxVol').value=Math.round(s.sfx*100);
    if($('ghostToggle'))    $('ghostToggle').checked=s.ghost;
    if($('joystickToggle')) $('joystickToggle').checked=s.joystick;
    if($('driftAssistToggle')) $('driftAssistToggle').checked=s.driftAssist;
    document.getElementById('mobileControls').classList.toggle('joystick-mode',s.joystick);
  }

  // ─── SOCKET.IO (4-player) ───────────────────────────────
  _connectSocket(){
    try{this.socket=io({autoConnect:true});}catch(_){this.socket=null;return;}
    const s=this.socket;

    s.on('room-created',({code,playerIndex})=>{
      this.mySlot=playerIndex||0;
      document.getElementById('roomCodeDisplay').textContent=code;
      this._updateLobbyUI([{index:0,kartId:this.selectedKart,isHost:true,ready:false}]);
    });

    s.on('lobby-update',({players})=>{
      this._lobbyPlayers=players;
      this._updateLobbyUI(players);
    });

    s.on('room-joined',({code,trackId,playerIndex})=>{
      this.mySlot=playerIndex;this.selectedTrack=trackId;
      document.getElementById('hostStatus').textContent='Connected! Waiting for host…';
    });

    s.on('join-error',msg=>{document.getElementById('joinError').textContent=msg;});

    s.on('race-start',({players})=>{
      players.forEach(p=>{
        if(p.index!==this.mySlot){this.opponents[p.index]={kartId:p.kartId,x:0,y:0,targetX:0,targetY:0,angle:0,speed:0,vx:0,vy:0,netLap:1,lapTimes:[],lastLapTime:0,bestLap:Infinity,finished:false,...KARTS[p.kartId]};}
      });
      this.isMultiplayer=true;this._startRace();
    });

    s.on('opponent-update',data=>{
      const opp=this.opponents[data.playerIndex];
      if(!opp)return;
      opp.targetX=data.x;opp.targetY=data.y;opp.angle=data.angle;opp.speed=data.speed;
      if(data.lap)opp.netLap=data.lap;
    });

    s.on('opponent-lap',({playerIndex,lap,lapTime})=>{
      const opp=this.opponents[playerIndex];if(!opp)return;
      opp.lapTimes.push(lapTime);opp.netLap=lap+1;opp.lastLapTime=this.raceTime;
      if(lapTime<opp.bestLap)opp.bestLap=lapTime;
    });

    s.on('opponent-finished',({playerIndex})=>{const opp=this.opponents[playerIndex];if(opp)opp.finished=true;});

    s.on('opponent-disconnected',({playerIndex})=>{
      this.opponents[playerIndex]=null;
      this._showOverlay('A player disconnected','#ff4444');
    });
  }

  _updateLobbyUI(players){
    const slots=document.getElementById('playerSlots');if(!slots)return;
    slots.innerHTML='';
    for(let i=0;i<4;i++){
      const p=players.find(x=>x.index===i);
      const div=document.createElement('div');div.className='player-slot'+(p?' filled':'');
      if(p){
        const kc=KARTS[p.kartId]?.color||'#aaa';
        div.innerHTML=`<span class="slot-num" style="color:${kc}">P${i+1}</span><span class="slot-name">${p.isHost?'HOST':('PLAYER '+(i+1))}</span><span class="slot-ready">${p.ready?'✓':'…'}</span>`;
      }else{div.innerHTML=`<span class="slot-num">P${i+1}</span><span class="slot-name">Empty</span><span class="slot-ready"></span>`;}
      slots.appendChild(div);
    }
    // Show start button only for host
    const startBtn=document.getElementById('startRaceBtn');
    if(startBtn){startBtn.style.display=(this.isHost&&players.length>=2)?'block':'none';}
  }

  _emitKartUpdate(){
    if(!this.socket||!this.isMultiplayer||!this.player)return;
    this.socket.emit('kart-update',{x:this.player.x,y:this.player.y,angle:this.player.angle,speed:this.player.speed,lap:this.lap});
  }

  // ─── UI BINDING ─────────────────────────────────────────
  _bindUI(){
    const $=id=>document.getElementById(id);

    // Menu
    $('playBtn').onclick=()=>{this.audio.start();this._setState('selecting-kart');};
    $('settingsBtn').onclick=()=>this._setState('settings');

    // View cycle & pause buttons
    const viewBtn=$('viewBtn'),pauseBtn=$('pauseBtn');
    if(viewBtn) viewBtn.onclick=()=>this._cycleView();
    if(pauseBtn) pauseBtn.onclick=()=>this._togglePause();
    window.addEventListener('keydown',e=>{
      if(!['racing','countdown'].includes(this.state))return;
      if(e.key==='v'||e.key==='V'){this._cycleView();e.preventDefault();}
      if(e.key==='Escape'||e.key==='p'||e.key==='P'){this._togglePause();e.preventDefault();}
    });

    // Kart select
    document.querySelectorAll('.kart-option').forEach(el=>el.addEventListener('click',()=>{
      document.querySelectorAll('.kart-option').forEach(e=>e.classList.remove('selected'));
      el.classList.add('selected');this.selectedKart=+el.dataset.kart;
    }));
    $('selectKartBtn').onclick=()=>this._setState('selecting-track');
    $('backToMenuBtn').onclick=()=>this._setState('menu');

    // Track select
    document.querySelectorAll('.track-option').forEach(el=>el.addEventListener('click',()=>{
      document.querySelectorAll('.track-option').forEach(e=>e.classList.remove('selected'));
      el.classList.add('selected');this.selectedTrack=+el.dataset.track;
    }));
    $('toModeBtn').onclick=()=>this._setState('mode-select');
    $('backToKartBtn').onclick=()=>this._setState('selecting-kart');

    // Mode select
    $('soloModeCard').addEventListener('click',()=>{this.isMultiplayer=false;this._startRace();});
    $('multiModeCard').addEventListener('click',()=>this._setState('multi-lobby'));
    $('backToTrackBtn').onclick=()=>this._setState('selecting-track');

    // Lobby tabs
    $('tabHost').addEventListener('click',()=>{
      $('tabHost').classList.add('active');$('tabJoin').classList.remove('active');
      $('hostPanel').classList.remove('hidden');$('joinPanel').classList.add('hidden');
    });
    $('tabJoin').addEventListener('click',()=>{
      $('tabJoin').classList.add('active');$('tabHost').classList.remove('active');
      $('joinPanel').classList.remove('hidden');$('hostPanel').classList.add('hidden');
    });

    // Lobby host
    $('hostCancelBtn').onclick=()=>this._setState('mode-select');
    $('readyBtn').onclick=()=>{if(this.socket)this.socket.emit('player-ready');};
    $('startRaceBtn').onclick=()=>{if(this.socket&&this.isHost)this.socket.emit('start-race');};

    // Lobby join
    const ci=$('codeInput');
    ci.addEventListener('input',()=>{ci.value=ci.value.toUpperCase().replace(/[^A-Z0-9]/g,'');$('joinError').textContent='';});
    $('joinRoomBtn').onclick=()=>{
      const code=ci.value.trim();
      if(code.length!==4){$('joinError').textContent='Enter a 4-character code';return;}
      this.isHost=false;this.socket.emit('join-room',{code,kartId:this.selectedKart});
    };
    $('joinCancelBtn').onclick=()=>this._setState('mode-select');

    // Results
    $('playAgainBtn').onclick=()=>{this.isMultiplayer=false;this._startRace();};
    $('mainMenuBtn').onclick=()=>this._setState('menu');

    // Settings
    $('settingsBackBtn').onclick=()=>{saveSettings(this.settings);this._applySettings();this._setState('menu');};
    $('masterVol').oninput=e=>{this.settings.master=e.target.value/100;this.audio.setMaster(this.settings.master);};
    $('musicVol').oninput=e=>{this.settings.music=e.target.value/100;this.audio.setMusic(this.settings.music);};
    $('sfxVol').oninput=e=>{this.settings.sfx=e.target.value/100;this.audio.setSfx(this.settings.sfx);};
    $('ghostToggle').onchange=e=>{this.settings.ghost=e.target.checked;};
    $('joystickToggle').onchange=e=>{this.settings.joystick=e.target.checked;document.getElementById('mobileControls').classList.toggle('joystick-mode',e.target.checked);};
    $('driftAssistToggle').onchange=e=>{this.settings.driftAssist=e.target.checked;};

    // Mobile controls
    const dirs={btnLeft:'left',btnRight:'right',btnUp:'up',btnDown:'down',btnDrift:'drift',btnItem:'item'};
    for(const [id,dir] of Object.entries(dirs)){
      const btn=$(id);if(!btn)continue;
      const set=v=>{this.input.touch[dir]=v;btn.classList.toggle('pressed',v);};
      btn.addEventListener('touchstart',e=>{e.preventDefault();set(true);},{passive:false});
      btn.addEventListener('touchend',  e=>{e.preventDefault();set(false);},{passive:false});
      btn.addEventListener('touchcancel',e=>{e.preventDefault();set(false);},{passive:false});
      btn.addEventListener('mousedown',()=>set(true));
      btn.addEventListener('mouseup',  ()=>set(false));
      btn.addEventListener('mouseleave',()=>set(false));
    }
  }

  _setState(state){
    this.state=state;
    const map={'menu':'menuScreen','selecting-kart':'kartSelectScreen','selecting-track':'trackSelectScreen',
      'mode-select':'modeSelectScreen','multi-lobby':'multiLobbyScreen','results':'resultsScreen','settings':'settingsScreen'};
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if(map[state])document.getElementById(map[state]).classList.add('active');
    const racing=['racing','countdown','finished'].includes(state);
    document.getElementById('mobileControls').classList.toggle('racing',racing);
    const hb=document.getElementById('raceHUDButtons');
    if(hb)hb.classList.toggle('racing',['racing','countdown'].includes(state));
    if(state==='multi-lobby'){
      document.getElementById('roomCodeDisplay').textContent='----';
      document.getElementById('hostStatus').textContent='Waiting…';
      document.getElementById('joinError').textContent='';
      document.getElementById('codeInput').value='';
      document.getElementById('tabHost').classList.add('active');
      document.getElementById('tabJoin').classList.remove('active');
      document.getElementById('hostPanel').classList.remove('hidden');
      document.getElementById('joinPanel').classList.add('hidden');
      this.isHost=true;this.mySlot=0;
      if(this.socket)this.socket.emit('create-room',{kartId:this.selectedKart,trackId:this.selectedTrack});
    }
  }

  // ─── PREVIEWS ───────────────────────────────────────────
  _drawPreviews(){
    TRACKS.forEach((track,i)=>{
      const cvs=document.getElementById(`trackCanvas${i}`);if(!cvs)return;
      const ctx=cvs.getContext('2d');
      const sp=generateSpline(track.waypoints,8);
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      sp.forEach(p=>{if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y;});
      const pad=12,sc=Math.min((cvs.width-pad*2)/(maxX-minX),(cvs.height-pad*2)/(maxY-minY))*.9;
      const ox=pad+(cvs.width-pad*2-(maxX-minX)*sc)/2,oy=pad+(cvs.height-pad*2-(maxY-minY)*sc)/2;
      const mp=p=>({x:ox+(p.x-minX)*sc,y:oy+(p.y-minY)*sc});
      ctx.fillStyle=track.bgColor;ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.beginPath();sp.forEach((p,j)=>{const m=mp(p);j===0?ctx.moveTo(m.x,m.y):ctx.lineTo(m.x,m.y);});ctx.closePath();
      ctx.strokeStyle='#fff';ctx.lineWidth=9;ctx.stroke();
      ctx.strokeStyle=track.trackColor;ctx.lineWidth=7;ctx.stroke();
      const s0=mp(sp[0]);ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(s0.x,s0.y,5,0,Math.PI*2);ctx.fill();
    });
    KARTS.forEach((kart,i)=>{
      const div=document.getElementById(`kartPreview${i}`);if(!div)return;
      const cvs=document.createElement('canvas');cvs.width=130;cvs.height=64;cvs.style.display='block';div.appendChild(cvs);
      const ctx=cvs.getContext('2d');ctx.translate(65,32);this._drawKartShape(ctx,kart,2.8);
    });
  }

  // ─── RACE START ──────────────────────────────────────────
  _startRace(){
    this.audio.start();
    const td=TRACKS[this.selectedTrack],kd=KARTS[this.selectedKart];
    this.currentTrack=td;this.spline=generateSpline(td.waypoints,20);
    this._trees=null;this._buildings=null;this._rocks=null;this.dayTime=0;
    const n=this.spline.length;
    this.checkpoints=[{pt:this.spline[Math.floor(n*0.33)],passed:false},{pt:this.spline[Math.floor(n*0.67)],passed:false}];

    // Generate boost pad and power-up world positions
    this.boostPads=td.boostPadTs.map(t=>{
      const idx=Math.floor(t*n);const pt=this.spline[idx];
      const pt2=this.spline[(idx+1)%n];const a=Math.atan2(pt2.y-pt.y,pt2.x-pt.x);
      return{x:pt.x,y:pt.y,angle:a,cooldown:0};
    });
    this.powerUpPickups=td.powerUpTs.map((t,i)=>{
      const idx=Math.floor(t*n);const pt=this.spline[idx];
      const types=['boost','shield','oil'];
      return{x:pt.x,y:pt.y,type:types[i%3],available:true,respawnTimer:0,spinAngle:0};
    });
    this.oilSlicks=[];
    this._boostPadCooldown=new Map();

    const grid=td.grid;
    const myIdx=this.isMultiplayer?this.mySlot:0;
    this.player=new Kart({...kd},grid[myIdx].x,grid[myIdx].y,grid[myIdx].angle);
    this.player.isPlayer=true;
    this.player._onActivate=(type)=>this._activatePlayerItem(type);

    if(this.isMultiplayer){
      this.aiKarts=[];
    }else{
      this.opponents=[null,null,null,null];this.aiKarts=[];
      for(let i=1;i<grid.length;i++){
        const aiData=KARTS[(this.selectedKart+i)%KARTS.length];
        const ai=new AIKart({...aiData},grid[i].x,grid[i].y,grid[i].angle,this.spline);
        ai.aiVariance=0.82+Math.random()*0.22;this.aiKarts.push(ai);
      }
    }

    this.lap=1;this.raceTime=0;this.lapTimes=[];this.lastLapTime=0;this.bestLap=Infinity;
    this.countdownTimer=3.6;this._lapFlash=0;this._lapFlashMsg='';this._netTimer=0;
    this.camera={x:grid[myIdx].x,y:grid[myIdx].y};
    this.particles=new ParticleSystem();

    this.ghost.startRecording();
    this._setState('countdown');
  }

  _activatePlayerItem(type){
    if(type==='boost'){this.player.boostTimer=3.0;this.audio.playBoost();}
    else if(type==='shield'){this.player.shieldTimer=8.0;}
    else if(type==='oil'){const dx=Math.cos(this.player.angle),dy=Math.sin(this.player.angle);this.oilSlicks.push({x:this.player.x-dx*35,y:this.player.y-dy*35,radius:35,life:10,ownerKart:this.player});}
  }

  // ─── GAME UPDATE ─────────────────────────────────────────
  _update(dt){
    if(this.state==='countdown'){
      this.countdownTimer-=dt;
      this.camera.x=lerp(this.camera.x,this.player.x,0.08);
      this.camera.y=lerp(this.camera.y,this.player.y,0.08);
      if(this.countdownTimer<=0){this.state='racing';document.getElementById('mobileControls').classList.add('racing');}
      return;
    }
    if(this.state!=='racing')return;
    if(this.paused)return;

    this.raceTime+=dt;
    if(this._lapFlash>0)this._lapFlash-=dt;
    if(this.currentTrack.theme==='night')this.dayTime=Math.min(this.raceTime/90,1);

    // Build effective input (joystick or buttons)
    let inp=this.input;
    if(this.settings.joystick&&this.joystick.active){
      inp={up:this.joystick.out.up,down:this.joystick.out.down,left:this.joystick.out.left,right:this.joystick.out.right,drift:this.input.drift,item:this.input.item};
    }

    // Drift assist: auto-correct oversteering
    if(this.settings.driftAssist&&this.player.isDrifting){
      const vAngle=Math.atan2(this.player.vy,this.player.vx);
      const diff=normalizeAngle(vAngle-this.player.angle);
      if(Math.abs(diff)>0.35){inp={...inp,right:diff<0,left:diff>0};}
    }

    this.player.update(inp,this.spline,this.currentTrack.trackWidth,dt,this.currentTrack.traction);

    // Engine audio
    this.audio.updateEngine(this.player.speed,this.player.maxSpeed,this.player.isDrifting);
    this.audio.setDriftScreech(this.player.isDrifting);

    // Skid marks and smoke while drifting
    if(this.player.isDrifting&&Math.abs(this.player.speed)>20){
      const a=this.player.angle+Math.PI/2,rw=this.player.width/2-2;
      for(let s=-1;s<=1;s+=2){
        const wx=this.player.x+Math.cos(a)*rw*s,wy=this.player.y+Math.sin(a)*rw*s;
        this.particles.addSkid(wx,wy,this.player.angle);
        if(Math.random()<0.3)this.particles.emit(wx,wy,'smoke',1,{c:'120,120,120',angle:-Math.PI/2});
      }
    }
    // Dirt when off-track
    if(this.player.offTrack&&this.player.speed>30&&Math.random()<0.4){
      const dc=this.currentTrack.theme==='ice'?'#c8e8f0':'#7a5a20';
      this.particles.emit(this.player.x,this.player.y,'dirt',2,{angle:this.player.angle+Math.PI,c:dc});
    }

    // AI karts
    this.aiKarts.forEach(ai=>ai.update(null,this.spline,this.currentTrack.trackWidth,dt));

    // Network opponents interpolation
    if(this.isMultiplayer){
      this.opponents.forEach((opp,i)=>{
        if(!opp||i===this.mySlot)return;
        const a=clamp(8*dt,0,1);
        opp.x=lerp(opp.x,opp.targetX,a);opp.y=lerp(opp.y,opp.targetY,a);
      });
      this._netTimer+=dt;
      if(this._netTimer>=0.05){this._emitKartUpdate();this._netTimer=0;}
    }

    // Boost pad timer countdown
    for(const[k,v] of this._boostPadCooldown){this._boostPadCooldown.set(k,v-dt);if(v-dt<=0)this._boostPadCooldown.delete(k);}

    // Power-up respawns
    this.powerUpPickups.forEach(pu=>{if(!pu.available){pu.respawnTimer-=dt;if(pu.respawnTimer<=0)pu.available=true;}pu.spinAngle+=dt*2;});

    // Oil slick decay
    this.oilSlicks=this.oilSlicks.filter(o=>{o.life-=dt;return o.life>0;});

    this._checkBoostPads();
    this._checkPowerUpPickups();
    this._checkOilSlicks();
    this._checkCollisions();
    this._checkLaps();

    // Boost flame particles for player
    if(this.player.boostTimer>0){
      const bx=this.player.x-Math.cos(this.player.angle)*this.player.width/2;
      const by=this.player.y-Math.sin(this.player.angle)*this.player.width/2;
      if(Math.random()<0.5)this.particles.emit(bx,by,'flame',2,{angle:this.player.angle+Math.PI});
    }

    this.particles.update(dt);
    if(this.settings.ghost)this.ghost.updatePlayback(dt);

    this.camera.x=lerp(this.camera.x,this.player.x,0.1);
    this.camera.y=lerp(this.camera.y,this.player.y,0.1);
  }

  // ─── BOOST PADS ──────────────────────────────────────────
  _checkBoostPads(){
    const allKarts=[this.player,...this.aiKarts];
    allKarts.forEach((kart,ki)=>{
      this.boostPads.forEach((pad,pi)=>{
        const key=`${ki}-${pi}`;
        if(this._boostPadCooldown.get(key)>0)return;
        if(dist(kart,pad)<55){
          kart.boostTimer=Math.max(kart.boostTimer,1.5);
          this._boostPadCooldown.set(key,3.0);
          if(kart===this.player){this.audio.playBoost();}
          const bx=kart.x-Math.cos(kart.angle)*kart.width/2;
          const by=kart.y-Math.sin(kart.angle)*kart.width/2;
          this.particles.emit(bx,by,'flame',4,{angle:kart.angle+Math.PI});
        }
      });
    });
  }

  // ─── POWER-UP PICKUPS ────────────────────────────────────
  _checkPowerUpPickups(){
    const allKarts=[this.player,...this.aiKarts];
    allKarts.forEach(kart=>{
      this.powerUpPickups.forEach(pu=>{
        if(!pu.available)return;
        if(dist(kart,pu)<36){
          pu.available=false;pu.respawnTimer=12;
          if(!kart.powerUp){kart.powerUp=pu.type;}
          if(kart===this.player){this.audio.playPickup();}
          this.particles.emit(pu.x,pu.y,'spark',8);
          // AI auto-uses boost/oil
          if(kart!==this.player&&kart.powerUp){
            if(kart.powerUp==='boost')kart.boostTimer=3.0;
            else if(kart.powerUp==='oil')this.oilSlicks.push({x:kart.x,y:kart.y,radius:35,life:8,ownerKart:kart});
            kart.powerUp=null;
          }
        }
      });
    });
  }

  // ─── OIL SLICKS ──────────────────────────────────────────
  _checkOilSlicks(){
    const allKarts=[this.player,...this.aiKarts];
    this.oilSlicks.forEach(oil=>{
      allKarts.forEach(kart=>{
        if(kart===oil.ownerKart)return;
        if(dist(kart,oil)<oil.radius+16&&kart.spinTimer<=0){
          kart.spinTimer=1.4;oil.life=Math.min(oil.life,3);
          if(kart===this.player)this._showOverlay('OIL SLICK!','#aa44ff');
          this.audio.playCollision();
        }
      });
    });
  }

  // ─── COLLISIONS ──────────────────────────────────────────
  _checkCollisions(){
    const allKarts=[this.player,...this.aiKarts];
    for(let i=0;i<allKarts.length;i++){
      for(let j=i+1;j<allKarts.length;j++){
        const a=allKarts[i],b=allKarts[j];
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy),minD=24;
        if(d<minD&&d>0.01){
          const nx=dx/d,ny=dy/d,ov=minD-d;
          // Shield absorbs hit
          const aShield=a.shieldTimer>0,bShield=b.shieldTimer>0;
          if(!aShield){a.x-=nx*ov*0.55;a.y-=ny*ov*0.55;const dv=a.vx*nx+a.vy*ny;if(dv>0){a.vx-=dv*nx*1.4;a.vy-=dv*ny*1.4;a.speed*=0.72;}}
          if(!bShield){b.x+=nx*ov*0.55;b.y+=ny*ov*0.55;const dv=b.vx*(-nx)+b.vy*(-ny);if(dv>0){b.vx+=dv*nx*1.4;b.vy+=dv*ny*1.4;b.speed*=0.72;}}
          if(aShield)a.shieldTimer-=2;
          if(bShield)b.shieldTimer-=2;
          // Sparks
          const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
          this.particles.emit(mx,my,'spark',10,{angle:Math.atan2(ny,nx)});
          this.audio.playCollision();
        }
      }
    }
  }

  // ─── LAP DETECTION ──────────────────────────────────────
  _checkLaps(){
    const near=nearestOnSpline(this.spline,this.player);
    const n=this.spline.length;
    this.checkpoints.forEach(cp=>{if(!cp.passed&&dist(this.player,cp.pt)<95)cp.passed=true;});
    const allPassed=this.checkpoints.every(c=>c.passed);
    const nearStart=near.idx<n*0.08||near.idx>n*0.92;
    if(allPassed&&nearStart&&dist(this.player,this.spline[0])<115){
      const wp=this.currentTrack.waypoints;const dx=wp[1].x-wp[0].x,dy=wp[1].y-wp[0].y;
      if(this.player.vx*dx+this.player.vy*dy>0)this._completeLap();
    }
  }

  _completeLap(){
    const lapTime=this.raceTime-this.lastLapTime;
    this.lapTimes.push(lapTime);
    const isNewBest=lapTime<this.bestLap;
    if(isNewBest)this.bestLap=lapTime;
    this.ghost.finishLap(isNewBest);
    this.lastLapTime=this.raceTime;
    this.checkpoints.forEach(c=>c.passed=false);
    this._lapFlash=1.4;
    this._lapFlashMsg=isNewBest?`LAP ${this.lap}  ·  ${this._fmt(lapTime)}  ·  NEW BEST!`:`LAP ${this.lap}  ·  ${this._fmt(lapTime)}`;
    this.audio.playLapComplete();
    if(this.isMultiplayer&&this.socket)this.socket.emit('lap-complete',{lap:this.lap,lapTime});
    if(this.lap>=this.currentTrack.laps){
      this.state='finished';this.audio.stopEngine();
      if(this.isMultiplayer&&this.socket)this.socket.emit('race-finish');
      setTimeout(()=>this._showResults(),2200);
    }else{
      this.lap++;
      this.ghost.startRecording();
      if(this.settings.ghost)this.ghost.startPlayback();
    }
  }

  // ─── RESULTS ────────────────────────────────────────────
  _showResults(){
    const panels=document.getElementById('resultsPanels');panels.innerHTML='';
    const buildPanel=(label,lapTimes,totalTime,isWinner,color)=>{
      const div=document.createElement('div');div.className='results-panel'+(isWinner?' winner':'');
      const best=lapTimes.length?Math.min(...lapTimes):Infinity;
      const rows=lapTimes.map((t,i)=>`<tr class="${t===best&&lapTimes.length>1?'best-lap':''}"><td>Lap ${i+1}</td><td>${this._fmt(t)}</td></tr>`).join('');
      div.innerHTML=`<div class="results-name" style="color:${color||'#fff'}">${label}${isWinner?'<span class="results-badge gold">WINNER</span>':''}</div><table class="results-table"><thead><tr><th>Lap</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table><div class="total-time">Total: <span>${this._fmt(totalTime)}</span></div>${best!==Infinity?`<div class="total-time" style="margin-top:4px">Best: <span>${this._fmt(best)}</span></div>`:''}`;
      return div;
    };
    const activeOpps=this.opponents.filter((o,i)=>o&&i!==this.mySlot);
    if(this.isMultiplayer&&activeOpps.length>0){
      const myWins=activeOpps.every(o=>this.raceTime<=o.lapTimes.reduce((a,b)=>a+b,0)||!o.finished);
      panels.appendChild(buildPanel('YOU',this.lapTimes,this.raceTime,myWins,this.player.color));
      activeOpps.forEach((o,i)=>{
        const tot=o.lapTimes.reduce((a,b)=>a+b,0);
        panels.appendChild(buildPanel(`P${i+2}`,o.lapTimes,tot,!myWins&&i===0,o.color));
      });
    }else{
      // Solo: show all AI
      const all=[{label:'YOU',lapTimes:this.lapTimes,total:this.raceTime,color:this.player.color,winner:true}];
      panels.appendChild(buildPanel(all[0].label,all[0].lapTimes,all[0].total,true,all[0].color));
    }
    this._setState('results');
  }

  _fmt(sec){const m=Math.floor(sec/60),s=(sec%60).toFixed(2).padStart(5,'0');return`${m}:${s}`;}
  _showOverlay(msg,color='#fff'){this._overlayMsg=msg;this._overlayColor=color;this._overlayTimer=2.5;}

  // ─── LEADERBOARD ─────────────────────────────────────────
  _getLeaderboard(){
    const entries=[];
    const progress=(kart,lap)=>{const near=nearestOnSpline(this.spline,kart);return(lap-1)+near.idx/this.spline.length;};
    entries.push({label:'YOU',color:this.player.color,prog:progress(this.player,this.lap)});
    this.aiKarts.forEach((ai,i)=>entries.push({label:`AI${i+1}`,color:ai.color,prog:progress(ai,ai.lap)}));
    this.opponents.forEach((o,i)=>{if(o&&i!==this.mySlot)entries.push({label:`P${i+1}`,color:o.color,prog:progress(o,o.netLap||1)});});
    entries.sort((a,b)=>b.prog-a.prog);
    return entries;
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  _render(){
    const{canvas,ctx}=this;const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const isMenu=['menu','selecting-kart','selecting-track','mode-select','multi-lobby','results','settings'].includes(this.state);
    if(isMenu){ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);this._drawStars(ctx,W,H);return;}

    if(this.viewMode!=='top-down'&&this.player){
      this._renderPerspective(ctx,W,H);
    } else {
      ctx.save();
      ctx.translate(Math.round(W/2-this.camera.x),Math.round(H/2-this.camera.y));
      this._drawWorld(ctx);
      this._drawTrack(ctx);
      this.particles.renderSkids(ctx);
      this._drawBoostPadSprites(ctx);
      this._drawPowerUpItems(ctx);
      this._drawOilSlickSprites(ctx);
      this.aiKarts.forEach(ai=>this._drawKartEntity(ctx,ai,false));
      this.opponents.forEach((o,i)=>{if(o&&i!==this.mySlot)this._drawKartEntity(ctx,o,true);});
      if(this.settings.ghost&&this.ghost.ghost)this._drawGhost(ctx);
      if(this.player)this._drawKartEntity(ctx,this.player,false);
      this.particles.renderParticles(ctx);
      ctx.restore();
    }

    if(['racing','finished'].includes(this.state))this._drawHUD(ctx,W,H);
    this._drawMinimap(ctx,W,H);
    if(this.state==='countdown')this._drawCountdown(ctx,W,H);
    if(this.state==='finished') this._drawFinishedBanner(ctx,W,H);
    if(this._lapFlash>0)        this._drawLapFlash(ctx,W,H);
    if(this._overlayTimer>0)    this._drawOverlay(ctx,W,H);
    if(this.settings.joystick)  this.joystick.render(ctx);
    if(this.paused)             this._drawPauseOverlay(ctx,W,H);
  }

  // ─── BACKGROUND / WORLD ──────────────────────────────────
  _drawStars(ctx,W,H){
    if(!this._starCache)this._starCache=Array.from({length:90},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.3,a:Math.random()*.7+.3}));
    this._starCache.forEach(s=>{ctx.fillStyle=`rgba(210,210,255,${s.a})`;ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();});
  }

  _drawWorld(ctx){
    const track=this.currentTrack;
    if(track.theme==='night'){this._drawNightCity(ctx);return;}
    if(track.theme==='ice'){this._drawIceValley(ctx);return;}
    ctx.fillStyle=track.bgColor;ctx.fillRect(0,0,4300,3300);
    if(track.theme==='desert'){
      ctx.fillStyle='rgba(0,0,0,0.04)';for(let x=0;x<4300;x+=100)for(let y=0;y<3300;y+=100)if(((x/100+y/100)%2)===0)ctx.fillRect(x,y,50,50);
      ctx.fillStyle='rgba(180,130,40,0.35)';[[400,600],[1800,400],[3200,500],[3500,1800],[300,2700],[2800,2800]].forEach(([rx,ry])=>{ctx.beginPath();ctx.ellipse(rx,ry,80+Math.sin(rx)*30,45+Math.cos(ry)*20,Math.sin(rx)*.5,0,Math.PI*2);ctx.fill();});
    }else{
      if(!this._trees)this._buildTrees();
      this._trees.forEach(t=>{ctx.fillStyle='rgba(0,0,0,0.18)';ctx.beginPath();ctx.ellipse(t.x+8,t.y+8,t.r,t.r*.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.dark?'#173a12':'#1e5218';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.dark?'#1f4e19':'#2a6e22';ctx.beginPath();ctx.arc(t.x-t.r*.2,t.y-t.r*.2,t.r*.65,0,Math.PI*2);ctx.fill();});
    }
  }

  _drawNightCity(ctx){
    const n=this.dayTime;
    const skyR=Math.round(lerp(30,5,n)),skyG=Math.round(lerp(15,8,n)),skyB=Math.round(lerp(60,18,n));
    ctx.fillStyle=`rgb(${skyR},${skyG},${skyB})`;ctx.fillRect(0,0,4300,3300);
    if(!this._buildings)this._buildBuildings();
    this._buildings.forEach(b=>{
      ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h);
      if(n>0.2){
        ctx.fillStyle=`rgba(255,220,80,${(n-0.2)*0.7*b.litFrac})`;
        for(const w of b.wins)ctx.fillRect(w.x,w.y,6,5);
      }
      // Neon sign
      if(n>0.4&&b.neon){ctx.fillStyle=`rgba(${b.neonC},${(n-0.4)*0.9})`;ctx.fillRect(b.x+b.w/2-10,b.y-4,20,4);}
    });
    // Street lights
    if(n>0.3){
      const glow=`rgba(255,220,100,${(n-0.3)*0.6})`;
      this.spline.forEach((p,i)=>{
        if(i%60===0){ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,8+(n-0.3)*8,0,Math.PI*2);ctx.fill();}
      });
    }
    // Night overlay
    if(n>0){ctx.fillStyle=`rgba(0,0,10,${n*0.3})`;ctx.fillRect(0,0,4300,3300);}
  }

  _buildBuildings(){
    this._buildings=[];
    const half=this.currentTrack.trackWidth/2+60;
    let att=0;const neonColors=['255,0,128','0,200,255','180,0,255','255,100,0'];
    while(this._buildings.length<45&&att<1500){
      att++;
      const bw=60+Math.random()*120,bh=80+Math.random()*200;
      const bx=60+Math.random()*4100,by=60+Math.random()*3000;
      if(nearestOnSpline(this.spline,{x:bx+bw/2,y:by+bh/2}).d<half+bw/2)continue;
      const gv=Math.round(20+Math.random()*30);
      const wins=[];
      for(let wy=by+10;wy<by+bh-10;wy+=14)for(let wx=bx+8;wx<bx+bw-8;wx+=12)if(Math.random()>0.35)wins.push({x:wx,y:wy});
      this._buildings.push({x:bx,y:by,w:bw,h:bh,color:`rgb(${gv},${gv},${gv+15})`,wins,litFrac:0.3+Math.random()*0.7,neon:Math.random()>0.6,neonC:neonColors[Math.floor(Math.random()*neonColors.length)]});
    }
  }

  _drawIceValley(ctx){
    ctx.fillStyle='#c8dff0';ctx.fillRect(0,0,4300,3300);
    // Snow texture
    ctx.fillStyle='rgba(255,255,255,0.4)';
    for(let x=0;x<4300;x+=80)for(let y=0;y<3300;y+=80)if(((x+y)/80)%3===0)ctx.beginPath(),ctx.arc(x+Math.sin(x)*20,y+Math.cos(y)*20,8+Math.sin(x+y)*6,0,Math.PI*2),ctx.fill();
    // Rocks / boulders
    if(!this._rocks)this._buildRocks();
    this._rocks.forEach(r=>{ctx.fillStyle='rgba(150,170,190,0.7)';ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*0.65,r.a,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(200,220,240,0.5)';ctx.beginPath();ctx.ellipse(r.x-r.r*0.2,r.y-r.r*0.2,r.r*0.6,r.r*0.4,r.a,0,Math.PI*2);ctx.fill();});
  }

  _buildRocks(){
    this._rocks=[];const half=this.currentTrack.trackWidth/2+40;let att=0;
    while(this._rocks.length<60&&att<1500){att++;const r={x:80+Math.random()*4100,y:80+Math.random()*3100,r:15+Math.random()*40,a:Math.random()*Math.PI};if(nearestOnSpline(this.spline,r).d>half+r.r)this._rocks.push(r);}
  }

  _buildTrees(){
    this._trees=[];const half=this.currentTrack.trackWidth/2+30;let att=0;
    while(this._trees.length<100&&att<2000){att++;const t={x:80+Math.random()*4100,y:80+Math.random()*3050,r:18+Math.random()*28,dark:Math.random()>.5};if(nearestOnSpline(this.spline,t).d>half+t.r)this._trees.push(t);}
  }

  // ─── TRACK RENDER ────────────────────────────────────────
  _drawTrack(ctx){
    const{spline,currentTrack:track}=this;const W=track.trackWidth;
    ctx.lineJoin='round';ctx.lineCap='round';
    const path=()=>{ctx.beginPath();spline.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.closePath();};
    if(track.theme!=='ice'){
      path();ctx.strokeStyle='#cc1111';ctx.lineWidth=W+28;ctx.stroke();
      ctx.save();ctx.setLineDash([22,22]);path();ctx.strokeStyle='#ffffff';ctx.lineWidth=W+28;ctx.stroke();ctx.restore();
    }else{
      path();ctx.strokeStyle='rgba(150,180,220,0.8)';ctx.lineWidth=W+28;ctx.stroke();
    }
    path();ctx.strokeStyle='#e0e0e0';ctx.lineWidth=W+16;ctx.stroke();
    path();ctx.strokeStyle=track.trackColor;ctx.lineWidth=W;ctx.stroke();
    if(track.theme==='ice'){
      // Icy sheen
      ctx.save();ctx.setLineDash([40,40]);path();ctx.strokeStyle='rgba(200,230,255,0.25)';ctx.lineWidth=W-20;ctx.stroke();ctx.restore();
    }else{
      ctx.save();ctx.setLineDash([28,28]);path();ctx.strokeStyle='#3e3e3e';ctx.lineWidth=W-12;ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.setLineDash([26,24]);path();
    ctx.strokeStyle=track.theme==='night'?'#00aaff':track.theme==='ice'?'rgba(200,230,255,0.5)':'#eecc00';
    ctx.lineWidth=3.5;ctx.stroke();ctx.restore();
    this._drawStartLine(ctx);
    this._drawStartGrid(ctx);
  }

  _drawStartLine(ctx){
    const sp=this.spline[0],sp1=this.spline[1];const a=Math.atan2(sp1.y-sp.y,sp1.x-sp.x);
    const hw=this.currentTrack.trackWidth/2+5,sq=13;
    ctx.save();ctx.translate(sp.x,sp.y);ctx.rotate(a+Math.PI/2);
    const cols=Math.ceil(hw*2/sq);
    for(let i=-Math.ceil(cols/2);i<=Math.ceil(cols/2);i++)for(let row=-1;row<=1;row++){ctx.fillStyle=(i+row)%2===0?'#ffffff':'#111111';ctx.fillRect(i*sq-sq/2,row*sq-sq/2,sq,sq);}
    ctx.restore();
  }

  _drawBoostPadSprites(ctx){
    this.boostPads.forEach(pad=>{
      ctx.save();ctx.translate(pad.x,pad.y);ctx.rotate(pad.angle);
      const w=50,h=24;
      const gd=ctx.createLinearGradient(-w/2,0,w/2,0);gd.addColorStop(0,'rgba(255,200,0,0)');gd.addColorStop(0.5,'rgba(255,220,0,0.9)');gd.addColorStop(1,'rgba(255,160,0,0)');
      ctx.fillStyle=gd;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,4);ctx.fill();
      // Arrow chevrons
      ctx.fillStyle='rgba(255,255,255,0.9)';
      for(let i=0;i<3;i++){const ox=(-12+i*12);ctx.beginPath();ctx.moveTo(ox-5,0);ctx.lineTo(ox,8);ctx.lineTo(ox+5,0);ctx.lineTo(ox+5,-8);ctx.lineTo(ox,-4);ctx.lineTo(ox-5,-8);ctx.closePath();ctx.fill();}
      ctx.restore();
    });
  }

  _drawPowerUpItems(ctx){
    this.powerUpPickups.forEach(pu=>{
      if(!pu.available)return;
      ctx.save();ctx.translate(pu.x,pu.y);ctx.rotate(pu.spinAngle);
      const sz=18;
      const colors={'boost':'#ff8800','shield':'#44aaff','oil':'#882299'};
      const c=colors[pu.type]||'#fff';
      const gd=ctx.createRadialGradient(0,0,0,0,0,sz);gd.addColorStop(0,'rgba(255,255,255,0.9)');gd.addColorStop(0.5,c);gd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gd;ctx.beginPath();
      for(let k=0;k<4;k++){const a=k*Math.PI/2,b=a+Math.PI/4;ctx.lineTo(Math.cos(a)*sz,Math.sin(a)*sz);ctx.lineTo(Math.cos(b)*sz*0.65,Math.sin(b)*sz*0.65);}
      ctx.closePath();ctx.fill();
      // Icon letter
      ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(pu.type==='boost'?'B':pu.type==='shield'?'S':'O',0,0);
      ctx.restore();
    });
  }

  _drawOilSlickSprites(ctx){
    this.oilSlicks.forEach(oil=>{
      const a=Math.min(oil.life/3,1)*0.55;
      ctx.save();ctx.globalAlpha=a;
      const gd=ctx.createRadialGradient(oil.x,oil.y,0,oil.x,oil.y,oil.radius);
      gd.addColorStop(0,'rgba(60,20,80,0.9)');gd.addColorStop(0.6,'rgba(40,10,60,0.6)');gd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gd;ctx.beginPath();ctx.ellipse(oil.x,oil.y,oil.radius,oil.radius*0.6,0,0,Math.PI*2);ctx.fill();
      // Rainbow sheen
      ctx.globalAlpha=a*0.4;const gd2=ctx.createLinearGradient(oil.x-oil.radius,oil.y,oil.x+oil.radius,oil.y);
      gd2.addColorStop(0,'rgba(255,0,0,0.5)');gd2.addColorStop(0.33,'rgba(0,255,0,0.5)');gd2.addColorStop(0.66,'rgba(0,0,255,0.5)');gd2.addColorStop(1,'rgba(255,0,255,0.5)');
      ctx.fillStyle=gd2;ctx.beginPath();ctx.ellipse(oil.x,oil.y,oil.radius,oil.radius*0.6,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
  }

  // ─── KART RENDER ─────────────────────────────────────────
  _drawKartEntity(ctx,kart,isOpponent){
    ctx.save();ctx.translate(kart.x,kart.y);ctx.rotate(kart.angle);
    if(isOpponent)ctx.globalAlpha=0.88;
    this._drawKartShape(ctx,kart,1);

    // Shield ring
    if(kart.shieldTimer>0){
      const pulse=0.7+0.3*Math.sin(Date.now()*0.01);
      ctx.save();ctx.globalAlpha=(kart.shieldTimer/8)*pulse;
      ctx.strokeStyle='#44aaff';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(0,0,kart.width*0.9,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(68,170,255,0.1)';ctx.beginPath();ctx.arc(0,0,kart.width*0.9,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Power-up indicator above kart
    if(kart.isPlayer&&kart.powerUp){
      const c=kart.powerUp==='boost'?'#ff8800':kart.powerUp==='shield'?'#44aaff':'#882299';
      ctx.save();ctx.fillStyle=c;ctx.beginPath();ctx.arc(kart.x,kart.y-36,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(kart.powerUp==='boost'?'B':kart.powerUp==='shield'?'S':'O',kart.x,kart.y-36);ctx.restore();
    }

    // Headlights on Night City at night
    if(this.currentTrack?.theme==='night'&&this.dayTime>0.5){
      ctx.save();ctx.translate(kart.x,kart.y);ctx.rotate(kart.angle);
      const gd=ctx.createRadialGradient(kart.width/2,0,2,kart.width/2,0,80);
      gd.addColorStop(0,`rgba(255,240,180,${this.dayTime*0.45})`);gd.addColorStop(1,'rgba(255,240,180,0)');
      ctx.fillStyle=gd;ctx.beginPath();ctx.arc(kart.width/2,0,80,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }

    if(isOpponent){
      ctx.save();ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(kart.x-24,kart.y-46,48,16);
      ctx.fillStyle=kart.color||'#fff';ctx.fillText('P?',kart.x,kart.y-38);ctx.restore();
    }

    if(kart.isPlayer&&kart.offTrack){ctx.save();ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ff8800';ctx.fillText('OFF TRACK',kart.x,kart.y-34);ctx.restore();}
  }

  _drawGhost(ctx){
    const g=this.ghost.ghost;if(!g)return;
    const kd=KARTS[this.selectedKart];
    ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.globalAlpha=0.32;
    this._drawKartShape(ctx,kd,1);ctx.restore();
  }

  _drawKartShape(ctx,kart,scale){
    ctx.save();ctx.scale(scale,scale);const w=kart.width,h=kart.height;
    ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(3,4,w*.55,h*.38,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=kart.bodyColor;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,3.5);ctx.fill();
    ctx.fillStyle=kart.color;ctx.beginPath();ctx.roundRect(-w/2+2,-h/2+2,w*.52,h-4,2.5);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.18)';ctx.beginPath();ctx.roundRect(-w/2+3,-h/2+3,w*.28,h-6,2);ctx.fill();
    ctx.fillStyle=kart.bodyColor;ctx.fillRect(w/2-5,-h/2-3,7,h+6);
    ctx.fillStyle='#222';ctx.fillRect(w/2-3,-h/2-5,3,3);ctx.fillRect(w/2-3,h/2+2,3,3);
    const ww=8,wh=5;
    ctx.fillStyle=kart.wheelColor;ctx.fillRect(-w/2-4,-h/2-3,ww,wh);ctx.fillRect(-w/2-4,h/2-2,ww,wh);ctx.fillRect(w/2-4,-h/2-3,ww,wh);ctx.fillRect(w/2-4,h/2-2,ww,wh);
    ctx.fillStyle='#555';ctx.fillRect(-w/2-2,-h/2-2,4,3);ctx.fillRect(-w/2-2,h/2-1,4,3);ctx.fillRect(w/2-2,-h/2-2,4,3);ctx.fillRect(w/2-2,h/2-1,4,3);
    ctx.restore();
  }

  // ─── HUD ────────────────────────────────────────────────
  _drawHUD(ctx,W,H){
    if(!this.player)return;
    const speed=Math.round(Math.abs(this.player.speed)*0.18);
    const curLap=this.raceTime-this.lastLapTime;
    const lapLabel=`LAP ${Math.min(this.lap,this.currentTrack.laps)} / ${this.currentTrack.laps}`;
    this._drawSoloHUD(ctx,W,H,speed,curLap,lapLabel);
    this._drawLeaderboard(ctx,W,H);
    this._drawPowerUpHUD(ctx,W,H);
    if(this.player.offTrack){ctx.fillStyle='rgba(255,100,0,0.09)';ctx.fillRect(0,0,W,H);}
    // Day/night gradient for Night City
    if(this.currentTrack.theme==='night'&&this.dayTime>0.3){
      ctx.fillStyle=`rgba(0,0,20,${this.dayTime*0.15})`;ctx.fillRect(0,0,W,H);
    }
  }

  _drawSoloHUD(ctx,W,H,speed,curLap,lapLabel){
    ctx.fillStyle='rgba(0,0,0,0.68)';ctx.fillRect(0,0,W,66);ctx.textBaseline='middle';
    ctx.textAlign='left';ctx.font=`bold 20px "Segoe UI",Arial`;ctx.fillStyle='#ddd';ctx.fillText(`TOTAL  ${this._fmt(this.raceTime)}`,16,22);
    ctx.font=`14px "Segoe UI",Arial`;ctx.fillStyle='rgba(255,204,0,0.85)';ctx.fillText(`LAP TIME  ${this._fmt(curLap)}`,16,48);
    ctx.textAlign='center';ctx.font=`bold 24px "Segoe UI",Arial`;ctx.fillStyle='#fff';ctx.fillText(lapLabel,W/2,33);
    ctx.textAlign='right';ctx.font=`bold 20px "Segoe UI",Arial`;ctx.fillStyle='#ffcc00';ctx.fillText(`${speed} km/h`,W-16,22);
    if(this.bestLap<Infinity){ctx.font=`13px "Segoe UI",Arial`;ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillText(`BEST  ${this._fmt(this.bestLap)}`,W-16,48);}
    // Drift charge bar
    if(this.player.driftCharge>0){
      const bw=80,bh=8,bx=W/2-bw/2,by=72;
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh);
      const frac=this.player.driftCharge/2.5;
      const gc=ctx.createLinearGradient(bx,0,bx+bw,0);gc.addColorStop(0,'#ff8800');gc.addColorStop(1,'#ffff00');
      ctx.fillStyle=gc;ctx.fillRect(bx,by,bw*frac,bh);
    }
  }

  _drawLeaderboard(ctx,W,H){
    const lb=this._getLeaderboard();if(lb.length<2)return;
    const myPos=lb.findIndex(e=>e.label==='YOU')+1;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W-120,80,106,lb.length*22+16,6);else ctx.rect(W-120,80,106,lb.length*22+16);ctx.fill();
    lb.forEach((e,i)=>{
      ctx.font=`bold ${i===myPos-1?13:12}px "Segoe UI",Arial`;
      ctx.fillStyle=i===myPos-1?'#ffcc00':e.color||'#ccc';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(`P${i+1} ${e.label}`,W-112,91+i*22+11);
    });
    ctx.restore();
  }

  _drawPowerUpHUD(ctx,W,H){
    const pu=this.player.powerUp;
    const slot=pu?{boost:'#ff8800',shield:'#44aaff',oil:'#882299'}[pu]:'rgba(255,255,255,0.1)';
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W/2-28,74,56,38,8);else ctx.rect(W/2-28,74,56,38);ctx.fill();
    ctx.fillStyle=slot;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W/2-22,78,44,30,6);else ctx.rect(W/2-22,78,44,30);ctx.fill();
    if(pu){ctx.fillStyle='#fff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pu.toUpperCase().slice(0,3),W/2,93);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('[E] USE',W/2,117);
  }

  // ─── MINIMAP ─────────────────────────────────────────────
  _drawMinimap(ctx,W,H){
    if(!this.spline||!['racing','finished','countdown'].includes(this.state))return;
    const mw=Math.min(W*.21,155),mh=mw*.72,mx=W-mw-14,my=H-mh-14,pad=9;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    this.spline.forEach(p=>{if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y;});
    const sc=Math.min((mw-pad*2)/(maxX-minX),(mh-pad*2)/(maxY-minY));
    const ox=mx+pad+((mw-pad*2)-(maxX-minX)*sc)/2,oy=my+pad+((mh-pad*2)-(maxY-minY)*sc)/2;
    const mp=p=>({x:ox+(p.x-minX)*sc,y:oy+(p.y-minY)*sc});
    ctx.fillStyle='rgba(0,0,0,0.72)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mx,my,mw,mh,7);else ctx.rect(mx,my,mw,mh);ctx.fill();
    ctx.beginPath();this.spline.forEach((p,i)=>{const m=mp(p);i===0?ctx.moveTo(m.x,m.y):ctx.lineTo(m.x,m.y);});ctx.closePath();
    ctx.strokeStyle='#555';ctx.lineWidth=4.5;ctx.stroke();ctx.strokeStyle='#888';ctx.lineWidth=3;ctx.stroke();
    const dot=(p,color,r)=>{const m=mp(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(m.x,m.y,r,0,Math.PI*2);ctx.fill();};
    this.aiKarts.forEach(ai=>dot(ai,ai.color,2.8));
    this.opponents.forEach((o,i)=>{if(o&&i!==this.mySlot)dot(o,o.color||'#fff',2.8);});
    if(this.player){dot(this.player,'#fff',4);const m=mp(this.player);ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(m.x+Math.cos(this.player.angle)*5,m.y+Math.sin(this.player.angle)*5,1.8,0,Math.PI*2);ctx.fill();}
  }

  // ─── COUNTDOWN ───────────────────────────────────────────
  _drawCountdown(ctx,W,H){
    const t=this.countdownTimer;let text,color;
    if(t>2.6){text='3';color='#ff4444';}else if(t>1.6){text='2';color='#ffaa00';}else if(t>0.6){text='1';color='#ffff44';}else{text='GO!';color='#44ff88';}
    const frac=(t%1+1)%1,scale=1+(1-frac)*.35,alpha=Math.min(1,frac*3.5);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(W/2,H*.45);ctx.scale(scale,scale);
    const fs=Math.round(88/scale);ctx.font=`bold ${fs}px "Segoe UI",Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillText(text,4,4);ctx.fillStyle=color;ctx.fillText(text,0,0);
    ctx.restore();
  }

  // ─── LAP FLASH ───────────────────────────────────────────
  _drawLapFlash(ctx,W,H){
    const a=Math.min(this._lapFlash,0.45);ctx.fillStyle=`rgba(255,220,0,${a})`;ctx.fillRect(0,0,W,H);
    const ma=Math.min(1,this._lapFlash*1.6);
    if(ma>0.05&&this._lapFlashMsg){ctx.save();ctx.globalAlpha=ma;ctx.font=`bold ${Math.round(W*0.042)}px "Segoe UI",Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillText(this._lapFlashMsg,W/2+2,H*.17+2);ctx.fillStyle='#fff';ctx.fillText(this._lapFlashMsg,W/2,H*.17);ctx.restore();}
  }

  // ─── FINISHED BANNER ─────────────────────────────────────
  _drawFinishedBanner(ctx,W,H){
    ctx.fillStyle='rgba(0,0,0,0.38)';ctx.fillRect(0,0,W,H);
    ctx.font=`bold ${Math.round(W*0.07)}px "Segoe UI",Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#ffcc00';ctx.fillText('RACE COMPLETE!',W/2,H/2);
  }

  // ─── OVERLAY ─────────────────────────────────────────────
  _drawOverlay(ctx,W,H){
    this._overlayTimer-=0.016;const alpha=Math.min(1,this._overlayTimer);
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(0,0,0,.55)';
    ctx.font=`bold 20px "Segoe UI",Arial`;const tw=ctx.measureText(this._overlayMsg).width+30;
    ctx.fillRect(W/2-tw/2,H*.1-18,tw,36);ctx.fillStyle=this._overlayColor;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this._overlayMsg,W/2,H*.1);ctx.restore();
  }

  // ─── VIEW & PAUSE ────────────────────────────────────────
  _cycleView(){
    const modes=['top-down','third-person','first-person'];
    this.viewMode=modes[(modes.indexOf(this.viewMode)+1)%modes.length];
    const labels={'top-down':'TOP VIEW','third-person':'3RD PERSON','first-person':'1ST PERSON'};
    this._showOverlay(labels[this.viewMode],'#ffcc00');
    const btn=document.getElementById('viewBtn');
    if(btn)btn.textContent={'top-down':'🗺','third-person':'📷','first-person':'🎯'}[this.viewMode];
  }

  _togglePause(){
    if(!['racing'].includes(this.state))return;
    this.paused=!this.paused;
    if(this.paused){this.audio.stopEngine();this.audio.setDriftScreech(false);}
    const btn=document.getElementById('pauseBtn');
    if(btn)btn.textContent=this.paused?'▶':'⏸';
  }

  // ─── 3D PROJECTION HELPER ────────────────────────────────
  _mkProj(camX,camY,angle,camH,focalLen,W,H,horizonY){
    const cosA=Math.cos(angle),sinA=Math.sin(angle);
    return(wx,wy)=>{
      const dx=wx-camX,dy=wy-camY;
      const fwd=dx*cosA+dy*sinA;
      const lat=-dx*sinA+dy*cosA;
      if(fwd<0.5)return null;
      const s=focalLen/fwd;
      return{sx:W/2+lat*s,sy:horizonY+camH*s,scale:s,fwd};
    };
  }

  // ─── PERSPECTIVE RENDERER ────────────────────────────────
  _renderPerspective(ctx,W,H){
    const player=this.player;
    const fp=this.viewMode==='first-person';
    const angle=player.angle;
    const camBack=fp?0:115, camH=fp?9:52, focalLen=H*0.72;
    const horizonY=Math.round(H*0.42);
    const camX=player.x-Math.cos(angle)*camBack;
    const camY=player.y-Math.sin(angle)*camBack;
    const proj=this._mkProj(camX,camY,angle,camH,focalLen,W,H,horizonY);

    // Sky
    this._drawSkyPerspective(ctx,W,H,horizonY,camX,camY);

    // Ground base fill below horizon
    const groundColors={desert:'#9a7030',forest:'#192e14',night:'#05080f',ice:'#aac8e0'};
    ctx.fillStyle=groundColors[this.currentTrack.theme]||'#2d4a20';
    ctx.fillRect(0,horizonY,W,H-horizonY);

    // Track segments
    this._drawTrackPerspective(ctx,W,H,proj,horizonY);

    // Start grid boxes
    this._drawStartGrid3D(ctx,proj,horizonY);

    // Boost pads & pickups (projected)
    this._drawObjectsPerspective(ctx,proj,horizonY);

    // Karts
    this._drawKartsPerspective(ctx,W,H,proj,horizonY,camX,camY,fp);

    // Cockpit frame for first-person
    if(fp) this._drawCockpit(ctx,W,H,player);
  }

  _drawSkyPerspective(ctx,W,H,horizonY,camX,camY){
    const track=this.currentTrack,n=this.dayTime;
    const skies={
      desert:['#e8c060','#d4902a'],
      forest:['#3a78c4','#6aaae0'],
      night: [`hsl(220,${Math.round(40-n*20)}%,${Math.round(30-n*22)}%)`,`hsl(230,${Math.round(50-n*30)}%,${Math.round(8-n*4)}%)`],
      ice:   ['#b0d4f4','#ddeeff']
    };
    const [s1,s2]=skies[track.theme]||['#3a78c4','#6aaae0'];
    const gd=ctx.createLinearGradient(0,0,0,horizonY);
    gd.addColorStop(0,s1);gd.addColorStop(1,s2);
    ctx.fillStyle=gd;ctx.fillRect(0,0,W,horizonY);

    if(track.theme==='night'&&n>0.2){
      // City skyline silhouette on horizon
      ctx.fillStyle=`rgba(5,6,18,0.92)`;
      let bx=0,seed=137;
      while(bx<W+100){seed=(seed*1664525+1013904223)&0xffffffff;const bw=20+(seed%45),bh=18+(seed%55);ctx.fillRect(bx,horizonY-bh,bw,bh);bx+=bw+3;}
      // Neon dots on buildings
      ctx.fillStyle=`rgba(255,80,200,${n*0.7})`;
      for(let x=40;x<W;x+=80){ctx.beginPath();ctx.arc(x,horizonY-20-(x*7%35),2,0,Math.PI*2);ctx.fill();}
    }
    if(track.theme==='ice'){
      // Mountain silhouettes
      ctx.fillStyle='rgba(180,210,240,0.6)';
      ctx.beginPath();ctx.moveTo(0,horizonY);
      for(let x=0;x<=W;x+=60){ctx.lineTo(x,horizonY-(20+Math.abs(Math.sin(x*0.03+camX*0.001))*55));}
      ctx.lineTo(W,horizonY);ctx.closePath();ctx.fill();
    }
  }

  _drawTrackPerspective(ctx,W,H,proj,horizonY){
    const track=this.currentTrack,sp=this.spline,n=sp.length;
    const hw=track.trackWidth/2,grassW=220,curbW=12;
    const near=nearestOnSpline(sp,this.player);
    const roadColor=track.trackColor;
    const grassColors={desert:['#a07828','#c49a40'],forest:['#1a4012','#235218'],night:['#080c14','#0c1020'],ice:['#90b4cc','#a8c8e0']};
    const [gc1,gc2]=grassColors[track.theme]||['#1a4012','#235218'];
    const curbA='#cc1111',curbB='#ffffff';
    const lineColor=track.theme==='night'?'#0088cc':track.theme==='ice'?'rgba(200,230,255,0.5)':'#ddbb00';

    for(let i=200;i>=0;i--){
      const idx=(near.idx+i)%n,nidx=(near.idx+i+1)%n;
      const pt=sp[idx],npt=sp[nidx];
      const tx=npt.x-pt.x,ty=npt.y-pt.y,tl=Math.sqrt(tx*tx+ty*ty)||1;
      const px=-ty/tl,py=tx/tl;

      const rl=proj(pt.x+px*hw,pt.y+py*hw),rr=proj(pt.x-px*hw,pt.y-py*hw);
      const nl=proj(npt.x+px*hw,npt.y+py*hw),nr=proj(npt.x-px*hw,npt.y-py*hw);
      if(!rl||!rr||!nl||!nr)continue;

      const cy=p=>Math.max(p.sy,horizonY);
      const cx=p=>clamp(p.sx,-300,W+300);

      // Grass
      const gc=Math.floor(i/5)%2?gc1:gc2;
      const gl=proj(pt.x+px*(hw+grassW),pt.y+py*(hw+grassW));
      const ngll=proj(npt.x+px*(hw+grassW),npt.y+py*(hw+grassW));
      const grr=proj(pt.x-px*(hw+grassW),pt.y-py*(hw+grassW));
      const ngrr=proj(npt.x-px*(hw+grassW),npt.y-py*(hw+grassW));
      ctx.fillStyle=gc;
      if(gl&&ngll){ctx.beginPath();ctx.moveTo(cx(gl),cy(gl));ctx.lineTo(cx(rl),cy(rl));ctx.lineTo(cx(nl),cy(nl));ctx.lineTo(cx(ngll),cy(ngll));ctx.closePath();ctx.fill();}
      if(grr&&ngrr){ctx.beginPath();ctx.moveTo(cx(rr),cy(rr));ctx.lineTo(cx(grr),cy(grr));ctx.lineTo(cx(ngrr),cy(ngrr));ctx.lineTo(cx(nr),cy(nr));ctx.closePath();ctx.fill();}

      // Curbs
      const curb=Math.floor(i/4)%2?curbA:curbB;
      const cl=proj(pt.x+px*(hw+curbW),pt.y+py*(hw+curbW));
      const ncl=proj(npt.x+px*(hw+curbW),npt.y+py*(hw+curbW));
      const cr=proj(pt.x-px*(hw+curbW),pt.y-py*(hw+curbW));
      const ncr=proj(npt.x-px*(hw+curbW),npt.y-py*(hw+curbW));
      ctx.fillStyle=curb;
      if(cl&&ncl){ctx.beginPath();ctx.moveTo(cx(cl),cy(cl));ctx.lineTo(cx(rl),cy(rl));ctx.lineTo(cx(nl),cy(nl));ctx.lineTo(cx(ncl),cy(ncl));ctx.closePath();ctx.fill();}
      if(cr&&ncr){ctx.beginPath();ctx.moveTo(cx(rr),cy(rr));ctx.lineTo(cx(cr),cy(cr));ctx.lineTo(cx(ncr),cy(ncr));ctx.lineTo(cx(nr),cy(nr));ctx.closePath();ctx.fill();}

      // Road surface
      ctx.fillStyle=roadColor;
      ctx.beginPath();ctx.moveTo(cx(rl),cy(rl));ctx.lineTo(cx(rr),cy(rr));ctx.lineTo(cx(nr),cy(nr));ctx.lineTo(cx(nl),cy(nl));ctx.closePath();ctx.fill();

      // Centre dashes
      if(i%10<5){
        const cl2=proj(pt.x,pt.y),nl2=proj(npt.x,npt.y);
        if(cl2&&nl2&&cl2.sy>horizonY){ctx.strokeStyle=lineColor;ctx.lineWidth=Math.max(1,cl2.scale*2);ctx.beginPath();ctx.moveTo(cl2.sx,Math.max(cl2.sy,horizonY));ctx.lineTo(nl2.sx,Math.max(nl2.sy,horizonY));ctx.stroke();}
      }
    }
  }

  _drawObjectsPerspective(ctx,proj,horizonY){
    // Boost pads
    this.boostPads.forEach(pad=>{
      const p=proj(pad.x,pad.y);if(!p||p.sy<horizonY)return;
      const sz=Math.max(4,22*p.scale);
      ctx.save();ctx.translate(p.sx,p.sy);
      ctx.fillStyle='rgba(255,200,0,0.85)';ctx.fillRect(-sz,-sz*0.4,sz*2,sz*0.8);
      ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(sz*0.7)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('▶▶',0,0);
      ctx.restore();
    });
    // Power-up pickups
    this.powerUpPickups.forEach(pu=>{
      if(!pu.available)return;
      const p=proj(pu.x,pu.y);if(!p||p.sy<horizonY)return;
      const sz=Math.max(3,18*p.scale);
      const c={boost:'#ff8800',shield:'#44aaff',oil:'#882299'}[pu.type]||'#fff';
      ctx.save();ctx.translate(p.sx,p.sy-sz);
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,sz,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(sz*0.9)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(pu.type==='boost'?'B':pu.type==='shield'?'S':'O',0,0);
      ctx.restore();
    });
    // Oil slicks
    this.oilSlicks.forEach(oil=>{
      const p=proj(oil.x,oil.y);if(!p||p.sy<horizonY)return;
      const sz=Math.max(4,oil.radius*p.scale);
      ctx.save();ctx.globalAlpha=Math.min(oil.life/3,1)*0.6;
      ctx.fillStyle='rgba(40,10,60,0.9)';ctx.beginPath();ctx.ellipse(p.sx,p.sy,sz,sz*0.35,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
  }

  _drawKartsPerspective(ctx,W,H,proj,horizonY,camX,camY,isFirstPerson){
    const entries=[];
    this.aiKarts.forEach(k=>entries.push({kart:k,isPlayer:false}));
    this.opponents.forEach((o,i)=>{if(o&&i!==this.mySlot)entries.push({kart:o,isPlayer:false});});
    if(!isFirstPerson&&this.player)entries.push({kart:this.player,isPlayer:true});
    // Sort far to near
    entries.sort((a,b)=>{
      const da=(a.kart.x-camX)**2+(a.kart.y-camY)**2;
      const db=(b.kart.x-camX)**2+(b.kart.y-camY)**2;
      return db-da;
    });
    entries.forEach(({kart,isPlayer})=>{
      const p=proj(kart.x,kart.y);
      if(!p||p.sy<horizonY-10)return;
      const w=Math.max(4,kart.width*p.scale*0.9);
      const h=Math.max(3,kart.height*p.scale*2.2);
      ctx.save();
      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(p.sx,p.sy,w*0.6,w*0.18,0,0,Math.PI*2);ctx.fill();
      // Body
      ctx.fillStyle=kart.bodyColor||'#555';ctx.fillRect(p.sx-w/2,p.sy-h,w,h*0.7);
      // Cockpit tint
      ctx.fillStyle=kart.color||'#888';ctx.fillRect(p.sx-w*0.35,p.sy-h,w*0.7,h*0.45);
      // Windshield
      ctx.fillStyle='rgba(180,220,255,0.5)';ctx.fillRect(p.sx-w*0.28,p.sy-h*0.95,w*0.56,h*0.28);
      // Front wheels
      ctx.fillStyle='#111';
      ctx.fillRect(p.sx-w*0.62,p.sy-h*0.2,w*0.24,h*0.22);
      ctx.fillRect(p.sx+w*0.38,p.sy-h*0.2,w*0.24,h*0.22);
      // Rear wheels
      ctx.fillRect(p.sx-w*0.62,p.sy-h*0.72,w*0.2,h*0.2);
      ctx.fillRect(p.sx+w*0.42,p.sy-h*0.72,w*0.2,h*0.2);
      // Spoiler line
      ctx.fillStyle=kart.color||'#888';ctx.fillRect(p.sx-w*0.5,p.sy-h*0.98,w,h*0.06);
      // Shield
      if(kart.shieldTimer>0){
        const pulse=0.7+0.3*Math.sin(Date.now()*0.01);
        ctx.strokeStyle=`rgba(68,170,255,${pulse})`;ctx.lineWidth=Math.max(1,p.scale*2);
        ctx.beginPath();ctx.arc(p.sx,p.sy-h*0.5,Math.max(w,h)*0.7,0,Math.PI*2);ctx.stroke();
      }
      // Boost flames
      if(kart.boostTimer>0){
        const fz=Math.max(2,h*0.3);
        ctx.fillStyle='rgba(255,150,0,0.85)';ctx.beginPath();ctx.arc(p.sx-w*0.2,p.sy-h*0.04,fz,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,220,0,0.7)';ctx.beginPath();ctx.arc(p.sx+w*0.2,p.sy-h*0.04,fz*0.7,0,Math.PI*2);ctx.fill();
      }
      // Player label in third-person
      if(isPlayer&&w>12){
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.font=`bold ${Math.round(Math.max(8,w*0.5))}px Arial`;
        ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('YOU',p.sx,p.sy-h-2);
      }
      ctx.restore();
    });
  }

  // ─── START GRID (2D) ─────────────────────────────────────
  _drawStartGrid(ctx){
    if(!this.currentTrack)return;
    const grid=this.currentTrack.grid;
    const colors=['#ffdd00','#ffffff','#ff4400','#44aaff'];
    grid.forEach((g,i)=>{
      ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.angle+Math.PI/2);
      const bw=14,bh=26;
      // Painted box fill
      ctx.fillStyle=colors[i]+'44';ctx.fillRect(-bw,-bh,bw*2,bh*2);
      // Box border
      ctx.strokeStyle=colors[i];ctx.lineWidth=2.5;ctx.strokeRect(-bw,-bh,bw*2,bh*2);
      // Cross lines
      ctx.strokeStyle=colors[i]+'88';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,-bh);ctx.lineTo(0,bh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-bw,0);ctx.lineTo(bw,0);ctx.stroke();
      // Position number
      ctx.fillStyle=colors[i];ctx.font='bold 11px Arial';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`P${i+1}`,0,0);
      ctx.restore();
    });
  }

  // ─── START GRID (3D) ─────────────────────────────────────
  _drawStartGrid3D(ctx,proj,horizonY){
    if(!this.currentTrack)return;
    const grid=this.currentTrack.grid;
    const colors=['#ffdd00','#ffffff','#ff4400','#44aaff'];
    grid.forEach((g,i)=>{
      const cos=Math.cos(g.angle+Math.PI/2),sin=Math.sin(g.angle+Math.PI/2);
      const bw=14,bh=26;
      const corners=[
        {wx:g.x+cos*bh-sin*bw,wy:g.y+sin*bh+cos*bw},
        {wx:g.x+cos*bh+sin*bw,wy:g.y+sin*bh-cos*bw},
        {wx:g.x-cos*bh+sin*bw,wy:g.y-sin*bh-cos*bw},
        {wx:g.x-cos*bh-sin*bw,wy:g.y-sin*bh+cos*bw},
      ];
      const pts=corners.map(c=>proj(c.wx,c.wy));
      if(!pts.every(Boolean))return;
      const clamped=pts.map(p=>({sx:p.sx,sy:Math.max(p.sy,horizonY)}));
      ctx.fillStyle=colors[i]+'55';
      ctx.beginPath();ctx.moveTo(clamped[0].sx,clamped[0].sy);
      clamped.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy));ctx.closePath();ctx.fill();
      ctx.strokeStyle=colors[i];ctx.lineWidth=Math.max(1,pts[0].scale*1.8);
      ctx.beginPath();ctx.moveTo(clamped[0].sx,clamped[0].sy);
      clamped.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy));ctx.closePath();ctx.stroke();
      // Position label
      const mid=pts.reduce((a,p)=>({sx:a.sx+p.sx/4,sy:a.sy+p.sy/4}),{sx:0,sy:0});
      if(mid.sy>horizonY){
        const fs=Math.max(8,pts[0].scale*14);
        ctx.fillStyle=colors[i];ctx.font=`bold ${Math.round(fs)}px Arial`;
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`P${i+1}`,mid.sx,mid.sy);
      }
    });
  }

  // ─── COCKPIT (1st person) ────────────────────────────────
  _drawCockpit(ctx,W,H,player){
    // Dashboard
    ctx.fillStyle='rgba(30,20,10,0.82)';
    ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W,H);
    ctx.lineTo(W,H*0.82);ctx.bezierCurveTo(W*0.7,H*0.78,W*0.3,H*0.78,0,H*0.82);
    ctx.closePath();ctx.fill();
    // Steering wheel
    const cx=W/2,cy=H*0.88,r=H*0.055;
    ctx.strokeStyle='#444';ctx.lineWidth=H*0.018;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#222';ctx.lineWidth=H*0.012;
    for(let a=0;a<Math.PI*2;a+=Math.PI*2/3){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a+player.angle*0.3)*r,cy+Math.sin(a+player.angle*0.3)*r);ctx.stroke();}
    // Speedometer
    const spd=Math.round(Math.abs(player.speed)*0.18);
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.arc(W*0.88,H*0.9,H*0.055,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0f0';ctx.font=`bold ${Math.round(H*0.026)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`${spd}`,W*0.88,H*0.88);
    ctx.fillStyle='#888';ctx.font=`${Math.round(H*0.016)}px Arial`;ctx.fillText('km/h',W*0.88,H*0.92);
    // Kart color strip
    ctx.fillStyle=player.color+'cc';ctx.fillRect(W*0.35,H*0.9,W*0.3,H*0.035);
  }

  // ─── PAUSE OVERLAY ───────────────────────────────────────
  _drawPauseOverlay(ctx,W,H){
    ctx.fillStyle='rgba(0,0,0,0.62)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`bold ${Math.round(W*0.09)}px "Segoe UI",Arial`;
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('PAUSED',W/2+3,H/2-24+3);
    ctx.fillStyle='#ffcc00';ctx.fillText('PAUSED',W/2,H/2-24);
    ctx.font=`${Math.round(W*0.026)}px "Segoe UI",Arial`;
    ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillText('P or ESC to resume · V to change view',W/2,H/2+28);
    ctx.restore();
  }

  // ─── GAME LOOP ───────────────────────────────────────────
  _loop(timestamp){
    const dt=Math.min((timestamp-(this.lastTime||timestamp))/1000,0.05);
    this.lastTime=timestamp;
    if(this.settings.ghost&&this.state==='racing'&&!this.paused)this.ghost.record(this.player,dt);
    this._update(dt);this._render();
    requestAnimationFrame(t=>this._loop(t));
  }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.addEventListener('load',()=>{window.game=new Game();});
