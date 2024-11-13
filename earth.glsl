
precision highp float;

uniform lowp vec2 u_resolution;
uniform highp float u_time;
uniform mediump float u_deltaTime;
uniform lowp vec2 u_mouse;

uniform sampler2D u_bayer;
uniform sampler2D u_earth;

const float PI = acos(0.0)*2.0;

void rotate(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

float sphere(vec3 ro, vec3 rd, float rad) {
  float b = dot( ro, rd );
  float c = dot( ro, ro ) - rad*rad;
  float h = b*b - c;
  if( h<0.0 ) return -1.0;
  if (rad > 0.0) return -b - sqrt( h );
  return -b + sqrt( h );
}

vec3 render(vec2 coord) {
	vec2 uv = (coord.xy - 0.5 * u_resolution.xy ) / u_resolution.y;

	vec2 rotation = u_mouse / u_resolution * vec2(2.0 * PI, -PI) + vec2(0, PI * 0.5);

	// setup ray
	vec3 origin = vec3(0,0,-2.4);
	vec3 dir = normalize(vec3(uv, 2));

	// trace planet
	float dist = 0.0;	
	dist = sphere(origin, dir, 0.5);

	vec3 p = origin + dir * dist;
	
	rotate(p.yz, rotation.y);
	rotate(p.xz, rotation.x);
	
	vec3 n = normalize(p);

	vec3 col = vec3(0);
	const vec3 sunDir = normalize(vec3(-3,1,0));

	// earth color
	if (dist != -1.0) {
		vec2 coords = vec2(fract((atan(p.z / p.x) + (p.x < 0.0 ? 0.0 : PI)) / PI * 0.5), acos(p.y * 2.0) / PI);
		col = texture2D(u_earth, coords).rgb;

		// if water
		if (length(col - vec3(0,0,0.078)) < 0.1) {
			
		}

		//col *= dot(normalize(p), vec3(0,0,-1));
	}

	// trace atmosphere
	float rayAtmosphereDist = sphere(origin, dir, 0.6);
	float rayAtmosphereExitDist = sphere(origin, dir, -0.6);

	float atmosphere = rayAtmosphereDist != -1.0 ? (dist < rayAtmosphereDist ? rayAtmosphereExitDist : dist + 0.4) - rayAtmosphereDist : 0.0;
	atmosphere = (1.0 / (1.0 - atmosphere) - 1.0) * 0.3;

	// atmosphere
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
	
	// supersampling for antialiasing
	for (float x = -0.5; x < 0.5; x += 0.5) {
		for (float y = -0.5; y < 0.5; y+=0.5) {
			col += render(floor(gl_FragCoord.xy) + vec2(x,y)) * 0.25;
		}
	}

	// dither pass
	float bayer = texture2D(u_bayer, fract(gl_FragCoord.xy / 16.0)).r;
	col = dither(col, fract(bayer));

	gl_FragColor = vec4(col, 1.0);
}
