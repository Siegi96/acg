/**
 * Created by Samuel Gratzl on 29.02.2016.
 */
attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute vec3 a_normal;

uniform mat4 u_modelView;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;

varying vec3 worldPos;
varying vec2 texCoord;
varying vec3 v_normal;
void main() {
	vec4 eyePosition = u_modelView * vec4(a_position,1);
	worldPos = (u_model *vec4(a_position,1)).xyz;
	texCoord = a_texCoord;

	v_normal =  a_normal;
	gl_Position = u_projection * eyePosition;
}
