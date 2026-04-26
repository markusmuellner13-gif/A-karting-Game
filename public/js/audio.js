'use strict';
class AudioEngine {
  constructor() {
    this.ctx=null; this.masterGain=null; this.musicGain=null; this.sfxGain=null;
    this.engineOsc=null; this.engineGain=null;
    this._driftOsc=null; this._driftGain=null; this._musicTimeout=null;
    this._started=false;
    this.vol={master:0.7,music:0.4,sfx:0.8};
  }

  start() {
    if(this._started)return; this._started=true;
    try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
    const ctx=this.ctx;
    this.masterGain=ctx.createGain(); this.masterGain.gain.value=this.vol.master; this.masterGain.connect(ctx.destination);
    this.musicGain=ctx.createGain();  this.musicGain.gain.value=this.vol.music;   this.musicGain.connect(this.masterGain);
    this.sfxGain=ctx.createGain();    this.sfxGain.gain.value=this.vol.sfx;       this.sfxGain.connect(this.masterGain);
    this._initEngine();
    this._scheduleMusic(ctx.currentTime+0.2);
  }

  setMaster(v){this.vol.master=v;if(this.masterGain)this.masterGain.gain.value=v;}
  setMusic(v) {this.vol.music =v;if(this.musicGain) this.musicGain.gain.value=v; }
  setSfx(v)   {this.vol.sfx   =v;if(this.sfxGain)   this.sfxGain.gain.value=v;  }

  _initEngine(){
    const ctx=this.ctx;
    const osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.value=55;
    const dist=ctx.createWaveShaper();
    const curve=new Float32Array(256);
    for(let i=0;i<256;i++){const x=(i*2)/255-1;curve[i]=(Math.PI+200)*x/(Math.PI+200*Math.abs(x));}
    dist.curve=curve;
    const filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=700;
    const g=ctx.createGain(); g.gain.value=0;
    osc.connect(dist); dist.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    osc.start();
    this.engineOsc=osc; this.engineGain=g;
  }

  updateEngine(speed,maxSpeed,drifting){
    if(!this.ctx||!this.engineOsc)return;
    const t=this.ctx.currentTime,r=Math.abs(speed)/maxSpeed;
    this.engineOsc.frequency.setTargetAtTime(55+r*280+(drifting?40:0),t,0.04);
    this.engineGain.gain.setTargetAtTime(speed>1?0.05+r*0.17:0.03,t,0.06);
  }

  stopEngine(){if(this.engineGain)this.engineGain.gain.setTargetAtTime(0,this.ctx.currentTime,0.2);}

  _scheduleMusic(start){
    if(!this.ctx)return;
    const bpm=138,b=60/bpm;
    const mel=[[392,1],[440,1],[494,1],[523,2],[494,1],[440,1],[392,1],[349,1],[330,2],[349,1],[392,2],
               [440,1],[494,1],[523,1],[587,2],[523,1],[494,1],[440,2],[392,1],[349,1],[330,4]];
    const bass=[[196,2],[220,2],[247,4],[196,2],[165,2],[196,4]];
    let t=start; const totalB=mel.reduce((a,[,d])=>a+d,0);
    mel.forEach(([f,d])=>{
      const osc=this.ctx.createOscillator(),g=this.ctx.createGain();
      osc.type='square'; osc.frequency.value=f;
      g.gain.setValueAtTime(0.06,t); g.gain.setValueAtTime(0,t+d*b-0.01);
      osc.connect(g); g.connect(this.musicGain); osc.start(t); osc.stop(t+d*b); t+=d*b;
    });
    let tb=start; const bLen=bass.reduce((a,[,d])=>a+d,0);
    const loops=Math.ceil(totalB/bLen);
    for(let l=0;l<loops;l++) bass.forEach(([f,d])=>{
      const osc=this.ctx.createOscillator(),g=this.ctx.createGain();
      osc.type='triangle'; osc.frequency.value=f;
      g.gain.setValueAtTime(0.08,tb); g.gain.setValueAtTime(0,tb+d*b-0.01);
      osc.connect(g); g.connect(this.musicGain); osc.start(tb); osc.stop(tb+d*b); tb+=d*b;
    });
    this._musicTimeout=setTimeout(
      ()=>this._scheduleMusic(start+totalB*b),
      (start+totalB*b-this.ctx.currentTime-0.5)*1000
    );
  }

  stopMusic(){if(this._musicTimeout){clearTimeout(this._musicTimeout);this._musicTimeout=null;}}

  playCollision(){
    if(!this.ctx)return;
    const sr=this.ctx.sampleRate,buf=this.ctx.createBuffer(1,Math.floor(sr*0.18),sr);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5)*0.9;
    const src=this.ctx.createBufferSource(),g=this.ctx.createGain();
    src.buffer=buf; g.gain.value=0.55; src.connect(g); g.connect(this.sfxGain); src.start();
  }

  playPickup(){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    [523,659,784,1047].forEach((f,i)=>{
      const osc=this.ctx.createOscillator(),g=this.ctx.createGain();
      osc.type='sine'; osc.frequency.value=f;
      const s=t+i*0.06;
      g.gain.setValueAtTime(0.22,s); g.gain.exponentialRampToValueAtTime(0.001,s+0.15);
      osc.connect(g); g.connect(this.sfxGain); osc.start(s); osc.stop(s+0.15);
    });
  }

  playBoost(){
    if(!this.ctx)return;
    const t=this.ctx.currentTime,osc=this.ctx.createOscillator(),g=this.ctx.createGain();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(120,t); osc.frequency.exponentialRampToValueAtTime(550,t+0.35);
    g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.42);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t+0.42);
  }

  setDriftScreech(on){
    if(!this.ctx)return;
    if(on&&!this._driftOsc){
      const ctx=this.ctx,osc=ctx.createOscillator(),g=ctx.createGain();
      const filt=ctx.createBiquadFilter(); filt.type='bandpass'; filt.frequency.value=900; filt.Q.value=4;
      osc.type='sawtooth'; osc.frequency.value=220; g.gain.value=0;
      osc.connect(filt); filt.connect(g); g.connect(this.sfxGain); osc.start();
      g.gain.setTargetAtTime(0.09,ctx.currentTime,0.1);
      this._driftOsc=osc; this._driftGain=g;
    } else if(!on&&this._driftOsc){
      this._driftGain.gain.setTargetAtTime(0,this.ctx.currentTime,0.08);
      const osc=this._driftOsc; setTimeout(()=>{try{osc.stop();}catch(e){}},400);
      this._driftOsc=null; this._driftGain=null;
    }
  }

  playLapComplete(){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    [392,523,659,784].forEach((f,i)=>{
      const osc=this.ctx.createOscillator(),g=this.ctx.createGain();
      osc.type='square'; osc.frequency.value=f;
      const s=t+i*0.1;
      g.gain.setValueAtTime(0.15,s); g.gain.exponentialRampToValueAtTime(0.001,s+0.25);
      osc.connect(g); g.connect(this.sfxGain); osc.start(s); osc.stop(s+0.25);
    });
  }
}
