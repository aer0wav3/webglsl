

(async function() {
	try {
		let imageURLs = {
			bayer: "https://raw.githubusercontent.com/aer0wav3/webglsl/refs/heads/main/textures/bayer.png",
			image: "https://media.tenor.com/raWtfp1IAm0AAAAe/spin-skull-bad-to-bone.png",
		}; 
		images = await getImages(imageURLs);
	} catch(e) {
		console.error("failed to load images... you must be offline");
		return;
	}
})().then(()=>{
	canvas = document.getElementById("glCanvas");
	gl = setupGL(canvas);

	const fragmentSource = document.getElementById("FRAG_SHADER").textContent;

	// create the vertex shader (boring)
	let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
	console.log("vertex shader compiled");

	// create the fragment shader (cool)
	let fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	console.log("fragment shader compiled");

	// create the program
	program = createProgram(gl, vertexShader, fragShader);

	// i still don't know what this does
	vao = setupVertexBuffer(gl, program);

	// auto resize canvas AND viewport
	window.addEventListener("resize", ()=>{
		canvas.width = document.defaultView.getComputedStyle(canvas).width.replace("px", "");
		canvas.height = document.defaultView.getComputedStyle(canvas).height.replace("px", "");
		gl.viewport(0, 0, canvas.width, canvas.height);
	});

	window.addEventListener("mousemove", (e)=>{
		mousepos.x = e.offsetX;
		mousepos.y = e.offsetY;
	});

	gl.useProgram(program);
	// automatically connect textures based on loaded images
	let imageNames = Object.keys(images);
	for (let i = 0; i < imageNames.length; i++) {
		console.log(`connecting texure '${imageNames[i]}' (${i}/${imageNames.length})`);
		texture = connectTexture(gl, "u_" + imageNames[i], i, images[imageNames[i]]);
	}
	console.log(`done (${imageNames.length}/${imageNames.length})`);

	gl.bindVertexArray(vao);

	time = 0;

	render = (timestamp)=>{
		time = timestamp * 0.001;
		updateUniforms();
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		window.requestAnimationFrame(render, canvas);
	}

	render(0);
	

	//time = 0;
	//render(gl, program);
});