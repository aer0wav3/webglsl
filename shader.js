// i hate this file.... it is cursed and will haunt me until the end of time

var canvas, program, timerStart, lastRenderTime, fb;
/** @type {WebGLRenderingContext} */
var gl;
var mousepos = {x:-1,y:-1};

function createAndSetupTexture(gl) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Set up texture so we can render any size image and so we are
	// working with pixels.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	return texture;
}

function connectTexture(gl, name, unit, data) {
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.uniform1i(gl.getUniformLocation(program, name), unit);
	var texture = createAndSetupTexture(gl);
	
	if (data.constructor == HTMLImageElement) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, data.width, data.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}

	return texture;
}

function init() {
	canvas = document.getElementById("glCanvas");

	gl = setupGL(canvas);
	program = createProgram(gl, document.getElementById("FRAG_SHADER").textContent);
	
	// automatically connect textures based on loaded images
	let imageNames = Object.keys(images);
	for (let i = 0; i < imageNames.length; i++)
		texture = connectTexture(gl, "u_" + imageNames[i], i, images[imageNames[i]]);
	
	time = 0;
	render();
}

function setupGL(canvas) {
	// get gl context
	let gl = canvas.getContext("webgl2");

	// create triangles to draw on (required since webgl is a raster-based thing) 
	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER, 
		new Float32Array([
			-1.0, -1.0,
			1.0, -1.0,
			-1.0,  1.0,
			-1.0,  1.0,
			1.0, -1.0,
			1.0,  1.0
		]),
		gl.STATIC_DRAW
	);

	// set the canvas size based on the computed css size
	canvas.width = document.defaultView.getComputedStyle(canvas).width.replace("px", "");
	canvas.height = document.defaultView.getComputedStyle(canvas).height.replace("px", "");
	gl.viewport(0, 0, canvas.width, canvas.height);

	return gl;
}

const vertexSource = `precision highp float;
attribute vec2 a_position;

void main() {
	gl_Position = vec4(a_position, 0, 1);
}`;
function createProgram(gl, fragmentSource) {
	// create the vertex shader (boring)
	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSource);
	gl.compileShader(vertexShader);

	// create the vertex shader (cool)
	let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragmentSource);
	gl.compileShader(fragShader);

	// glsl info log
	a = gl.getShaderInfoLog(fragShader);
	console.log(a);
	if (a) alert(a);

	// create the program
	let program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	gl.useProgram(program);

	// auto resize canvas AND viewport
	window.addEventListener("resize", ()=>{
		canvas.width = document.defaultView.getComputedStyle(canvas).width.replace("px", "");
		canvas.height = document.defaultView.getComputedStyle(canvas).height.replace("px", "");
		gl.viewport(0, 0, canvas.width, canvas.height);
	});

	window.addEventListener("mousemove", (e)=>{
		mousepos.x = e.offsetX;
		mousepos.y = e.offsetY;
	})

	return program;
}

function render(timeStamp) {
	// update time
	time = timeStamp * 0.001;

	// update uniforms (time, resolution, etc)
	updateUniforms();

	// clear screen
	//gl.clearColor(0.0, 0.0, 0.0, 0.0);
	//gl.clear(gl.COLOR_BUFFER_BIT);
	
	// something???? i think this might be a culprit for framebuffers
	let positionLocation = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	// draw to texture? doesn't seem to work
	//gl.drawArrays(gl.TRIANGLES, 0, 6);
	//gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

	// draw to canvas
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	// again
	window.requestAnimationFrame(render, canvas);
}

function updateUniforms() {
	// define uniforms here
	// "uniform variable name": new Float32Array([values]) or Int32Array([values])
	let uniforms = {
		"u_resolution": new Float32Array([gl.drawingBufferWidth, gl.drawingBufferHeight]),
		"u_time": new Float32Array([time]),
		"u_mouse": new Float32Array([mousepos.x, mousepos.y]),
	};

	// use uniforms object to set uniforms
	let loc = {};
	for (let i of Object.keys(uniforms)) {
		loc[i] = gl.getUniformLocation(program, i);
	};
	gl.useProgram(program);
	for (let i of Object.keys(uniforms)) {
		if (uniforms[i].constructor == Float32Array) {
			if (uniforms[i].length === 1) gl.uniform1fv(loc[i], uniforms[i]);
			if (uniforms[i].length === 2) gl.uniform2fv(loc[i], uniforms[i]);
			if (uniforms[i].length === 3) gl.uniform3fv(loc[i], uniforms[i]);
			if (uniforms[i].length === 4) gl.uniform4fv(loc[i], uniforms[i]);
		} else if (uniforms[i].constructor == Int32Array) {
			if (uniforms[i].length === 1) gl.uniform1iv(loc[i], uniforms[i]);
			if (uniforms[i].length === 2) gl.uniform2iv(loc[i], uniforms[i]);
			if (uniforms[i].length === 3) gl.uniform3iv(loc[i], uniforms[i]);
			if (uniforms[i].length === 4) gl.uniform4iv(loc[i], uniforms[i]);
		}
	};
}