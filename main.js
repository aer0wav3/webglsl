const canvas = document.querySelector("canvas");
const pre = document.querySelector("pre");
const renderer = new Renderer(canvas);

// basic shader demo
/* let program = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

void main() {
	ivec2 uv = ivec2(gl_FragCoord.xy);

	vec3 color = vec3((uv.x ^ uv.y) % 256) / 255.0; 
	
	fragColor = vec4(color, 1);
}`); */

// uniforms demo
/* let program = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

uniform vec2 iResolution;
uniform float iTime;

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution;
	
	vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
	
	fragColor = vec4(col, 1.0);
}`); */

// textures demo
let program = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

uniform sampler2D iTexture;
uniform vec2 iResolution;
uniform float iTime;

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution;

	uv += vec2(sin(uv.y * 20.0 + iTime) * 0.02, cos(uv.x * 20.0 + iTime) * 0.02);
	
	fragColor = texture(iTexture, uv);
}`);

let texture = renderer.createTexture();
let image = new Image();
image.src = "https://picsum.photos/1080";
image.crossOrigin = "anonymous"; // allow cross-origin images
image.onload = () => {
	texture.setData({src: image});
}


// framebuffer demo
// let program = renderer.compileProgram(`#version 300 es

var lastTime;

function render(time) {
	let timeDelta = time - lastTime;
	lastTime = time;
	
	[canvas.width, canvas.height] = [window.innerWidth, window.innerHeight];
	
	program.render({
		iResolution: [canvas.width, canvas.height],
		iTime: time * 0.001,
		iTexture: texture.texture
	});
	for (let i = 0; i < 6; i++) pre.textContent = i;
	timeB = performance.now();

	pre.textContent = `FPS: ${Math.floor(1000 / timeDelta)}\nrender: ${Math.floor(timeB - time)} ms`

	requestAnimationFrame(render);
}

requestAnimationFrame(render);