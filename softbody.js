/*
 * softbody.js: simple spring-mass system
 */

/*
 * VECTOR PRIMITIVE
 */
class vec2 {
  constructor(x, y){
    this.x = x;
    this.y = y;
  }
  distance(p){
    return Math.sqrt(
      (p.x - this.x) * (p.x - this.x) +
      (p.y - this.y) * (p.y - this.y)
    );
  }
  copy(){
    return new vec2(
      this.x,
      this.y
    );
  }
  length(){
    return this.distance(new vec2(0, 0));
  }
  norm(){
    let len = this.length();
    return new vec2(
      this.x / len,
      this.y / len
    );
  }
  add(p){
    return new vec2(
      this.x + p.x,
      this.y + p.y
    );
  }
  add_s(n){
    return new vec2(
      this.x + n,
      this.y + n
    );
  }
  sub(p){
    return new vec2(
      this.x - p.x,
      this.y - p.y
    );
  }
  sub_s(n){
    return new vec2(
      this.x - n,
      this.y - n
    );
  }
  mult(p){
    return new vec2(
      this.x * p.x,
      this.y * p.y
    );
  }
  mult_s(n){
    return new vec2(
      n * this.x,
      n * this.y
    );
  }
  dot(v){
    return (this.x * v.x) + (this.y * v.y);
  }
}

/*
 * POINT HELPER CLASS
 */
class Point extends vec2 {
  constructor(x, y) {
    super(x, y);

    this.origin = new vec2(x, y);
    this.velocity = new vec2(0, 0);
    this.acceleration = new vec2(0, 0);
  }
  update(){ // Not to be called manually!
    this.x += this.velocity.x;
    this.y += this.velocity.y;

    this.velocity.x += this.acceleration.x;
    this.velocity.y += this.acceleration.y;
  }
  render(ctx, color_override){
    let color = color_override ?? `rgb(${Math.min(255, Math.abs(this.acceleration.x * 5000))}, ${Math.min(255, Math.abs(this.acceleration.y * 5000))}, ${255})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/*
 * PHYSICS OBJECTS
 */
class Spring {
  constructor(a, b){
    this.points = [a, b];
    this.from = a;
    this.to = b;
    this.props = {
      d0: a.distance(b),
      k: 0.001,
      mass: 1,
      damping: 0.05,
      gravity: new vec2(0, 0.1)
    };

    this.first_update = true; // Fun little pop-in animation
  }
  update(){
    if(this.first_update){
      this.first_update = false;
      this.from.x *= 1.1;
      this.from.y *= 1.1;
    }

    let Fnet = (this.props.k * (this.from.distance(this.to) - this.props.d0)),
      vec = this.to.sub(this.from).mult_s(0.5);

    this.from.acceleration = vec.mult_s(Fnet / this.props.mass);
    this.from.acceleration = this.from.acceleration.sub(this.from.velocity.mult_s(this.props.damping));

    this.to.acceleration = vec.mult_s(-Fnet / this.props.mass);
    this.to.acceleration = this.to.acceleration.sub(this.to.velocity.mult_s(this.props.damping));

    this.from.update();
    this.to.update();
  }
  render(ctx){
    let val = Math.abs(this.from.distance(this.to) - this.props.d0);
    let color = `rgb(${50}, ${50*val}, ${255-(50*val)})`;

    this.from.render(ctx, color);
    this.to.render(ctx, color);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
  }
}

class Body {
  constructor(n, r, x, y){
    let arr = [];
    for(let i=0;i<2*Math.PI;i+=(2*Math.PI)/n){
      arr.push(new Point(x + (r*Math.cos(i)), y + (r*Math.sin(i))));
    }
    this.points = arr;

    this.springs = [];
    arr.forEach(p1 => {
      arr.forEach(p2 => {
        if(p1 !== p2) this.springs.push(new Spring(p1, p2));
      });
    });

    this.props = {
      mass: 1,
      volume: 1,
      k: 0.01,
      damp: 0.1
    };
    this.props.pressure = this.props.mass * this.props.volume * this.props.k;

    this.origin = new Point(x, y);
  }
  update(){
    this.springs.forEach(s => {
      s.update();
    })
  }
  render(ctx){
    this.springs.forEach(s => {
      s.render(ctx);
    });
  }
}

class World {
  constructor(canv, ctx){
    if(!ctx) throw "Invalid rendering context";

    this.canv = canv;
    this.ctx = ctx;
    this.objects = [];

    this.loop = this.loop.bind(this);
  }
  get points(){
    let out = [];
    this.objects.forEach(obj => {
      out.push(...obj.points);
    });
    return out;
  }
  add(obj){
    this.objects.push(obj);
  }
  loop(){
    requestAnimationFrame(this.loop);
    ctx.clearRect(0, 0, canv.width, canv.height);
    this.objects.forEach(obj => {
      obj.update();
      obj.render(this.ctx);
    });

    this.points.forEach(p => {
      if(p.x < 0 && p.velocity.x < 0){
        p.x = 0;
        p.velocity.x = 0;
        p.acceleration.x = 0;
      }
      if(p.x > this.canv.width / 10 && p.velocity.x > 0){
        p.x = this.canv.width / 10;
        p.velocity.x = 0;
        p.acceleration.x = 0;
      }

      if(p.y < 0 && p.velocity.y < 0){
        p.y = 0;
        p.velocity.y = 0;
        p.acceleration.y = 0;
      }
      if(p.y > this.canv.height / 10 && p.velocity.y > 0){
        p.y = this.canv.height / 10;
        p.velocity.y = 0;
        p.acceleration.y = 0;
      }
    });
  }
}

/*
 * DEMO
 */
const canv = document.getElementById('canv'),
  ctx = canv.getContext('2d');
canv.width = window.innerWidth;
canv.height = window.innerHeight;
ctx.scale(10, 10);

let w = new World(canv, ctx);

w.add(new Body(3, 10, 10, 10));
w.add(new Body(4, 10, 25, 25));
w.add(new Body(5, 10, 40, 40));

w.loop();

let mouse = null;
function mousedown(e){
  mouse = null;

  let v = new vec2(e.pageX/10, e.pageY/10);
  w.points.forEach(p => {
    if(p.distance(v) < 2) mouse = p;
  });

  mousemove(e);
}
function mousemove(e){
  if(mouse){
    mouse.x = e.pageX / 10;
    mouse.y = e.pageY / 10;
  }
}
function mouseup(){
  mouse = null;
}
canv.addEventListener('mousedown', mousedown);
canv.addEventListener('mousemove', mousemove);
canv.addEventListener('mouseup',   mouseup);
