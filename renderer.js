/**
 * @author ærowave <https://aerowave.neocities.org>
 */
class Renderer {
	static vertexSource = `#version 300 es
in vec4 position;

void main() {
	gl_Position = position;
}`;

	constructor(canvas) {
		// get rendering context
		if (!canvas instanceof HTMLCanvasElement) throw Error("canvas is not HTMLCanvasElement");
		this.canvas = canvas;
		/** @type {WebGL2RenderingContext} */
		this.gl = canvas.getContext("webgl2");
		
		// create and bind buffer
		this.quadBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([..."001201021021201221"].map(x=>x-1)), this.gl.STATIC_DRAW);

		// create and compile vertex shader
		this.vertexShader = Renderer.compileShader(this.gl, Renderer.vertexSource, this.gl.VERTEX_SHADER);

		// flip textures (otherwise webgl is literally unplayable)
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
	};

	static setUniforms(gl, uniforms) {
		let textureUnit = 0;
		for (let name in uniforms) {
			let value = uniforms[name];
			let location = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), name);
			if (!location) continue;
			// handle textures
			if (value instanceof WebGLTexture) {
				gl.activeTexture(gl.TEXTURE0 + textureUnit);
				gl.bindTexture(gl.TEXTURE_2D, value);
				gl.uniform1i(location, textureUnit);
				textureUnit++;
			} else if (Array.isArray(value)) {
				if (value.length === 2) gl.uniform2fv(location, value);
				else if (value.length === 3) gl.uniform3fv(location, value);
				else if (value.length === 4) gl.uniform4fv(location, value);
				else throw Error(`unsupported uniform length: ${value.length}`);
			} else {
				gl.uniform1f(location, value);
			}
		}
	}

	static compileShader(gl, source, type) {
		let shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			let info = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw Error("failed to compile shader:\n\n" + info);
		}
		return shader;
	}

	compileProgram(fragmentSource) {
		// create program
		let program = this.gl.createProgram();

		// compile shaders
		let fragmentShader = Renderer.compileShader(this.gl, fragmentSource, this.gl.FRAGMENT_SHADER);

		// link shaders into program
		this.gl.attachShader(program, this.vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);
		// throw an error if failed to link
		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			let info = this.gl.getProgramInfoLog(program);
			this.gl.deleteProgram(program);
			throw Error("failed to link program", {details: info})
		}

		// set buffers and attributes
		let positionAttributeLocation = this.gl.getAttribLocation(program, "position");
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
		this.gl.enableVertexAttribArray(positionAttributeLocation);
		this.gl.vertexAttribPointer(positionAttributeLocation, 3, this.gl.FLOAT, false, 0, 0);

		return {
			program: program,
			render: (uniforms) => {
				this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
				this.gl.useProgram(program);

				Renderer.setUniforms(this.gl, uniforms);
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

				this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
			},
			delete: () => this.gl.deleteProgram(program)
		}
	}

	createTexture(options) {
		// create texture
		let texture = this.gl.createTexture();
		// configure texture from options
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, options?.mag ?? this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, options?.min ?? this.gl.LINEAR);

		if (options?.src ?? false)
			Renderer.setTextureData(this.gl, texture, options);
		
		return {
			texture: texture,
			setData: (options) => {
				Renderer.setTextureData(this.gl, texture, options);
			},
			delete: () => this.gl.deleteTexture(texture)
		}
	}

	static setTextureData(gl, texture, options) {
		if (options.src instanceof HTMLImageElement || options.src instanceof HTMLCanvasElement || options.src instanceof ImageBitmap) {
			// if data is an image, use it directly
			options = options ?? {};
			options.width = options.src.width;
			options.height = options.src.height;
		} else if (!(options.src instanceof Uint8Array)) {
			throw Error("data must be a HTMLImageElement, HTMLCanvasElement, ImageBitmap or Uint8Array");
		}

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			options?.internalFormat ?? gl.RGBA8,
			options.width,
			options.height,
			0,
			options.format ?? gl.RGBA,
			options.type ?? gl.UNSIGNED_BYTE,
			options.src
		);
		if (options?.mipmaps) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}
	}

	static render(gl, program, uniforms) {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.useProgram(program.program);
		setUniforms(gl, uniforms);
		gl.drawArrays(gl.TRIANGLES, 0, 6)
	}


}