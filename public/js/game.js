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
    if(this._mobileCap&&this.particles.length>60)return;
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
    // Bahrain-inspired: long DRS straight, sweeping complex, technical chicane, tight hairpin
    id:0, name:'Bahrain Circuit', description:'Desert F1 circuit — DRS straight, sweepers & hairpin',
    theme:'desert', bgColor:'#b89040', trackColor:'#282422',
    laps:3, trackWidth:200, traction:1.0, hasWalls:false,
    boostPadTs:[0.08,0.45,0.75], powerUpTs:[0.18,0.36,0.56,0.76],
    waypoints:[
      {x:820,y:2500},  // 0: START/FINISH
      {x:1120,y:2500}, // main straight
      {x:1500,y:2500}, // mid straight
      {x:1900,y:2500}, // end of DRS straight
      {x:2200,y:2460}, // braking zone — TURN 1
      {x:2480,y:2280}, // sweeping right entry
      {x:2680,y:2020}, // fast right apex
      {x:2760,y:1700}, // sweeper exit
      {x:2720,y:1380}, // approaching complex
      {x:2560,y:1140}, // back section
      {x:2280,y:940},  // fast left
      {x:1960,y:800},  // back straight
      {x:1640,y:740},  // CHICANE entry
      {x:1400,y:860},  // chicane left
      {x:1220,y:740},  // chicane right
      {x:1020,y:860},  // chicane exit
      {x:820,y:980},   // approach
      {x:600,y:1040},  // TIGHT HAIRPIN entry
      {x:380,y:1160},  // braking zone
      {x:240,y:1360},  // hairpin apex
      {x:270,y:1620},  // hairpin exit
      {x:360,y:1940},  // long sweep back
      {x:420,y:2200},  // approaching main straight
      {x:500,y:2380},  // joining straight
      {x:620,y:2480},  // on straight
    ],
    grid:[{x:755,y:2462,angle:0},{x:695,y:2538,angle:0},{x:635,y:2462,angle:0},{x:575,y:2538,angle:0}]
  },
  {
    // Spa-inspired: Raidillon/Eau Rouge, long Kemmel straight, Pouhon sweeper, Bus Stop
    id:1, name:'Spa-Ardennes', description:'Classic F1 forest circuit — Raidillon, Kemmel & Bus Stop',
    theme:'forest', bgColor:'#1a4015', trackColor:'#1c1c1c',
    laps:3, trackWidth:190, traction:0.94, hasWalls:false,
    boostPadTs:[0.09,0.40,0.72], powerUpTs:[0.18,0.38,0.60,0.82],
    waypoints:[
      {x:760,y:2540},  // 0: START/FINISH
      {x:1060,y:2540}, // La Source approach
      {x:1380,y:2540}, // end of straight
      {x:1720,y:2480}, // LA SOURCE hairpin entry
      {x:1980,y:2280}, // hairpin
      {x:2080,y:2040}, // hairpin exit — EAU ROUGE valley
      {x:2060,y:1780}, // Raidillon climb
      {x:1920,y:1580}, // top of Raidillon
      {x:1680,y:1460}, // KEMMEL STRAIGHT entry
      {x:1380,y:1360}, // Kemmel straight
      {x:1080,y:1280}, // Les Combes entry
      {x:880,y:1120},  // Les Combes left
      {x:760,y:940},   // Les Combes right
      {x:640,y:800},   // POUHON — fast left sweep
      {x:480,y:960},   // Pouhon exit
      {x:360,y:1160},  // Stavelot
      {x:300,y:1400},  // Stavelot exit
      {x:340,y:1680},  // Blanchimont approach
      {x:420,y:1960},  // BUS STOP CHICANE entry
      {x:380,y:2180},  // Bus Stop left
      {x:460,y:2360},  // Bus Stop right
      {x:580,y:2480},  // Bus Stop exit / onto straight
    ],
    grid:[{x:700,y:2502,angle:0},{x:640,y:2578,angle:0},{x:580,y:2502,angle:0},{x:520,y:2578,angle:0}]
  },
  {
    // Monaco-inspired: tight street circuit, concrete walls, no room for error
    id:2, name:'Monaco Streets', description:'Street circuit — concrete walls, no run-off, no forgiveness',
    theme:'night', bgColor:'#04060f', trackColor:'#161618',
    laps:3, trackWidth:145, traction:1.0, hasWalls:true,
    boostPadTs:[0.08,0.38,0.68], powerUpTs:[0.16,0.36,0.58,0.80],
    waypoints:[
      {x:900,y:2660},  // 0: START/FINISH (pit straight)
      {x:1240,y:2660}, // straight
      {x:1640,y:2660}, // end of straight — STE DEVOTE braking
      {x:1960,y:2580}, // Ste Devote right
      {x:2200,y:2400}, // climbing Massenet
      {x:2460,y:2200}, // Casino Square approach
      {x:2640,y:1980}, // CASINO SQUARE right
      {x:2680,y:1720}, // Mirabeau approach
      {x:2580,y:1500}, // MIRABEAU hairpin — braking hard
      {x:2380,y:1340}, // Mirabeau exit
      {x:2160,y:1260}, // Portier
      {x:1920,y:1240}, // TUNNEL entry straight
      {x:1600,y:1220}, // tunnel
      {x:1280,y:1280}, // tunnel exit
      {x:1040,y:1160}, // NOUVELLE CHICANE left
      {x:880,y:1020},  // chicane right
      {x:720,y:860},   // chicane exit
      {x:500,y:760},   // TABAC left
      {x:340,y:920},   // Swimming Pool entry
      {x:280,y:1160},  // LA RASCASSE hairpin
      {x:320,y:1420},  // Rascasse exit
      {x:420,y:1700},  // Anthony Noghes
      {x:460,y:2000},  // onto pit straight approach
      {x:500,y:2280},  // pit straight lower
      {x:620,y:2500},  // pit straight
      {x:760,y:2640},  // approaching start
    ],
    grid:[{x:840,y:2622,angle:0},{x:780,y:2698,angle:0},{x:720,y:2622,angle:0},{x:660,y:2698,angle:0}]
  },
  {
    // Silverstone-inspired: fast flowing layout on ice — Copse, Maggotts, Becketts
    id:3, name:'Silverstone Ice', description:'Frozen F1 circuit — monster sweepers, brutal on ice',
    theme:'ice', bgColor:'#c8e0f0', trackColor:'#586070',
    laps:3, trackWidth:205, traction:0.35, hasWalls:false,
    boostPadTs:[0.10,0.40,0.70], powerUpTs:[0.18,0.40,0.62,0.84],
    waypoints:[
      {x:820,y:2760},  // 0: START/FINISH
      {x:1200,y:2760}, // Hangar straight
      {x:1680,y:2760}, // end of straight
      {x:2080,y:2700}, // COPSE — fast right (seems slow on ice!)
      {x:2440,y:2520}, // Maggotts entry
      {x:2720,y:2280}, // MAGGOTTS — fast left
      {x:2920,y:2020}, // Becketts right
      {x:3000,y:1720}, // Becketts left
      {x:2960,y:1420}, // CHAPEL — tight right
      {x:2800,y:1180}, // Hangar straight entry
      {x:2560,y:980},  // STOWE — hairpin on ice (treacherous)
      {x:2300,y:860},  // Stowe apex
      {x:2020,y:880},  // Vale entry
      {x:1760,y:960},  // VALE/CLUB complex
      {x:1520,y:860},  // Club corner
      {x:1280,y:960},  // ABBEY fast right
      {x:1060,y:860},  // Farm Curve
      {x:820,y:960},   // VILLAGE hairpin
      {x:620,y:1140},  // The Loop entry
      {x:540,y:1420},  // The Loop apex
      {x:580,y:1720},  // Luffield approach
      {x:560,y:2060},  // LUFFIELD — slow right
      {x:620,y:2360},  // Woodcote
      {x:680,y:2620},  // onto straight
    ],
    grid:[{x:755,y:2722,angle:0},{x:695,y:2798,angle:0},{x:635,y:2722,angle:0},{x:575,y:2798,angle:0}]
  }
];

