const canvas = document.querySelector("canvas");
const pre = document.querySelector("pre");
const renderer = new Renderer(canvas);

// basic shader demo
let program = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

void main() {
	ivec2 uv = ivec2(gl_FragCoord.xy);

	vec3 color = vec3((uv.x ^ uv.y) % 256) / 255.0; 
	
	fragColor = vec4(color, 1);
}`);

// uniforms demo
let uniformsProgram = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

uniform vec2 iResolution;
uniform float iTime;

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution;
	
	vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
	
	fragColor = vec4(col, 1.0);
}`);

// textures demo
let texturesProgram = renderer.compileProgram(`#version 300 es
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

// framebuffer demo
let framebufferProgram = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

uniform sampler2D backbuffer;
uniform vec2 iResolution;
uniform int iFrame;
uniform float iTime;

void main() {
	bool cellState = bool(texelFetch(backbuffer, ivec2(gl_FragCoord.xy), 0).r);
	
	if (iFrame == 0) {
		cellState = fract(sin(dot(gl_FragCoord.xy ,vec2(12.9898,78.233))) * 43758.5453) > 0.5;
	} else {
		int aliveNeighbors = 0;
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(1,  1)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(1,  0)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(1, -1)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(0,  1)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(0, -1)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(-1, 1)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(-1, 0)) % ivec2(iResolution), 0).r);
		aliveNeighbors += int(texelFetch(backbuffer, ivec2(gl_FragCoord.xy + vec2(-1,-1)) % ivec2(iResolution), 0).r);
		if (cellState) {
			if (aliveNeighbors < 2 || aliveNeighbors > 3) cellState = false;
		} else {
			if (aliveNeighbors == 3) cellState = true;
		}
	}
	
	fragColor = vec4(vec3(cellState),1);
}

`);

let displayProgram = renderer.compileProgram(`#version 300 es
precision mediump float;

out vec4 fragColor;

uniform sampler2D iTexture;
uniform vec2 iResolution;

// stolen from https://www.shadertoy.com/view/csX3RH
vec4 texture2DAA(sampler2D tex, vec2 uv) {
    vec2 texsize = vec2(textureSize(tex,0));
    vec2 uv_texspace = uv*texsize;
    vec2 seam = floor(uv_texspace+.5);
    uv_texspace = (uv_texspace-seam)/fwidth(uv_texspace)+seam;
    uv_texspace = clamp(uv_texspace, seam-.5, seam+.5);
    return texture(tex, uv_texspace/texsize);
}

void main() {
	vec2 res = vec2(textureSize(iTexture, 0));
	vec2 uv = gl_FragCoord.xy / iResolution;
	fragColor = vec4(texture2DAA(iTexture, uv - vec2(1.0 / res.x, 0)).r, texture2DAA(iTexture, uv).g, texture2DAA(iTexture, uv + vec2(1.0 / res.x, 0)).b, 1.0);
}

`)

let texture = renderer.createTexture();
let image = new Image();
image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAvUlEQVRYR+2X0Q6AIAhF4/8/uqLCIWLSZuADvbRc6hFPtwn7eW2BFyAAAFQIxETts59pMhy3AHgXAheXAKUCgQ7eDoQDkBCeIGtJ6LlyOVfjgAwl7HDZKsKK2vGuBdnb+xyiG0TSi54nI39G/T4B8AitVsGqIz8qE4DmgLUCzZ4+EUvtwwr1ckADkJNpblgrUADpb+idR5kD1RaEB9HI1D8A04F0IB1IB9ZyYIkk5HE7+zAqx2sOp39kvXXMA6sxRbB0Xh9HAAAAAElFTkSuQmCC";
image.crossOrigin = "anonymous"; // allow cross-origin images
image.onload = () => {
	texture.setData({src: image});
}

let renderpass = renderer.createRenderPass(256, 256);


var lastTime;
var frame = 0;

function render(time) {
	let timeDelta = time - lastTime;
	lastTime = time;
	
	[canvas.width, canvas.height] = [window.innerWidth, window.innerHeight];
	
	renderpass.render(framebufferProgram, {
		backbuffer: renderpass.texture,
		iResolution: [renderpass.width, renderpass.height],
		iTime: time * 0.001,
		iFrame: new Int32Array([frame])
	});

	renderer.render(displayProgram, {
		iTexture: renderpass.texture,
		iResolution: [canvas.width, canvas.height],
		iTime: time * 0.001
	});
	for (let i = 0; i < 6; i++) pre.textContent = i;
	timeB = performance.now();

	pre.textContent = `FPS: ${Math.floor(1000 / timeDelta)}\nrender: ${Math.floor(timeB - time)} ms\nframe: ${frame}\n`;

	frame++;
	requestAnimationFrame(render);
}

requestAnimationFrame(render);