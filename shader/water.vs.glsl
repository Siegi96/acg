attribute vec3 a_position;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat4 u_projection;
uniform mat4 u_model;
uniform sampler2D u_heightSampler;
uniform float u_time;

varying vec3 v_worldPos;
varying vec4 v_projPos;
varying vec3 v_eyePos;
varying float v_time;

float CalculateWaveHeight(float amp, float freq, vec2 texCoord) {
		highp int moduloHelper = int(u_time * freq);
		texCoord = texCoord * float(moduloHelper) * freq;
		vec4 heightSample = texture2D(u_heightSampler, texCoord);
		float waveHeight = heightSample.x;
		moduloHelper = int(waveHeight / amp);
		waveHeight -= float(moduloHelper) * amp;
		return waveHeight;
}

void main() {
	vec3 position = a_position;
	position.y += CalculateWaveHeight(3.5, 2.0, a_texCoord);
	vec4 eyePosition = u_modelView * vec4(position,1);

	v_time = u_time;
	v_eyePos = vec3(eyePosition);
	v_worldPos = (u_model * vec4(position,1.0)).xyz;

	gl_Position = v_projPos = u_projection * eyePosition;
}
