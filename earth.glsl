
precision highp float;

uniform lowp vec2 u_resolution;
uniform highp float u_time;
uniform mediump float u_deltaTime;
uniform lowp vec2 u_mouse;

uniform sampler2D u_bayer;
uniform sampler2D u_earth;
uniform sampler2D u_space;

const float PI = acos(0.0) * 2.0;

void rotate(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

// sphere intersection function (if rad is negative, returns distance to backface instead)
float sphere(vec3 ro, vec3 rd, float rad) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad*rad;
  float h = b*b - c;
  if (h < 0.0) return -1.0;
  if (rad > 0.0) return -b - sqrt(h);
  return -b + sqrt(h);
}

// conversion from 3D space to equirectangular 2D
vec2 equirectangular(vec3 p) {
	return vec2(fract((atan(p.z / p.x) + (p.x < 0.0 ? 0.0 : PI)) / PI * 0.5), acos(normalize(p).y) / PI);
}

vec3 render(vec2 coord) {
	vec2 uv = (coord.xy - 0.5 * u_resolution.xy ) / u_resolution.y;
	vec2 rotation = u_mouse / u_resolution * vec2(2.0 * PI, -PI) + vec2(0, PI * 0.5);

	// setup ray
	vec3 origin = vec3(0,0,-4.0 / u_time - 2.4);
	vec3 dir = normalize(vec3(uv, 2));

	// trace planet
	float dist = 0.0;	
	dist = sphere(origin, dir, 0.5);

	// get hit position
	vec3 p = origin + dir * dist;
	rotate(p.yz, rotation.y);
	rotate(p.xz, rotation.x);
	
	// surface normals
	vec3 n = normalize(p);

	// sky color
	vec3 spaceDir = dir;
	rotate(spaceDir.yz, rotation.y);
	rotate(spaceDir.xz, rotation.x);
	vec3 col = texture2D(u_space, equirectangular(spaceDir)).rgb;

	// earth color
	if (dist != -1.0) {
		col = texture2D(u_earth, equirectangular(p)).rgb;

		// if water
		if (length(col - vec3(0,0,0.078)) < 0.1)
			// simple reflection
			col += texture2D(u_space, equirectangular(reflect(spaceDir, n))).rgb;
	}

	// trace atmosphere
	float rayAtmosphereDist = sphere(origin, dir, 0.6);
	float rayAtmosphereExitDist = sphere(origin, dir, -0.6);

	// atmosphere density calulations
	float atmosphere = rayAtmosphereDist != -1.0 ? (dist < rayAtmosphereDist ? rayAtmosphereExitDist : dist + 0.4) - rayAtmosphereDist : 0.0;
	atmosphere = (1.0 / (1.0 - atmosphere) - 1.0) * 0.3;
	col += vec3(0.4,0.7,1.0) * atmosphere;

	return col;
}

vec3 dither(in vec3 col, in float dither) {
	const int COLORS = 6;
	col += (dither - 0.5 / float(COLORS)) / float(COLORS-1);
	return floor(col * float(COLORS-1)) / float(COLORS-1);
}

void main() {
	vec3 col = vec3(0);
	
	// subpixel sampling for easy antialiasing
	for (float x = -0.5; x < 0.5; x += 0.5) {
		for (float y = -0.5; y < 0.5; y += 0.5) {
			col += render(floor(gl_FragCoord.xy) + vec2(x,y)) * 0.25;
		}
	}

	// dither pass
	float bayer = texture2D(u_bayer, gl_FragCoord.xy / 16.0).r;
	col = dither(col, fract(bayer));

	// output
	gl_FragColor = vec4(col, 1.0);
}
