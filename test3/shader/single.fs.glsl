/**
 * Created by Samuel Gratzl on 29.02.2016.
 */
precision mediump float;
uniform sampler2D u_diffuseTex;
uniform bool u_diffuseTexEnabled;
varying vec2 texCoord;

varying vec3 worldPos;

//texture related variables
uniform bool enableClipping;
uniform bool clipHigher;
uniform float clipDistance;
uniform vec3 u_reverseLightDirection;

varying vec3 v_normal;
varying mat4 mvp;

void main() {
	if(enableClipping){
		if(clipHigher){
			if(worldPos.y < clipDistance){
				discard;
			}
		}
		else{
			if(worldPos.y > clipDistance){
				discard;
			}
		}
	}
	vec3 normal = normalize(v_normal);

	float light = dot(normal, u_reverseLightDirection);
	vec4 color = vec4(0.2,0.2,1,1);
	if(u_diffuseTexEnabled)
		color  =  texture2D(u_diffuseTex, texCoord);
	gl_FragColor = color;
	gl_FragColor.rgb *= light;
}
