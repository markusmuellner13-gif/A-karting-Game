'use strict';
class AudioEngine {
  constructor() {
    this.ctx=null; this.masterGain=null; this.musicGain=null; this.sfxGain=null;
    this.engineOsc=null; this._engineOsc2=null; this._engineOsc3=null;
    this.engineGain=null; this._engineOsc2Gain=null; this._engineOsc3Gain=null;
    this._driftOsc=null; this._driftGain=null; this._musicTimeout=null;
    this._started=false;
    this.vol={master:0.7,music:0.4,sfx:0.8};
    this._kartChar=1.0; // pitch character multiplier per kart type
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

  // Call before race to set engine pitch character per kart (0=low, 1=mid, 2=high)
  setKartType(id){
    this._kartChar=[1.0,0.88,0.76][id]||1.0;
  }

  _initEngine(){
    const ctx=this.ctx;
    // Primary oscillator: fundamental sawtooth — main engine note
    const osc1=ctx.createOscillator(); osc1.type='sawtooth'; osc1.frequency.value=90;
    // Second oscillator: 3rd harmonic for F1 roughness
    const osc2=ctx.createOscillator(); osc2.type='sawtooth'; osc2.frequency.value=270;
    // Third oscillator: high harmonic buzz that rises with RPM
    const osc3=ctx.createOscillator(); osc3.type='square'; osc3.frequency.value=720;

    // Distortion waveshaper — soft-clip for engine roughness
    const dist=ctx.createWaveShaper();
    const N=512; const curve=new Float32Array(N);
    for(let i=0;i<N;i++){const x=(i*2)/N-1;curve[i]=Math.sign(x)*(1-Math.exp(-Math.abs(x)*4.5))*0.85;}
    dist.curve=curve;

    // Band-pass filter — shapes the engine "voice"
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=680; bp.Q.value=0.9;

    // Gain for each oscillator
    const g1=ctx.createGain(); g1.gain.value=0.55;
    const g2=ctx.createGain(); g2.gain.value=0.28;
    const g3=ctx.createGain(); g3.gain.value=0.0; // grows with RPM

    // Master engine gain (starts at 0, controlled by updateEngine)
    const masterG=ctx.createGain(); masterG.gain.value=0;

    // Mix node
    const mix=ctx.createGain(); mix.gain.value=1;

    osc1.connect(g1); g1.connect(dist);
    osc2.connect(g2); g2.connect(dist);
    dist.connect(bp); bp.connect(mix);
    osc3.connect(g3); g3.connect(mix);
    mix.connect(masterG); masterG.connect(this.sfxGain);

    osc1.start(); osc2.start(); osc3.start();
    this.engineOsc=osc1; this._engineOsc2=osc2; this._engineOsc3=osc3;
    this._engineOsc2Gain=g2; this._engineOsc3Gain=g3; this.engineGain=masterG;
  }

  updateEngine(speed,maxSpeed,drifting){
    if(!this.ctx||!this.engineOsc)return;
    const t=this.ctx.currentTime;
    const r=Math.min(1,Math.abs(speed)/(maxSpeed||1));
    // F1: ~5000 RPM idle → ~18000 RPM max = 83Hz → 300Hz fundamental
    // _kartChar: Red Lightning = 1.0 (high-pitched), Silver Arrow = 0.88, Green Machine = 0.76 (rougher)
    const baseIdle=83*this._kartChar, baseMax=300*this._kartChar;
    const freq=baseIdle+r*(baseMax-baseIdle)+(drifting?35:0);
    const ramp=0.025; // fast response for precise engine feel
    this.engineOsc.frequency.setTargetAtTime(freq, t, ramp);
    if(this._engineOsc2)this._engineOsc2.frequency.setTargetAtTime(freq*3, t, ramp);
    if(this._engineOsc3)this._engineOsc3.frequency.setTargetAtTime(freq*6.5, t, ramp);
    // High-freq buzz increases with RPM (characteristic F1 scream)
    if(this._engineOsc3Gain)this._engineOsc3Gain.gain.setTargetAtTime(r*r*0.09, t, 0.04);
    // 2nd harmonic slightly louder at high RPM
    if(this._engineOsc2Gain)this._engineOsc2Gain.gain.setTargetAtTime(0.18+r*0.16, t, 0.04);
    // Master volume: quiet at idle, louder under acceleration
    this.engineGain.gain.setTargetAtTime(speed>1?0.05+r*0.14:0.025, t, 0.04);
  }

  stopEngine(){
    if(!this.ctx||!this.engineGain)return;
    this.engineGain.gain.setTargetAtTime(0,this.ctx.currentTime,0.18);
  }

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
