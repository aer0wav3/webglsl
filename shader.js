var canvas, gl, program, timerStart, lastRenderTime, fb;

function createAndSetupTexture(gl) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Set up texture so we can render any size image and so we are
	// working with pixels.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

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
	program = createProgram(gl);

	timerStart = Date.now() * 0.001;
	lastRenderTime = timerStart;

	texture = connectTexture(gl, "u_bayer", 0, images.bayer);
	texture = connectTexture(gl, "u_image", 1, images.lisa);

	texture = connectTexture(gl, "u_buffer", 2, {width: 16, height: 16});
	// Create and bind the framebuffer
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	
	// attach the texture as the first color attachment
	const attachmentPoint = gl.COLOR_ATTACHMENT0;
	gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);

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

function createProgram(gl) {
	// create the vertex shader (boring)
	let vert_dom = document.getElementById("VERT_SHADER");
	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vert_dom.text);
	gl.compileShader(vertexShader);

	// create the vertex shader (cool)
	let frag_dom = document.getElementById("FRAG_SHADER");
	let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, frag_dom.text);
	gl.compileShader(fragShader);

	// glsl info log
	console.log(gl.getShaderInfoLog(fragShader));

	// create the program
	let program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	gl.useProgram(program);

	window.addEventListener("resize", ()=>{
		canvas.width = document.defaultView.getComputedStyle(canvas).width.replace("px", "");
		canvas.height = document.defaultView.getComputedStyle(canvas).height.replace("px", "");
		gl.viewport(0, 0, canvas.width, canvas.height);
	});

	return program;
}

function render() {
	// update uniforms (time, resolution, etc)
	updateUniforms();

	// clear screen (does this do anything?)
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	// ???
	let positionLocation = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	// draw to texture
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

	// draw to canvas
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	// one more time
	window.requestAnimationFrame(render, canvas);
}

function updateUniforms() {
	// define uniforms here
	// "uniform variable name": new Float32Array([values]) or Int32Array([values])
	let uniforms = {
		"u_resolution": new Float32Array([gl.drawingBufferWidth, gl.drawingBufferHeight]),
		"u_time": new Float32Array([Date.now() * 0.001 - timerStart])
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