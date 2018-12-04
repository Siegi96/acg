// Phong Vertex Shader

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_model;

uniform vec3 u_lightPos;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 worldPos;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

void main() {
	vec4 eyePosition = u_modelView * vec4(a_position,1);

	v_normalVec = u_normalMatrix * a_normal;
	worldPos = (u_model *vec4(a_position,1)).xyz;
  v_eyeVec = -eyePosition.xyz;
	v_lightVec = u_lightPos - eyePosition.xyz;
	v_normal = a_normal;
	v_texCoord = a_texCoord;
	vec3 surfaceWorldPosition = (u_model * vec4(a_position,1.0)).xyz;
	v_surfaceToLight = u_lightPos - surfaceWorldPosition;
	v_surfaceToView = eyePosition.xyz - surfaceWorldPosition;

	gl_Position = u_projection * eyePosition;
}