// ═══════════════════════════════════════════════════════════
//  KART DATA
// ═══════════════════════════════════════════════════════════
const KARTS=[
  {id:0,name:'Red Lightning',description:'Blazing fast, hard to control',maxSpeed:255,acceleration:185,handling:1.3,braking:300,friction:80,color:'#ff3333',bodyColor:'#cc0000',accentColor:'#ffcc00',wheelColor:'#1a1a1a',width:36,height:20},
  {id:1,name:'Silver Arrow',description:'Balanced speed and control',maxSpeed:215,acceleration:155,handling:1.7,braking:265,friction:68,color:'#aaaaaa',bodyColor:'#1c1c1c',accentColor:'#00aaff',wheelColor:'#1a1a1a',width:34,height:19},
  {id:2,name:'Green Machine',description:'Slow but incredibly precise',maxSpeed:175,acceleration:120,handling:2.2,braking:340,friction:58,color:'#00dd44',bodyColor:'#006622',accentColor:'#ffee00',wheelColor:'#1a1a1a',width:32,height:18}
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
    this.steeringAngle=0; // visual steering wheel rotation: -1 full left, +1 full right
    // Drift / boost / powerup state
    this.isDrifting=false;this.driftCharge=0;this.boostTimer=0;this.shieldTimer=0;this.spinTimer=0;this.powerUp=null;
    this._itemPressed=false;
  }

  update(input,spline,trackWidth,dt,traction=1.0){
    const near=nearestOnSpline(spline,this);
    this.offTrack=near.d>trackWidth/2+10;
    // Off-track: speed tapers off smoothly, not a hard cap
    const offPenalty=this.offTrack?Math.max(0.42,1-(near.d-(trackWidth/2+10))*0.004):1.0;
    let cap=this.maxSpeed*offPenalty;
    if(this.boostTimer>0){this.boostTimer-=dt;cap=this.maxSpeed*1.28;}
    if(this.spinTimer>0){this.spinTimer-=dt;this.angle+=6*dt;this.speed=lerp(this.speed,0,4*dt);cap=this.maxSpeed*0.25;}

    if(input.up){this.speed=Math.min(this.speed+this.acceleration*dt,cap);}
    else if(input.down){if(this.speed>0)this.speed=Math.max(this.speed-this.braking*dt,0);else this.speed=Math.max(this.speed-this.acceleration*0.5*dt,-this.maxSpeed*0.32);}
    else{if(this.speed>0)this.speed=Math.max(this.speed-this.friction*dt,0);else if(this.speed<0)this.speed=Math.min(this.speed+this.friction*dt,0);}
    if(this.offTrack&&this.speed>cap)this.speed=lerp(this.speed,cap,Math.min(3.5*dt,1));

    // Non-linear steering: responsive mid-speed, reduces at very high speed
    const speedRatio=Math.abs(this.speed)/this.maxSpeed;
    const sf=clamp(speedRatio/0.22,0,1)*clamp(1.0-speedRatio*0.35,0.55,1.0);
    const dir=this.speed>=0?1:-1;
    if(input.left) this.angle-=this.handling*sf*dir*dt;
    if(input.right)this.angle+=this.handling*sf*dir*dt;

    // Drift — more slide, more Mario Kart feel
    const wantDrift=input.drift&&Math.abs(this.speed)>this.maxSpeed*0.25&&(input.left||input.right);
    const targetVX=Math.cos(this.angle)*this.speed;
    const targetVY=Math.sin(this.angle)*this.speed;
    // Lower blendRate = more slide. Traction (ice) multiplies the grip.
    const blendRate=wantDrift?1.6:11.0;
    this.vx=lerp(this.vx,targetVX,Math.min(blendRate*traction*dt,1));
    this.vy=lerp(this.vy,targetVY,Math.min(blendRate*traction*dt,1));

    if(wantDrift){
      this.driftCharge=Math.min(this.driftCharge+dt,2.8);
      this.isDrifting=true;
    } else {
      if(this.isDrifting&&this.driftCharge>0.35){
        // Reward good drifts — longer boost, speed kick
        const blen=Math.min(this.driftCharge*0.55,1.5);
        this.boostTimer=blen;
        this.speed=Math.min(this.speed*1.25,this.maxSpeed*1.2);
      }
      this.driftCharge=0;this.isDrifting=false;
    }

    // Activate item
    if(input.item&&!this._itemPressed&&this.powerUp){
      this._itemPressed=true;this._activatePowerUp();
    }
    if(!input.item)this._itemPressed=false;

    // Visual steering angle (for cockpit wheel animation)
    const steerTarget=(input.left?-1:0)+(input.right?1:0);
    this.steeringAngle=lerp(this.steeringAngle,steerTarget,Math.min(6*dt,1));

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
    this._spline=spline;
    this._aiInput={up:false,down:false,left:false,right:false,drift:false,item:false};
    this.aiVariance=1;this._cpPassed=[false,false];
    this._playerRef=null;this._rubberBand=1.0;this.finishTime=null;
    this._cornerData=null; // pre-computed curvature + racing line offsets
  }

  // Pre-compute curvature and racing line lateral offsets for each spline point.
  // Call once after the spline is built (done in Game._startRace via _buildAIData).
  _buildCornerData(){
    const sp=this._spline,n=sp.length;
    const curv=new Float32Array(n);
    // Curvature ≈ cross product of consecutive direction vectors (signed)
    for(let i=0;i<n;i++){
      const a=sp[(i-1+n)%n],b=sp[i],c=sp[(i+1)%n];
      const dx1=b.x-a.x,dy1=b.y-a.y;
      const dx2=c.x-b.x,dy2=c.y-b.y;
      const cross=dx1*dy2-dy1*dx2;
      const len=(Math.sqrt(dx1*dx1+dy1*dy1)+Math.sqrt(dx2*dx2+dy2*dy2)+0.001);
      curv[i]=cross/(len*len*0.5);
    }
    // Smooth curvature over ±8 samples
    const sc=new Float32Array(n);
    for(let i=0;i<n;i++){
      let s=0;for(let k=-8;k<=8;k++)s+=curv[(i+k+n)%n];sc[i]=s/17;
    }
    // Racing line offset: outside-in-out. Positive curv = right turn → go left entry, apex right, exit left.
    // We look 12 pts ahead to decide apex vs entry/exit zone.
    const off=new Float32Array(n);
    const TW=1.0; // normalised offset multiplier (scaled by trackWidth later)
    for(let i=0;i<n;i++){
      const c0=sc[i];
      const cAhead=sc[(i+12)%n];
      if(Math.abs(c0)<0.004){off[i]=0;continue;} // straight
      // Entry: opposite sign (outside) — apex: same sign (inside) — exit: outside again
      // Determine phase by comparing current curvature with forward-looking curvature
      const phase=Math.abs(cAhead)>Math.abs(c0)*0.7?1:-1; // 1=approaching apex, -1=exiting
      const sign=c0>0?1:-1; // positive curv = right turn
      off[i]=sign*phase*Math.min(Math.abs(c0)*45,0.42)*TW;
    }
    this._cornerData={curv:sc,off};
  }

  update(_,spline,trackWidth,dt,raceTime){
    const near=nearestOnSpline(this._spline,this);
    const n=this._spline.length;

    // Rubber-band
    if(this._playerRef){
      const pNear=nearestOnSpline(this._spline,this._playerRef);
      const aiProg=(this.lap-1)+near.idx/n;
      const pProg=(this._playerRef.lap-1)+pNear.idx/n;
      const gap=aiProg-pProg;
      if(gap>0.6)       this._rubberBand=Math.max(0.74,this._rubberBand-0.35*dt);
      else if(gap<-0.6) this._rubberBand=Math.min(1.24,this._rubberBand+0.35*dt);
      else              this._rubberBand=lerp(this._rubberBand,1.0,2*dt);
    }
    const origMax=this.maxSpeed;
    this.maxSpeed*=this._rubberBand;

    const cd=this._cornerData;
    const speedFrac=Math.abs(this.speed)/(this.maxSpeed||1);

    // ── RACING LINE TARGET ────────────────────────────────────
    // Look 18-40 pts ahead (speed-dependent) to find steering target
    const steerLook=Math.round((18+speedFrac*22)*this.aiVariance);
    const steerIdx=(near.idx+steerLook)%n;
    const steerPt=this._spline[steerIdx];

    // Apply lateral racing-line offset perpendicular to the spline direction
    let tgtX=steerPt.x,tgtY=steerPt.y;
    if(cd){
      const lateralOff=cd.off[steerIdx]*(trackWidth*0.36);
      const nxtPt=this._spline[(steerIdx+1)%n];
      const dx=nxtPt.x-steerPt.x,dy=nxtPt.y-steerPt.y;
      const len=Math.sqrt(dx*dx+dy*dy)+0.001;
      // perpendicular to forward direction: (-dy, dx)
      tgtX+=(-dy/len)*lateralOff;
      tgtY+=( dx/len)*lateralOff;
    }
    const diff=normalizeAngle(Math.atan2(tgtY-this.y,tgtX-this.x)-this.angle);

    // ── BRAKING ZONE ─────────────────────────────────────────
    // Peek 30-55 pts ahead for peak upcoming curvature to decide braking
    const brakeLook=Math.round(30+speedFrac*25);
    let peakCurv=0;
    if(cd){
      for(let k=8;k<=brakeLook;k++){
        const c=Math.abs(cd.curv[(near.idx+k)%n]);
        if(c>peakCurv)peakCurv=c;
      }
    } else {
      // fallback: look-ahead angle difference
      const far=this._spline[(near.idx+brakeLook)%n];
      peakCurv=Math.abs(normalizeAngle(Math.atan2(far.y-this.y,far.x-this.x)-this.angle))*0.025;
    }

    // Corner entry threshold — tuned per kart (higher handling = later braking)
    const brakeThr=0.014-this.handling*0.001;
    const mustBrake=peakCurv>brakeThr&&speedFrac>0.52;
    // Hard braking: curvature very sharp
    const hardBrake=peakCurv>brakeThr*1.7&&speedFrac>0.68;

    this._aiInput.up=!mustBrake;
    this._aiInput.down=hardBrake&&this.speed>this.maxSpeed*0.38;
    this._aiInput.left=diff<-0.045;
    this._aiInput.right=diff>0.045;
    // Drift on fast-tight corners
    this._aiInput.drift=peakCurv>brakeThr*1.2&&speedFrac>0.60&&Math.abs(diff)>0.28;

    // ── LAP TRACKING ─────────────────────────────────────────
    const cp1=this._spline[Math.floor(n*0.33)],cp2=this._spline[Math.floor(n*0.67)];
    if(!this._cpPassed[0]&&dist(this,cp1)<95)this._cpPassed[0]=true;
    if(!this._cpPassed[1]&&dist(this,cp2)<95)this._cpPassed[1]=true;
    if(this._cpPassed[0]&&this._cpPassed[1]&&near.idx<n*0.08&&near.idx!==0){
      this.lap++;this._cpPassed=[false,false];
    }
    super.update(this._aiInput,this._spline,trackWidth,dt,1.0);
    this.maxSpeed=origMax;

    if(!this.finishTime&&raceTime&&this.lap>this._totalLaps)this.finishTime=raceTime;
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
    // Trailer
    this.trailerTimer=0;this._trailerT=0;

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
    this.viewMode='top-down'; // 'top-down' | 'chase' | 'onboard'
    this.paused=false;

    // Camera shake
    this._cameraShake={x:0,y:0,timer:0,intensity:0};

    // Championship mode
    this.champMode=false;this.champRaceIdx=0;
    this.champPoints=[]; // [{label,pts,color}]

    this._isMobile=('ontouchstart' in window)||navigator.maxTouchPoints>0;

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
    const resize=()=>{
      const vp=window.visualViewport;
      this.canvas.width=Math.round(vp?vp.width:window.innerWidth);
      this.canvas.height=Math.round(vp?vp.height:window.innerHeight);
    };
    resize();
    window.addEventListener('resize',resize);
    if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
    window.addEventListener('orientationchange',()=>setTimeout(resize,150));
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
    $('soloModeCard').addEventListener('click',()=>{this.champMode=false;this.isMultiplayer=false;this._startRace();});
    $('multiModeCard').addEventListener('click',()=>this._setState('multi-lobby'));
    $('champModeCard')&&$('champModeCard').addEventListener('click',()=>this._startChampionship());
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
    $('playAgainBtn').onclick=()=>{
      if(this.champMode)this._champNextRace();
      else{this.isMultiplayer=false;this._startRace();}
    };
    $('mainMenuBtn').onclick=()=>{this.champMode=false;this._setState('menu');};

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

  _lockOrientation(){
    if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
  }
  _unlockOrientation(){
    if(screen.orientation&&screen.orientation.unlock)try{screen.orientation.unlock();}catch(e){}
  }

  _setState(state){
    this.state=state;
    if(state==='menu'||state==='settings'||state==='selecting-kart'||state==='selecting-track'||state==='mode-select')this._unlockOrientation();
    const map={'menu':'menuScreen','selecting-kart':'kartSelectScreen','selecting-track':'trackSelectScreen',
      'mode-select':'modeSelectScreen','multi-lobby':'multiLobbyScreen','results':'resultsScreen','settings':'settingsScreen'};
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if(map[state])document.getElementById(map[state]).classList.add('active');
    const racing=['racing','countdown','finished'].includes(state);
    document.getElementById('mobileControls').classList.toggle('racing',racing);
    const hb=document.getElementById('raceHUDButtons');
    if(hb)hb.classList.toggle('racing',['racing','countdown'].includes(state));
    // Trailer is fullscreen cinematic — hide all overlays
    if(state==='trailer'){document.getElementById('mobileControls').classList.remove('racing');if(hb)hb.classList.remove('racing');}
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
    this._lockOrientation();
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
      const types=['boost','shield','oil','banana','lightning'];
      return{x:pt.x,y:pt.y,type:types[i%types.length],available:true,respawnTimer:0,spinAngle:0};
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
        ai.aiVariance=0.82+Math.random()*0.22;ai._playerRef=this.player;ai._totalLaps=td.laps;
        ai._buildCornerData();
        this.aiKarts.push(ai);
      }
    }

    this.lap=1;this.raceTime=0;this.lapTimes=[];this.lastLapTime=0;this.bestLap=Infinity;
    this.countdownTimer=5.5;this._lapFlash=0;this._lapFlashMsg='';this._netTimer=0;
    this.camera={x:grid[myIdx].x,y:grid[myIdx].y};
    this.particles=new ParticleSystem();
    this.particles._mobileCap=this._isMobile;

    this.ghost.startRecording();
    this.trailerTimer=10;this._trailerT=0;
    this.viewMode='onboard';
    this._setState('trailer');
  }

  _activatePlayerItem(type){
    if(type==='boost'){this.player.boostTimer=3.0;this.audio.playBoost();}
    else if(type==='shield'){this.player.shieldTimer=8.0;}
    else if(type==='oil'||type==='banana'){
      const dx=Math.cos(this.player.angle),dy=Math.sin(this.player.angle);
      const isBanana=type==='banana';
      this.oilSlicks.push({x:this.player.x-dx*40,y:this.player.y-dy*40,radius:isBanana?22:35,life:isBanana?18:10,ownerKart:this.player,isBanana});
      this.audio.playPickup();
    }
    else if(type==='lightning'){
      this.aiKarts.forEach(k=>{k.spinTimer=Math.max(k.spinTimer,2.2);k.speed*=0.4;});
      this._showOverlay('LIGHTNING!','#ffff44');
      this._lapFlash=0.4;
      if(navigator.vibrate)navigator.vibrate([80,30,80,30,80]);
    }
  }

  // ─── GAME UPDATE ─────────────────────────────────────────
  _update(dt){
    if(this.state==='trailer'){
      this.trailerTimer-=dt;
      this._trailerT+=dt;
      if(this.trailerTimer<=0){
        this.state='countdown';
        // Show controls & HUD for countdown
        document.getElementById('mobileControls').classList.add('racing');
        const hb=document.getElementById('raceHUDButtons');
        if(hb)hb.classList.add('racing');
      }
      return;
    }
    if(this.state==='countdown'){
      this.countdownTimer-=dt;
      if(this.viewMode==='top-down'){this.camera.x=lerp(this.camera.x,this.player.x,0.08);this.camera.y=lerp(this.camera.y,this.player.y,0.08);}
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

    // AI karts (pass raceTime for finish tracking)
    this.aiKarts.forEach(ai=>ai.update(null,this.spline,this.currentTrack.trackWidth,dt,this.raceTime));

    // Camera shake decay
    if(this._cameraShake.timer>0){
      this._cameraShake.timer-=dt;
      const s=this._cameraShake.intensity*(this._cameraShake.timer/0.35);
      this._cameraShake.x=(Math.random()-0.5)*s;this._cameraShake.y=(Math.random()-0.5)*s;
    }else{this._cameraShake.x=0;this._cameraShake.y=0;}

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
    this._checkBarriers();
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
          if(kart===this.player){
            this.audio.playBoost();
            this._cameraShake.timer=0.18;this._cameraShake.intensity=5;
            if(navigator.vibrate)navigator.vibrate(25);
          }
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
          // AI auto-uses power-ups
          if(kart!==this.player&&kart.powerUp){
            if(kart.powerUp==='boost')kart.boostTimer=3.0;
            else if(kart.powerUp==='oil')this.oilSlicks.push({x:kart.x,y:kart.y,radius:35,life:8,ownerKart:kart,isBanana:false});
            else if(kart.powerUp==='banana')this.oilSlicks.push({x:kart.x,y:kart.y,radius:22,life:18,ownerKart:kart,isBanana:true});
            else if(kart.powerUp==='lightning'){
              [this.player,...this.aiKarts].forEach(t=>{if(t!==kart){t.spinTimer=Math.max(t.spinTimer,1.8);t.speed*=0.5;}});
            }
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
          // Sparks + haptics
          const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
          this.particles.emit(mx,my,'spark',10,{angle:Math.atan2(ny,nx)});
          this.audio.playCollision();
          if(a===this.player||b===this.player){
            this._cameraShake.timer=0.35;this._cameraShake.intensity=10;
            if(navigator.vibrate)navigator.vibrate(50);
          }
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
    if(navigator.vibrate)navigator.vibrate(isNewBest?[100,50,100]:[50]);
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
    const MEDALS=['🥇','🥈','🥉','4th'];
    const buildPanel=(pos,label,lapTimes,totalTime,color)=>{
      const div=document.createElement('div');div.className='results-panel'+(pos===0?' winner':'');
      const best=lapTimes.length?Math.min(...lapTimes):Infinity;
      const rows=lapTimes.map((t,i)=>`<tr class="${t===best&&lapTimes.length>1?'best-lap':''}"><td>Lap ${i+1}</td><td>${this._fmt(t)}</td></tr>`).join('');
      div.innerHTML=`<div class="results-name" style="color:${color||'#fff'}">${MEDALS[pos]||''} ${label}</div><table class="results-table"><thead><tr><th>Lap</th><th>Time</th></tr></thead><tbody>${rows||'<tr><td colspan="2">DNF</td></tr>'}</tbody></table><div class="total-time">Total: <span>${totalTime<9000?this._fmt(totalTime):'DNF'}</span></div>${best!==Infinity?`<div class="total-time" style="margin-top:4px">Best: <span>${this._fmt(best)}</span></div>`:''}`;
      return div;
    };

    const activeOpps=this.opponents.filter((o,i)=>o&&i!==this.mySlot);
    if(this.isMultiplayer&&activeOpps.length>0){
      const allMP=[{label:'YOU',lapTimes:this.lapTimes,total:this.raceTime,color:this.player.color}];
      activeOpps.forEach((o,i)=>{allMP.push({label:`P${i+2}`,lapTimes:o.lapTimes,total:o.lapTimes.reduce((a,b)=>a+b,0)||9999,color:o.color});});
      allMP.sort((a,b)=>a.total-b.total);
      allMP.forEach((r,i)=>panels.appendChild(buildPanel(i,r.label,r.lapTimes,r.total,r.color)));
    }else{
      // Solo: rank player vs AI by finish time
      const allSolo=[{label:'YOU',lapTimes:this.lapTimes,total:this.raceTime,color:this.player.color}];
      this.aiKarts.forEach((ai,i)=>{
        const ft=ai.finishTime||9999;
        allSolo.push({label:`CPU ${i+1}`,lapTimes:[],total:ft,color:ai.color});
      });
      allSolo.sort((a,b)=>a.total-b.total);
      allSolo.forEach((r,i)=>panels.appendChild(buildPanel(i,r.label,r.lapTimes,r.total,r.color)));

      // Championship points
      if(this.champMode){
        allSolo.forEach((r,i)=>{
          const pts=[10,7,5,3][i]||1;
          const entry=this.champPoints.find(e=>e.label===r.label);
          if(entry)entry.pts+=pts;
        });
        // Show running standings
        const sorted=[...this.champPoints].sort((a,b)=>b.pts-a.pts);
        const standDiv=document.createElement('div');standDiv.className='champ-standings';
        const isLast=this.champRaceIdx>=TRACKS.length-1;
        standDiv.innerHTML=`<div class="champ-title">${isLast?'🏆 CHAMPIONSHIP FINAL':'🏆 STANDINGS'}</div>`+
          sorted.map((e,i)=>`<div class="champ-row"><span>${MEDALS[i]||''} ${e.label}</span><span>${e.pts} pts</span></div>`).join('');
        panels.appendChild(standDiv);
        const btn=document.getElementById('playAgainBtn');
        if(btn)btn.textContent=isLast?'NEW CHAMPIONSHIP':'NEXT RACE ▶';
        document.getElementById('resultsTitle').textContent=isLast?'CHAMPIONSHIP OVER!':'RACE COMPLETE!';
      }
    }
    this._setState('results');
  }

  _startChampionship(){
    this.champMode=true;this.champRaceIdx=0;
    this.champPoints=[{label:'YOU',pts:0,color:KARTS[this.selectedKart].color}];
    for(let i=1;i<TRACKS[0].grid.length;i++){
      const kd=KARTS[(this.selectedKart+i)%KARTS.length];
      this.champPoints.push({label:`CPU ${i}`,pts:0,color:kd.color});
    }
    this.selectedTrack=0;this.isMultiplayer=false;this._startRace();
  }

  _champNextRace(){
    this.champRaceIdx++;
    if(this.champRaceIdx>=TRACKS.length){this.champMode=false;this._setState('menu');return;}
    this.selectedTrack=this.champRaceIdx;this._startRace();
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

    // Trailer cinematic
    if(this.state==='trailer'){this._drawTrailer(ctx,W,H);return;}

    // Portrait prompt on touch devices during race
    if(W<H&&('ontouchstart' in window)&&['racing','countdown','finished','trailer'].includes(this.state)){
      this._drawLandscapePrompt(ctx,W,H);return;
    }

    if(this.viewMode!=='top-down'&&this.player){
      this._renderPerspective(ctx,W,H);
    } else {
      ctx.save();
      const sx=Math.round(W/2-this.camera.x+this._cameraShake.x);
      const sy=Math.round(H/2-this.camera.y+this._cameraShake.y);
      ctx.translate(sx,sy);
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
      const colors={'boost':'#ff8800','shield':'#44aaff','oil':'#882299','banana':'#ddcc00','lightning':'#ffff22'};
      const c=colors[pu.type]||'#fff';
      const gd=ctx.createRadialGradient(0,0,0,0,0,sz);gd.addColorStop(0,'rgba(255,255,255,0.9)');gd.addColorStop(0.5,c);gd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gd;ctx.beginPath();
      for(let k=0;k<4;k++){const a=k*Math.PI/2,b=a+Math.PI/4;ctx.lineTo(Math.cos(a)*sz,Math.sin(a)*sz);ctx.lineTo(Math.cos(b)*sz*0.65,Math.sin(b)*sz*0.65);}
      ctx.closePath();ctx.fill();
      // Icon letter
      ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      const icons={'boost':'B','shield':'S','oil':'O','banana':'🍌','lightning':'⚡'};
      ctx.fillText(icons[pu.type]||'?',0,0);
      ctx.restore();
    });
  }

  _drawOilSlickSprites(ctx){
    this.oilSlicks.forEach(oil=>{
      const a=Math.min(oil.life/3,1)*0.55;
      ctx.save();ctx.globalAlpha=a;
      if(oil.isBanana){
        // Banana peel — yellow
        ctx.fillStyle='rgba(220,190,0,0.85)';ctx.beginPath();ctx.ellipse(oil.x,oil.y,oil.radius,oil.radius*0.5,0.3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,240,80,0.6)';ctx.font=`${Math.round(oil.radius*1.4)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍌',oil.x,oil.y);
      }else{
        const gd=ctx.createRadialGradient(oil.x,oil.y,0,oil.x,oil.y,oil.radius);
        gd.addColorStop(0,'rgba(60,20,80,0.9)');gd.addColorStop(0.6,'rgba(40,10,60,0.6)');gd.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=gd;ctx.beginPath();ctx.ellipse(oil.x,oil.y,oil.radius,oil.radius*0.6,0,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=a*0.4;const gd2=ctx.createLinearGradient(oil.x-oil.radius,oil.y,oil.x+oil.radius,oil.y);
        gd2.addColorStop(0,'rgba(255,0,0,0.5)');gd2.addColorStop(0.33,'rgba(0,255,0,0.5)');gd2.addColorStop(0.66,'rgba(0,0,255,0.5)');gd2.addColorStop(1,'rgba(255,0,255,0.5)');
        ctx.fillStyle=gd2;ctx.beginPath();ctx.ellipse(oil.x,oil.y,oil.radius,oil.radius*0.6,0,0,Math.PI*2);ctx.fill();
      }
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
    ctx.save();ctx.scale(scale,scale);
    const L=kart.width,W=kart.height; // L=length (x-axis=fwd), W=width (y-axis)
    const bc=kart.bodyColor||'#cc0000',ac=kart.accentColor||kart.color||'#ffcc00';

    // Drop shadow
    ctx.fillStyle='rgba(0,0,0,0.28)';ctx.beginPath();ctx.ellipse(2,3,L*.48,W*.38,0,0,Math.PI*2);ctx.fill();

    // Rear tyres (wide, behind the body)
    const rTW=W*0.28,rTH=W*0.52;
    ctx.fillStyle='#111';
    ctx.beginPath();ctx.roundRect(-L*0.44-rTW,-W*0.5-rTH*0.1,rTW,rTH,rTW*0.3);ctx.fill();
    ctx.beginPath();ctx.roundRect(-L*0.44-rTW, W*0.5-rTH*0.9,rTW,rTH,rTW*0.3);ctx.fill();
    // tyre rims
    ctx.fillStyle='#555';
    ctx.beginPath();ctx.ellipse(-L*0.44-rTW*0.5,-W*0.5+rTH*0.4,rTW*0.32,rTW*0.32,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(-L*0.44-rTW*0.5, W*0.5-rTH*0.4,rTW*0.32,rTW*0.32,0,0,Math.PI*2);ctx.fill();

    // Front tyres (narrower)
    const fTW=W*0.22,fTH=W*0.42;
    ctx.fillStyle='#111';
    ctx.beginPath();ctx.roundRect(L*0.32,-W*0.5-fTH*0.05,fTW,fTH,fTW*0.3);ctx.fill();
    ctx.beginPath();ctx.roundRect(L*0.32, W*0.5-fTH*0.95,fTW,fTH,fTW*0.3);ctx.fill();
    // tyre rims
    ctx.fillStyle='#555';
    ctx.beginPath();ctx.ellipse(L*0.32+fTW*0.5,-W*0.5+fTH*0.42,fTW*0.28,fTW*0.28,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(L*0.32+fTW*0.5, W*0.5-fTH*0.42,fTW*0.28,fTW*0.28,0,0,Math.PI*2);ctx.fill();

    // Rear wing (full width)
    const rwX=-L*0.48,rwW=L*0.12,rwH=W*1.3;
    ctx.fillStyle='#222';ctx.fillRect(rwX,-rwH/2,rwW,rwH);
    ctx.fillStyle=ac;ctx.fillRect(rwX,-rwH/2,rwW,rwH*0.18);
    ctx.fillStyle=ac;ctx.fillRect(rwX, rwH/2-rwH*0.18,rwW,rwH*0.18);
    // rear wing endplates
    ctx.fillStyle='#333';
    ctx.fillRect(rwX-2,-rwH/2,4,rwH*0.22);
    ctx.fillRect(rwX-2, rwH/2-rwH*0.22,4,rwH*0.22);

    // Narrow monocoque body — tapers to front
    ctx.fillStyle=bc;
    ctx.beginPath();
    ctx.moveTo(-L*0.46, W*0.28);  // rear left
    ctx.lineTo(-L*0.46,-W*0.28);  // rear right
    ctx.lineTo( L*0.18,-W*0.22);  // front right shoulder
    ctx.lineTo( L*0.46,-W*0.07);  // nose tip right
    ctx.lineTo( L*0.46, W*0.07);  // nose tip left
    ctx.lineTo( L*0.18, W*0.22);  // front left shoulder
    ctx.closePath();ctx.fill();

    // Sidepods (left & right)
    const spX=-L*0.24,spW=L*0.36,spH=W*0.18;
    ctx.fillStyle=bc;
    ctx.beginPath();ctx.roundRect(spX,-W*0.5,spW,spH,2);ctx.fill();
    ctx.beginPath();ctx.roundRect(spX, W*0.5-spH,spW,spH,2);ctx.fill();

    // Livery accent stripe along body
    ctx.fillStyle=ac;
    ctx.beginPath();
    ctx.moveTo(-L*0.4, W*0.10);
    ctx.lineTo(-L*0.4,-W*0.10);
    ctx.lineTo( L*0.38,-W*0.04);
    ctx.lineTo( L*0.38, W*0.04);
    ctx.closePath();ctx.fill();

    // Cockpit opening (dark tub)
    ctx.fillStyle='#0a0a0a';
    ctx.beginPath();ctx.ellipse(-L*0.08,0,L*0.14,W*0.17,0,0,Math.PI*2);ctx.fill();

    // Halo (titanium arc over cockpit)
    ctx.strokeStyle='#c8c0b0';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(-L*0.05,0,W*0.20,-Math.PI*0.72,Math.PI*0.72);ctx.stroke();
    // halo keel pillar
    ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-L*0.05,0);ctx.lineTo(L*0.04,0);ctx.stroke();

    // Front wing — flat thin plane at nose
    const fwX=L*0.44,fwW=L*0.08,fwH=W*0.92;
    ctx.fillStyle='#1a1a1a';ctx.fillRect(fwX,-fwH/2,fwW,fwH);
    ctx.fillStyle=ac;ctx.fillRect(fwX,-fwH/2,fwW,fwH*0.12);
    ctx.fillStyle=ac;ctx.fillRect(fwX, fwH/2-fwH*0.12,fwW,fwH*0.12);

    // Body highlight
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(-L*0.10,-W*0.14);ctx.lineTo(L*0.30,-W*0.05);
    ctx.lineTo(L*0.30, W*0.05);ctx.lineTo(-L*0.10, W*0.14);
    ctx.closePath();ctx.fill();

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
    const colors={boost:'#ff8800',shield:'#44aaff',oil:'#882299',banana:'#ddcc00',lightning:'#ffff22'};
    const hudIcons={boost:'B',shield:'S',oil:'O',banana:'🍌',lightning:'⚡'};
    const slot=pu?colors[pu]||'#aaa':'rgba(255,255,255,0.1)';
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W/2-28,74,56,38,8);else ctx.rect(W/2-28,74,56,38);ctx.fill();
    ctx.fillStyle=slot;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W/2-22,78,44,30,6);else ctx.rect(W/2-22,78,44,30);ctx.fill();
    if(pu){ctx.fillStyle='#fff';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(hudIcons[pu]||pu.slice(0,3),W/2,93);}
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
    this._drawF1Lights(ctx,W,H);
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
    const modes=['top-down','chase','onboard'];
    this.viewMode=modes[(modes.indexOf(this.viewMode)+1)%modes.length];
    const labels={'top-down':'TOP VIEW','chase':'CHASE CAM','onboard':'ONBOARD'};
    this._showOverlay(labels[this.viewMode]||'TOP VIEW','#ffcc00');
    const btn=document.getElementById('viewBtn');
    if(btn)btn.textContent={'top-down':'🗺','chase':'📷','onboard':'🎯'}[this.viewMode]||'🗺';
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
    // Ensure world objects are built for billboard rendering
    const theme=this.currentTrack.theme;
    if(theme==='forest'&&!this._trees)this._buildTrees();
    if(theme==='desert'&&!this._trees)this._buildTrees();
    if(theme==='night'&&!this._buildings)this._buildBuildings();
    if(theme==='ice'&&!this._rocks)this._buildRocks();

    const isOnboard=this.viewMode==='onboard';
    const isChase=this.viewMode==='chase';
    const angle=player.angle;
    const camBack=isOnboard?18:115;
    const camH=isOnboard?11:52;
    const focalLen=isOnboard?H*0.78:H*0.72;
    const horizonY=Math.round(isOnboard?H*0.44:H*0.42);
    const camX=player.x-Math.cos(angle)*camBack+this._cameraShake.x;
    const camY=player.y-Math.sin(angle)*camBack+this._cameraShake.y;
    const proj=this._mkProj(camX,camY,angle,camH,focalLen,W,H,horizonY);

    // Sky
    this._drawSkyPerspective(ctx,W,H,horizonY,camX,camY);

    // Ground base fill below horizon
    const groundColors={desert:'#9a7030',forest:'#192e14',night:'#05080f',ice:'#aac8e0'};
    ctx.fillStyle=groundColors[this.currentTrack.theme]||'#2d4a20';
    ctx.fillRect(0,horizonY,W,H-horizonY);

    // Track segments (road + barriers + fog)
    this._drawTrackPerspective(ctx,W,H,proj,horizonY);

    // Billboard trees / buildings
    this._drawBillboardsPerspective(ctx,proj,horizonY);

    // Start grid boxes
    this._drawStartGrid3D(ctx,proj,horizonY);

    // Boost pads & pickups (projected)
    this._drawObjectsPerspective(ctx,proj,horizonY);

    // Karts
    this._drawKartsPerspective(ctx,W,H,proj,horizonY,camX,camY,isOnboard);

    // Cockpit frame for onboard view
    if(isOnboard) this._drawCockpit(ctx,W,H,player);
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

    const segCount=this._isMobile?130:200;
    for(let i=segCount;i>=0;i--){
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

      // Road surface (base)
      ctx.fillStyle=roadColor;
      ctx.beginPath();ctx.moveTo(cx(rl),cy(rl));ctx.lineTo(cx(rr),cy(rr));ctx.lineTo(cx(nr),cy(nr));ctx.lineTo(cx(nl),cy(nl));ctx.closePath();ctx.fill();
      // Subtle rubber/dirt strip along racing line (centre tinted darker)
      if(rl.scale>0.12){
        const rc=proj(pt.x,pt.y),nrc=proj(npt.x,npt.y);
        const rw=Math.max(1.5,(hw*0.28)*rl.scale);
        if(rc&&nrc&&rc.sy>horizonY){
          ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=rw*2;
          ctx.beginPath();ctx.moveTo(rc.sx,Math.max(rc.sy,horizonY));ctx.lineTo(nrc.sx,Math.max(nrc.sy,horizonY));ctx.stroke();
        }
      }

      // Centre dashes
      if(i%10<5){
        const cl2=proj(pt.x,pt.y),nl2=proj(npt.x,npt.y);
        if(cl2&&nl2&&cl2.sy>horizonY){ctx.strokeStyle=lineColor;ctx.lineWidth=Math.max(1,cl2.scale*2.5);ctx.beginPath();ctx.moveTo(cl2.sx,Math.max(cl2.sy,horizonY));ctx.lineTo(nl2.sx,Math.max(nl2.sy,horizonY));ctx.stroke();}
      }
      // White edge lines
      if(rl.scale>0.08){
        ctx.strokeStyle='rgba(255,255,255,0.7)';ctx.lineWidth=Math.max(1,rl.scale*1.8);
        ctx.beginPath();ctx.moveTo(cx(rl),cy(rl));ctx.lineTo(cx(nl),cy(nl));ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx(rr),cy(rr));ctx.lineTo(cx(nr),cy(nr));ctx.stroke();
      }

      // Barriers — concrete walls for hasWalls tracks, armco for others
      if(rl&&nl&&cl&&ncl&&rr&&nr&&cr&&ncr){
        if(track.hasWalls){
          // Concrete TecPro wall — grey solid right at track edge, taller
          const BH=36;
          const panel=Math.floor(i/6)%2;
          const wallC=panel?'#888898':'#9898a8';
          ctx.fillStyle='rgba(0,0,0,0.5)';
          ctx.beginPath();ctx.moveTo(cx(cl),cy(cl));ctx.lineTo(cx(ncl),cy(ncl));ctx.lineTo(cx(ncl),Math.max(cy(ncl)-6,horizonY));ctx.lineTo(cx(cl),Math.max(cy(cl)-6,horizonY));ctx.closePath();ctx.fill();
          ctx.beginPath();ctx.moveTo(cx(cr),cy(cr));ctx.lineTo(cx(ncr),cy(ncr));ctx.lineTo(cx(ncr),Math.max(cy(ncr)-6,horizonY));ctx.lineTo(cx(cr),Math.max(cy(cr)-6,horizonY));ctx.closePath();ctx.fill();
          ctx.fillStyle=wallC;
          ctx.beginPath();ctx.moveTo(cx(cl),cy(cl));ctx.lineTo(cx(ncl),cy(ncl));ctx.lineTo(cx(ncl),Math.max(cy(ncl)-BH*ncl.scale,horizonY));ctx.lineTo(cx(cl),Math.max(cy(cl)-BH*cl.scale,horizonY));ctx.closePath();ctx.fill();
          ctx.beginPath();ctx.moveTo(cx(cr),cy(cr));ctx.lineTo(cx(ncr),cy(ncr));ctx.lineTo(cx(ncr),Math.max(cy(ncr)-BH*ncr.scale,horizonY));ctx.lineTo(cx(cr),Math.max(cy(cr)-BH*cr.scale,horizonY));ctx.closePath();ctx.fill();
          // Top edge highlight
          ctx.strokeStyle='rgba(220,220,240,0.7)';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(cx(cl),Math.max(cy(cl)-BH*cl.scale,horizonY));ctx.lineTo(cx(ncl),Math.max(cy(ncl)-BH*ncl.scale,horizonY));ctx.stroke();
          ctx.beginPath();ctx.moveTo(cx(cr),Math.max(cy(cr)-BH*cr.scale,horizonY));ctx.lineTo(cx(ncr),Math.max(cy(ncr)-BH*ncr.scale,horizonY));ctx.stroke();
        } else {
          // Armco barriers — classic red/white F1 style, set behind grass
          const BH=22;
          const panel=Math.floor(i/8)%2;
          const barA=track.theme==='ice'?'#b8cce0':'#cc1111';
          const col=panel?barA:'#f0f0f0';
          const gl2=proj(pt.x+px*(hw+grassW-20),pt.y+py*(hw+grassW-20));
          const ngl2=proj(npt.x+px*(hw+grassW-20),npt.y+py*(hw+grassW-20));
          const grr2=proj(pt.x-px*(hw+grassW-20),pt.y-py*(hw+grassW-20));
          const ngrr2=proj(npt.x-px*(hw+grassW-20),npt.y-py*(hw+grassW-20));
          if(gl2&&ngl2&&grr2&&ngrr2){
            ctx.fillStyle='rgba(0,0,0,0.35)';
            ctx.beginPath();ctx.moveTo(cx(gl2),cy(gl2));ctx.lineTo(cx(ngl2),cy(ngl2));ctx.lineTo(cx(ngl2),Math.max(cy(ngl2)-4,horizonY));ctx.lineTo(cx(gl2),Math.max(cy(gl2)-4,horizonY));ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(cx(grr2),cy(grr2));ctx.lineTo(cx(ngrr2),cy(ngrr2));ctx.lineTo(cx(ngrr2),Math.max(cy(ngrr2)-4,horizonY));ctx.lineTo(cx(grr2),Math.max(cy(grr2)-4,horizonY));ctx.closePath();ctx.fill();
            ctx.fillStyle=col;
            ctx.beginPath();ctx.moveTo(cx(gl2),cy(gl2));ctx.lineTo(cx(ngl2),cy(ngl2));ctx.lineTo(cx(ngl2),Math.max(cy(ngl2)-BH*ngl2.scale,horizonY));ctx.lineTo(cx(gl2),Math.max(cy(gl2)-BH*gl2.scale,horizonY));ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(cx(grr2),cy(grr2));ctx.lineTo(cx(ngrr2),cy(ngrr2));ctx.lineTo(cx(ngrr2),Math.max(cy(ngrr2)-BH*ngrr2.scale,horizonY));ctx.lineTo(cx(grr2),Math.max(cy(grr2)-BH*grr2.scale,horizonY));ctx.closePath();ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(cx(gl2),Math.max(cy(gl2)-BH*gl2.scale,horizonY));ctx.lineTo(cx(ngl2),Math.max(cy(ngl2)-BH*ngl2.scale,horizonY));ctx.stroke();
            ctx.beginPath();ctx.moveTo(cx(grr2),Math.max(cy(grr2)-BH*grr2.scale,horizonY));ctx.lineTo(cx(ngrr2),Math.max(cy(ngrr2)-BH*ngrr2.scale,horizonY));ctx.stroke();
          }
        }
      }
    }

    // Horizon fog
    const fogRgb={desert:'200,155,70',forest:'18,45,15',night:'5,8,18',ice:'160,195,218'}[track.theme]||'30,30,30';
    const fogGrad=ctx.createLinearGradient(0,horizonY,0,horizonY+(H-horizonY)*0.38);
    fogGrad.addColorStop(0,`rgba(${fogRgb},0.82)`);
    fogGrad.addColorStop(1,`rgba(${fogRgb},0)`);
    ctx.fillStyle=fogGrad;ctx.fillRect(0,horizonY,W,(H-horizonY)*0.38);
  }

  _drawObjectsPerspective(ctx,proj,horizonY){
    // Boost pads — bright arrow panels on the road
    this.boostPads.forEach(pad=>{
      const p=proj(pad.x,pad.y);if(!p||p.sy<horizonY)return;
      const sz=Math.max(4,24*p.scale);
      const pulse=0.7+0.3*Math.sin(Date.now()*0.005+pad.x);
      ctx.save();ctx.translate(p.sx,p.sy);
      ctx.globalAlpha=pulse;
      ctx.fillStyle='#ff9900';ctx.fillRect(-sz,-sz*0.45,sz*2,sz*0.9);
      ctx.fillStyle='#ffee00';ctx.fillRect(-sz*0.85,-sz*0.28,sz*1.7,sz*0.56);
      ctx.globalAlpha=1;ctx.fillStyle='#fff';
      ctx.font=`bold ${Math.round(sz*0.75)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('▶▶',0,0);
      ctx.restore();
    });
    // Power-up pickups — spinning item boxes (Mario Kart style)
    const now=Date.now();
    this.powerUpPickups.forEach(pu=>{
      if(!pu.available)return;
      const p=proj(pu.x,pu.y);if(!p||p.sy<horizonY)return;
      const sz=Math.max(5,22*p.scale);
      const spin=(now*0.002+pu.x*0.01)%(Math.PI*2);
      const squish=0.85+0.15*Math.cos(spin*2);
      ctx.save();ctx.translate(p.sx,p.sy-sz*1.1);ctx.scale(squish,1);
      // Glow
      ctx.shadowColor='rgba(255,220,0,0.8)';ctx.shadowBlur=Math.max(3,sz*0.8);
      // Box body
      ctx.fillStyle='#e8c800';ctx.fillRect(-sz,-sz,sz*2,sz*2);
      ctx.fillStyle='#fff';ctx.fillRect(-sz*0.85,-sz*0.85,sz*1.7,sz*1.7);
      ctx.fillStyle='#e8c800';ctx.fillRect(-sz*0.65,-sz*0.65,sz*1.3,sz*1.3);
      // Question mark
      ctx.shadowBlur=0;ctx.fillStyle='#fff';
      ctx.font=`bold ${Math.round(sz*1.1)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',0,0);
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
    entries.sort((a,b)=>{
      const da=(a.kart.x-camX)**2+(a.kart.y-camY)**2;
      const db=(b.kart.x-camX)**2+(b.kart.y-camY)**2;
      return db-da;
    });
    entries.forEach(({kart,isPlayer})=>{
      const p=proj(kart.x,kart.y);
      if(!p||p.sy<horizonY-10)return;
      const sc=p.scale;
      // Car width / height in screen pixels (rear view proportions)
      const cW=Math.max(5,kart.height*sc*3.2); // screen width = kart body width
      const cH=Math.max(3,cW*0.48);            // screen height = body height
      const cx=p.sx, cy=p.sy;
      const bc=kart.bodyColor||'#cc0000';
      const ac=kart.accentColor||kart.color||'#ffcc00';
      ctx.save();

      // Shadow on ground
      ctx.fillStyle='rgba(0,0,0,0.32)';ctx.beginPath();
      ctx.ellipse(cx,cy,cW*0.62,cW*0.1,0,0,Math.PI*2);ctx.fill();

      // Rear wing (two elements) — topmost
      const rwW=cW*1.18, rwH=cH*0.22, rwY=cy-cH*1.65;
      // Main wing element
      ctx.fillStyle='#1a1a1a';
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cx-rwW/2,rwY,rwW,rwH,2);else ctx.rect(cx-rwW/2,rwY,rwW,rwH);ctx.fill();
      // Upper DRS flap (accent color)
      ctx.fillStyle=ac;
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cx-rwW/2*0.9,rwY-rwH*0.7,rwW*0.9,rwH*0.55,2);else ctx.rect(cx-rwW/2*0.9,rwY-rwH*0.7,rwW*0.9,rwH*0.55);ctx.fill();
      // Wing endplates
      ctx.fillStyle='#252525';
      ctx.fillRect(cx-rwW/2-cW*0.04, rwY-rwH*0.7, cW*0.05, rwH*1.8);
      ctx.fillRect(cx+rwW/2-cW*0.01, rwY-rwH*0.7, cW*0.05, rwH*1.8);

      // Rear tyres — massive, exposed
      const tyW=cW*0.22, tyH=cH*1.05;
      // Left tyre
      ctx.fillStyle='#111';
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cx-cW*0.58,cy-tyH*0.92,tyW,tyH,tyW*0.22);else ctx.rect(cx-cW*0.58,cy-tyH*0.92,tyW,tyH);ctx.fill();
      // Right tyre
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cx+cW*0.36,cy-tyH*0.92,tyW,tyH,tyW*0.22);else ctx.rect(cx+cW*0.36,cy-tyH*0.92,tyW,tyH);ctx.fill();
      // Rim detail (left)
      const rimR=tyW*0.38;
      ctx.fillStyle='#666';ctx.beginPath();ctx.arc(cx-cW*0.58+tyW*0.5,cy-tyH*0.42,rimR,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#999';ctx.beginPath();ctx.arc(cx-cW*0.58+tyW*0.5,cy-tyH*0.42,rimR*0.5,0,Math.PI*2);ctx.fill();
      // Rim detail (right)
      ctx.fillStyle='#666';ctx.beginPath();ctx.arc(cx+cW*0.36+tyW*0.5,cy-tyH*0.42,rimR,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#999';ctx.beginPath();ctx.arc(cx+cW*0.36+tyW*0.5,cy-tyH*0.42,rimR*0.5,0,Math.PI*2);ctx.fill();

      // Engine cover / chassis body
      ctx.fillStyle=bc;
      const bodyX=cx-cW*0.32, bodyW=cW*0.64, bodyY=cy-cH*1.5, bodyH=cH*1.1;
      ctx.beginPath();
      ctx.moveTo(bodyX,        cy);
      ctx.lineTo(bodyX,        bodyY+bodyH*0.25);
      ctx.lineTo(bodyX+bodyW*0.08, bodyY);
      ctx.lineTo(bodyX+bodyW*0.92, bodyY);
      ctx.lineTo(bodyX+bodyW,  bodyY+bodyH*0.25);
      ctx.lineTo(bodyX+bodyW,  cy);
      ctx.closePath();ctx.fill();

      // Livery accent stripe
      ctx.fillStyle=ac;
      ctx.fillRect(cx-cW*0.28, bodyY, cW*0.56, cH*0.13);

      // Cockpit opening (dark)
      ctx.fillStyle='#050505';
      ctx.beginPath();ctx.ellipse(cx,bodyY+bodyH*0.38,cW*0.16,cH*0.25,0,0,Math.PI*2);ctx.fill();

      // Halo arch
      ctx.strokeStyle='#c0b898';ctx.lineWidth=Math.max(1.5,sc*1.8);
      ctx.beginPath();ctx.arc(cx,bodyY+bodyH*0.38,cW*0.22,Math.PI*1.05,Math.PI*1.95,false);ctx.stroke();
      // Keel pillar
      ctx.lineWidth=Math.max(1,sc*1.3);
      ctx.beginPath();ctx.moveTo(cx,bodyY+bodyH*0.38);ctx.lineTo(cx,bodyY+bodyH*0.12);ctx.stroke();

      // Body highlight
      ctx.fillStyle='rgba(255,255,255,0.11)';
      ctx.beginPath();ctx.ellipse(cx-cW*0.06,bodyY+bodyH*0.2,cW*0.18,cH*0.14,0,0,Math.PI*2);ctx.fill();

      // Shield
      if(kart.shieldTimer>0){
        const pulse=0.7+0.3*Math.sin(Date.now()*0.01);
        ctx.strokeStyle=`rgba(68,170,255,${pulse})`;ctx.lineWidth=Math.max(1.5,sc*2.5);
        ctx.beginPath();ctx.arc(cx,cy-cH*0.7,Math.max(cW,cH)*0.75,0,Math.PI*2);ctx.stroke();
      }

      // Boost flames from exhaust pipes (both sides of engine cover)
      if(kart.boostTimer>0){
        const fz=Math.max(2,cH*0.38);
        ctx.fillStyle='rgba(255,120,0,0.9)';ctx.beginPath();ctx.arc(cx-cW*0.18,cy+fz*0.4,fz,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,220,0,0.8)';ctx.beginPath();ctx.arc(cx+cW*0.18,cy+fz*0.4,fz*0.75,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,240,180,0.6)';ctx.beginPath();ctx.arc(cx,cy+fz*0.5,fz*0.45,0,Math.PI*2);ctx.fill();
      }

      // Player label
      if(isPlayer&&cW>14){
        ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(cx-18,cy-cH*2-14,36,14);
        ctx.fillStyle='#ffcc00';ctx.font=`bold ${Math.round(Math.max(8,cW*0.28))}px Arial`;
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('YOU',cx,cy-cH*2-7);
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

  // ─── COCKPIT (onboard) ────────────────────────────────────
  _drawCockpit(ctx,W,H,player){
    const sw=player.steeringAngle||0; // -1 to +1

    // ── Halo structure ──
    ctx.save();
    const haloCX=W/2, haloY=H*0.46;
    // Outer arch
    ctx.strokeStyle='#5a5a5a';ctx.lineWidth=W*0.018;ctx.lineCap='round';
    ctx.beginPath();
    ctx.arc(haloCX,haloY+H*0.04,W*0.155,Math.PI*1.08,Math.PI*1.92,false);
    ctx.stroke();
    // Center keel pillar
    ctx.lineWidth=W*0.016;ctx.strokeStyle='#484848';
    ctx.beginPath();ctx.moveTo(haloCX-W*0.008,haloY+H*0.055);ctx.lineTo(haloCX,haloY-H*0.008);ctx.lineTo(haloCX+W*0.008,haloY+H*0.055);ctx.stroke();
    // Halo highlight
    ctx.strokeStyle='rgba(200,200,200,0.15)';ctx.lineWidth=W*0.005;
    ctx.beginPath();ctx.arc(haloCX,haloY+H*0.04,W*0.152,Math.PI*1.1,Math.PI*1.9,false);ctx.stroke();
    ctx.restore();

    // ── Cockpit side walls ──
    ctx.save();
    ctx.fillStyle='rgba(10,8,6,0.97)';
    // Left wall
    ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H*0.46);ctx.lineTo(W*0.08,H*0.42);ctx.lineTo(W*0.22,H*0.5);ctx.lineTo(W*0.3,H*0.56);ctx.lineTo(W*0.3,H);ctx.closePath();ctx.fill();
    // Right wall
    ctx.beginPath();ctx.moveTo(W,H);ctx.lineTo(W,H*0.46);ctx.lineTo(W*0.92,H*0.42);ctx.lineTo(W*0.78,H*0.5);ctx.lineTo(W*0.7,H*0.56);ctx.lineTo(W*0.7,H);ctx.closePath();ctx.fill();
    // Side-pod accent stripes (kart colour)
    ctx.fillStyle=player.color+'99';
    ctx.beginPath();ctx.moveTo(0,H*0.58);ctx.lineTo(W*0.24,H*0.54);ctx.lineTo(W*0.26,H*0.59);ctx.lineTo(0,H*0.63);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(W,H*0.58);ctx.lineTo(W*0.76,H*0.54);ctx.lineTo(W*0.74,H*0.59);ctx.lineTo(W,H*0.63);ctx.closePath();ctx.fill();
    ctx.restore();

    // ── Dashboard ──
    ctx.save();
    const dashGrad=ctx.createLinearGradient(0,H*0.72,0,H);
    dashGrad.addColorStop(0,'rgba(14,10,7,0.98)');dashGrad.addColorStop(1,'rgba(8,6,4,1)');
    ctx.fillStyle=dashGrad;
    ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W,H);ctx.lineTo(W,H*0.8);
    ctx.bezierCurveTo(W*0.76,H*0.74,W*0.6,H*0.72,W/2,H*0.72);
    ctx.bezierCurveTo(W*0.4,H*0.72,W*0.24,H*0.74,0,H*0.8);
    ctx.closePath();ctx.fill();
    // Carbon fibre weave hint
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(0,H*0.8+i*H*0.03);ctx.lineTo(W,H*0.8+i*H*0.03);ctx.stroke();}
    ctx.restore();

    // ── Steering wheel ──
    const swX=W/2, swY=H*0.875;
    const swR=Math.min(W*0.09,H*0.1);
    const wheelRot=sw*Math.PI*0.45; // max 81° rotation each way

    ctx.save();
    ctx.translate(swX,swY);
    ctx.rotate(wheelRot);

    // Outer rim
    ctx.lineWidth=swR*0.23;ctx.strokeStyle='#141414';
    ctx.beginPath();ctx.arc(0,0,swR,0,Math.PI*2);ctx.stroke();

    // Team colour accent bands (top & bottom of rim)
    ctx.lineWidth=swR*0.1;
    ctx.strokeStyle=player.color||'#ff3333';
    ctx.beginPath();ctx.arc(0,0,swR,-Math.PI*0.38,Math.PI*0.38);ctx.stroke(); // top
    ctx.beginPath();ctx.arc(0,0,swR,Math.PI*0.62,Math.PI*1.38);ctx.stroke(); // bottom flat section

    // Spokes (Y-shape: top + two lower)
    ctx.lineCap='round';ctx.lineWidth=swR*0.13;ctx.strokeStyle='#252525';
    ctx.beginPath();ctx.moveTo(0,swR*0.1);ctx.lineTo(0,-swR*0.82);ctx.stroke();        // top
    ctx.beginPath();ctx.moveTo(0,swR*0.1);ctx.lineTo(-swR*0.76,swR*0.64);ctx.stroke(); // bottom-left
    ctx.beginPath();ctx.moveTo(0,swR*0.1);ctx.lineTo(swR*0.76,swR*0.64);ctx.stroke();  // bottom-right

    // Center hub
    ctx.fillStyle='#1e1e1e';ctx.beginPath();ctx.ellipse(0,0,swR*0.3,swR*0.24,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=player.bodyColor||'#aa0000';ctx.beginPath();ctx.ellipse(0,0,swR*0.18,swR*0.14,0,0,Math.PI*2);ctx.fill();

    // Button clusters (F1-style)
    const btn=(bx,by,bw,bh,col)=>{
      ctx.fillStyle=col;ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(bx,by,bw,bh,2);else ctx.rect(bx,by,bw,bh);
      ctx.fill();
    };
    const bw=swR*0.15,bh=swR*0.1;
    // Left cluster
    btn(-swR*0.5,-swR*0.58,bw,bh,'#cc2222');
    btn(-swR*0.3,-swR*0.58,bw,bh,'#2255cc');
    // Right cluster
    btn(swR*0.15,-swR*0.58,bw,bh,'#228844');
    btn(swR*0.35,-swR*0.58,bw,bh,'#cc8800');
    // Rotary dial (left spoke)
    ctx.fillStyle='#333';ctx.beginPath();ctx.arc(-swR*0.55,swR*0.38,swR*0.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#555';ctx.beginPath();ctx.arc(-swR*0.55,swR*0.38,swR*0.06,0,Math.PI*2);ctx.fill();

    ctx.restore(); // end wheel transform

    // ── Digital display (speed) ──
    ctx.save();
    const dX=W*0.82,dY=H*0.83;
    const spd=Math.round(Math.abs(player.speed)*0.18);
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(dX-W*0.07,dY-H*0.038,W*0.13,H*0.076,H*0.012);else ctx.rect(dX-W*0.07,dY-H*0.038,W*0.13,H*0.076);ctx.fill();
    ctx.fillStyle='#00ff88';ctx.font=`bold ${Math.round(H*0.038)}px monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(spd,dX,dY-H*0.006);
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font=`${Math.round(H*0.014)}px Arial`;ctx.fillText('km/h',dX,dY+H*0.026);
    ctx.restore();

    // ── Gear indicator (centre of dash) ──
    const gear=Math.max(1,Math.min(8,Math.ceil((Math.abs(player.speed)/(player.maxSpeed||1))*8)));
    ctx.save();
    ctx.fillStyle='rgba(255,220,50,0.9)';ctx.font=`bold ${Math.round(H*0.048)}px monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(gear,W*0.5,H*0.77);
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font=`${Math.round(H*0.014)}px Arial`;ctx.fillText('GEAR',W*0.5,H*0.81);
    ctx.restore();

    // ── Boost flash ──
    if(player.boostTimer>0){
      ctx.save();ctx.globalAlpha=0.85;
      ctx.fillStyle='#ff6600';ctx.font=`bold ${Math.round(H*0.028)}px Arial`;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOOST',W*0.18,H*0.84);
      ctx.restore();
    }
  }

  // ─── BARRIER PHYSICS (hasWalls tracks) ───────────────────
  _checkBarriers(){
    if(!this.currentTrack||!this.currentTrack.hasWalls)return;
    const hw=this.currentTrack.trackWidth/2-6;
    const allKarts=[this.player,...this.aiKarts];
    allKarts.forEach(kart=>{
      const near=nearestOnSpline(this.spline,kart);
      if(near.d<hw)return;
      const sp=this.spline[near.idx];
      const dx=kart.x-sp.x,dy=kart.y-sp.y;
      const d=Math.sqrt(dx*dx+dy*dy)||1;
      const nx=dx/d,ny=dy/d;
      const overlap=near.d-hw;
      // Push back inside
      kart.x-=nx*overlap*1.5;
      kart.y-=ny*overlap*1.5;
      // Reflect velocity component into the wall
      const dot=kart.vx*nx+kart.vy*ny;
      if(dot>5){
        kart.vx-=dot*nx*1.55;
        kart.vy-=dot*ny*1.55;
        kart.speed*=0.48;
        if(kart===this.player){
          this._cameraShake.timer=0.42;this._cameraShake.intensity=20;
          this.particles.emit(kart.x,kart.y,'spark',16,{angle:Math.atan2(-ny,-nx)});
          this.audio.playCollision();
          if(navigator.vibrate)navigator.vibrate([70,20,70]);
        }
      }
    });
  }

  // ─── TRACK TRAILER (aerial fly-over) ─────────────────────
  _drawTrailer(ctx,W,H){
    if(!this.spline||!this.currentTrack)return;
    const sp=this.spline;
    const track=this.currentTrack;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    sp.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
    const pad=200,trkW=maxX-minX+pad*2,trkH=maxY-minY+pad*2;
    const fullScale=Math.min(W/(trkW),H/(trkH))*0.92;

    const elapsed=10-this.trailerTimer; // 0→10
    const zoomT=Math.min(1,Math.max(0,(elapsed-6)/3.5)); // 0 for first 6s, then zooms 6→9.5s
    const scale=lerp(fullScale,fullScale*2.8,zoomT*zoomT);

    // Camera pans along spline
    const panFrac=Math.min(1,(elapsed/9)*0.75);
    const panIdx=Math.floor(panFrac*sp.length)%sp.length;
    const focusPt=sp[panIdx];
    const trackMidX=(minX+maxX)/2,trackMidY=(minY+maxY)/2;
    const camX=lerp(trackMidX,focusPt.x,Math.min(1,zoomT+0.3));
    const camY=lerp(trackMidY,focusPt.y,Math.min(1,zoomT+0.3));

    // Draw world
    ctx.save();
    ctx.translate(W/2,H/2);ctx.scale(scale,scale);ctx.translate(-camX,-camY);
    ctx.fillStyle=track.bgColor;ctx.fillRect(minX-pad*2,minY-pad*2,trkW+pad*4,trkH+pad*4);
    if(track.theme==='forest'){if(!this._trees)this._buildTrees();this._trees.forEach(t=>{ctx.fillStyle=t.dark?'#173a12':'#1e5218';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();});}
    if(track.theme==='ice'){ctx.fillStyle='rgba(255,255,255,0.4)';for(let x=minX;x<maxX;x+=100)for(let y=minY;y<maxY;y+=100){ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();}}
    // Draw track (wide top-down view)
    const hw=track.trackWidth/2;
    ctx.lineJoin='round';ctx.lineCap='round';
    ctx.beginPath();sp.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.closePath();
    ctx.strokeStyle='#444';ctx.lineWidth=hw*2+24;ctx.stroke();
    ctx.strokeStyle='#e8e0d4';ctx.lineWidth=hw*2+16;ctx.stroke();
    ctx.strokeStyle=track.trackColor;ctx.lineWidth=hw*2;ctx.stroke();
    // Centre line
    ctx.save();ctx.setLineDash([30,30]);ctx.beginPath();sp.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.closePath();
    ctx.strokeStyle=track.theme==='night'?'#0088cc':'#ddbb00';ctx.lineWidth=4;ctx.stroke();ctx.restore();
    // Start/finish line
    const s0=sp[0],s1=sp[1];const sa=Math.atan2(s1.y-s0.y,s1.x-s0.x);
    ctx.save();ctx.translate(s0.x,s0.y);ctx.rotate(sa+Math.PI/2);
    for(let i=-5;i<=5;i++)for(let r=-1;r<=1;r++){ctx.fillStyle=(i+r)%2===0?'#fff':'#111';ctx.fillRect(i*12-6,r*12-6,12,12);}
    ctx.restore();
    // Grid positions
    track.grid.forEach((g,i)=>{const cols=['#ffdd00','#fff','#ff4400','#44aaff'];ctx.fillStyle=cols[i];ctx.beginPath();ctx.arc(g.x,g.y,18,0,Math.PI*2);ctx.fill();});
    ctx.restore(); // end world transform

    // Cinematic black bars
    const barH=H*0.09;
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,barH);ctx.fillRect(0,H-barH,W,barH);

    // Circuit name overlay
    const nameFade=Math.min(1,elapsed/1.2)*Math.max(0,1-(elapsed-6.5)/2);
    if(nameFade>0.01){
      ctx.save();ctx.globalAlpha=nameFade;
      ctx.textAlign='left';ctx.textBaseline='middle';
      // Left accent stripe
      ctx.fillStyle=track.theme==='night'?'#0088cc':track.theme==='ice'?'#88ccff':'#cc2200';
      ctx.fillRect(W*0.06,barH+H*0.05,W*0.004,H*0.09);
      ctx.fillStyle='#fff';ctx.font=`900 ${Math.round(H*0.072)}px "Segoe UI",Arial`;
      ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=16;
      ctx.fillText(track.name.toUpperCase(),W*0.075,barH+H*0.09);
      ctx.font=`${Math.round(H*0.026)}px "Segoe UI",Arial`;
      ctx.fillStyle='rgba(255,220,60,0.95)';ctx.fillText(track.description,W*0.076,barH+H*0.144);
      ctx.font=`bold ${Math.round(H*0.022)}px "Segoe UI",Arial`;
      ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillText(`${track.laps} LAPS  ·  ${track.traction<0.5?'ICE CONDITIONS':track.hasWalls?'STREET CIRCUIT':'OPEN CIRCUIT'}`,W*0.076,barH+H*0.185);
      ctx.restore();
    }

    // Countdown badge (last 3s)
    if(elapsed>7.5){
      const cFade=Math.min(1,(elapsed-7.5)/0.8);
      ctx.save();ctx.globalAlpha=cFade;
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W*0.38,H*0.36,W*0.24,H*0.12,H*0.02);else ctx.rect(W*0.38,H*0.36,W*0.24,H*0.12);ctx.fill();
      ctx.fillStyle='#ffcc00';ctx.font=`bold ${Math.round(H*0.04)}px "Segoe UI",Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('GET READY!',W/2,H*0.42);
      ctx.restore();
    }

    // Fade-in at start / fade-out at end
    const fadeIn=Math.max(0,1-elapsed/0.8);
    const fadeOut=Math.max(0,1-this.trailerTimer/1.2);
    const fadeA=Math.max(fadeIn,fadeOut);
    if(fadeA>0.01){ctx.fillStyle=`rgba(0,0,0,${fadeA})`;ctx.fillRect(0,0,W,H);}
  }

  // ─── F1 LIGHTS COUNTDOWN ─────────────────────────────────
  _drawF1Lights(ctx,W,H){
    const t=this.countdownTimer; // 5.5 → 0
    const numLights=5;
    const lightR=Math.min(W*0.038,H*0.055);
    const spacing=lightR*2.9;
    const startX=W/2-(numLights-1)/2*spacing;
    const ly=H*0.33;

    // Gantry background
    const gW=spacing*(numLights-1)+lightR*4.2,gH=lightR*3.2;
    ctx.fillStyle='rgba(0,0,0,0.78)';
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(startX-lightR*2.1,ly-lightR*1.8,gW,gH,lightR*0.4);else ctx.rect(startX-lightR*2.1,ly-lightR*1.8,gW,gH);ctx.fill();
    // Gantry top bar
    ctx.fillStyle='#222';ctx.fillRect(startX-lightR*2.5,ly-lightR*2.4,gW+lightR,lightR*0.5);

    // Lights on = how many are red
    const lightsOn=t>0.45?clamp(Math.ceil(5.5-t),0,5):0;
    const showGo=t<=0.45;

    for(let i=0;i<numLights;i++){
      const lx=startX+i*spacing;
      const on=i<lightsOn;
      // Housing
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(lx,ly,lightR*1.05,0,Math.PI*2);ctx.fill();
      // Light body
      ctx.fillStyle=on?'#cc0000':'#1a0404';ctx.beginPath();ctx.arc(lx,ly,lightR*0.88,0,Math.PI*2);ctx.fill();
      if(on){
        // Glow
        const gd=ctx.createRadialGradient(lx,ly,0,lx,ly,lightR*2.2);
        gd.addColorStop(0,'rgba(255,60,60,0.7)');gd.addColorStop(0.4,'rgba(200,0,0,0.35)');gd.addColorStop(1,'rgba(150,0,0,0)');
        ctx.fillStyle=gd;ctx.beginPath();ctx.arc(lx,ly,lightR*2.2,0,Math.PI*2);ctx.fill();
        // Specular
        ctx.fillStyle='rgba(255,180,180,0.3)';ctx.beginPath();ctx.ellipse(lx-lightR*0.25,ly-lightR*0.3,lightR*0.35,lightR*0.2,-0.5,0,Math.PI*2);ctx.fill();
      }
    }

    if(showGo){
      const goA=Math.min(1,(0.45-t)/0.2);
      ctx.save();ctx.globalAlpha=goA;
      const fs=Math.round(H*0.13);
      ctx.font=`900 ${fs}px "Segoe UI",Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('GO!',W/2+4,H*0.37+4);
      ctx.fillStyle='#44ff88';ctx.shadowColor='#00ff00';ctx.shadowBlur=40;
      ctx.fillText('GO!',W/2,H*0.37);
      ctx.restore();
    }

    // Pole position label
    const pFade=Math.min(1,(5.5-t)/1.5);
    if(pFade>0.05&&t>0.45){
      ctx.save();ctx.globalAlpha=pFade*0.8;
      ctx.fillStyle='rgba(255,220,50,0.9)';ctx.font=`bold ${Math.round(H*0.022)}px "Segoe UI",Arial`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('LIGHTS OUT  ·  RACE GO',W/2,H*0.42);
      ctx.restore();
    }
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

  // ─── BILLBOARD SPRITES (3D) ──────────────────────────────
  _drawBillboardsPerspective(ctx,proj,horizonY){
    const theme=this.currentTrack.theme;
    let items=[];
    if(theme==='forest'&&this._trees)items=this._trees.map(t=>({...t,type:'tree'}));
    else if(theme==='desert'&&this._trees)items=this._trees.map(t=>({...t,type:'cactus'}));
    else if(theme==='night'&&this._buildings)items=this._buildings.map(b=>({x:b.x+b.w/2,y:b.y+b.h/2,r:Math.max(b.w,b.h)*0.6,type:'building',b}));
    else if(theme==='ice'&&this._rocks)items=this._rocks.map(r=>({...r,type:'rock'}));
    const projected=[];
    items.forEach(obj=>{const p=proj(obj.x,obj.y);if(p&&p.sy>horizonY-20&&p.scale>0.015)projected.push({obj,p});});
    projected.sort((a,b)=>b.p.fwd-a.p.fwd);
    projected.forEach(({obj,p})=>{
      const sz=obj.r*p.scale;if(sz<1.5)return;
      ctx.save();
      if(obj.type==='tree'){
        const th=sz*0.65,cr=sz*0.8;
        ctx.fillStyle='#4a2a08';ctx.fillRect(p.sx-sz*0.1,p.sy-th,sz*0.2,th);
        ctx.fillStyle=obj.dark?'#1a4a12':'#255e1a';ctx.beginPath();ctx.arc(p.sx,p.sy-th-cr*0.5,cr,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=obj.dark?'#1f5a14':'#2e7020';ctx.beginPath();ctx.arc(p.sx-cr*0.18,p.sy-th-cr*0.72,cr*0.65,0,Math.PI*2);ctx.fill();
      }else if(obj.type==='cactus'){
        ctx.fillStyle='#3a6a20';
        ctx.fillRect(p.sx-sz*0.12,p.sy-sz*1.3,sz*0.24,sz*1.3);
        ctx.fillRect(p.sx-sz*0.45,p.sy-sz*0.85,sz*0.36,sz*0.14);
        ctx.fillRect(p.sx+sz*0.09,p.sy-sz*0.65,sz*0.36,sz*0.14);
      }else if(obj.type==='building'){
        const b=obj.b;const bh=Math.min(b.h*p.scale*2.2,p.sy-horizonY+10);const bw=b.w*p.scale*1.3;
        ctx.fillStyle=b.color;ctx.fillRect(p.sx-bw/2,p.sy-bh,bw,bh);
        if(this.dayTime>0.2&&bh>12){
          ctx.fillStyle=`rgba(255,220,80,${(this.dayTime-0.2)*0.65*b.litFrac})`;
          const wc=Math.max(1,Math.floor(bw/10)),wr=Math.max(1,Math.floor(bh/10));
          const cw=bw/wc,rh=bh/wr;
          for(let r=0;r<wr;r++)for(let c=0;c<wc;c++)
            if(Math.random()>0.45)ctx.fillRect(p.sx-bw/2+c*cw+1,p.sy-bh+r*rh+1,cw-2,rh-2);
        }
      }else if(obj.type==='rock'){
        ctx.fillStyle='rgba(138,158,178,0.88)';ctx.beginPath();ctx.ellipse(p.sx,p.sy,sz*0.9,sz*0.55,obj.a,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(190,210,230,0.5)';ctx.beginPath();ctx.ellipse(p.sx-sz*0.14,p.sy-sz*0.12,sz*0.55,sz*0.35,obj.a,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });
  }

  // ─── LANDSCAPE PROMPT ────────────────────────────────────
  _drawLandscapePrompt(ctx,W,H){
    ctx.fillStyle='rgba(0,0,0,0.92)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(W/2,H*0.36);
    ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=3;
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-14,-22,28,44,4);else ctx.rect(-14,-22,28,44);ctx.stroke();
    ctx.beginPath();ctx.arc(0,17,3,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`${Math.round(H*0.1)}px Arial`;ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillText('↻',W/2,H*0.56);
    ctx.font=`bold ${Math.round(H*0.06)}px "Segoe UI",Arial`;ctx.fillStyle='#ffcc00';ctx.fillText('ROTATE PHONE',W/2,H*0.7);
    ctx.font=`${Math.round(H*0.038)}px "Segoe UI",Arial`;ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillText('Game plays best in landscape',W/2,H*0.8);
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
