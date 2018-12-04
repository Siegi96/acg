/**
 * a phong shader implementation with texture support
 */
precision mediump float;

/**
 * definition of a material structure containing common properties
 */
struct Material {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
	vec4 emission;
	float shininess;
};

/**
 * definition of the light properties related to material properties
 */
struct Light {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
};
uniform bool enableClipping;
uniform bool clipHigher;
uniform float clipDistance;
uniform vec3 u_reverseLightDirection;
//illumination related variables
uniform Material u_material;
uniform Light u_light;
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec3 worldPos;
varying vec3 v_normal;



//texture related variables
varying vec2 v_texCoord;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
uniform sampler2D u_diffuseTex;
uniform bool u_diffuseTexEnabled;



vec4 calculateSimplePointLight( Light light, Material material,
	vec3 lightVec, vec3 normalVec, vec3 eyeVec,
	bool useTexColor, vec4 texColor ) {
	lightVec = normalize(lightVec);
	normalVec = normalize(normalVec);
	eyeVec = normalize(eyeVec);

	if (useTexColor) {
		material.diffuse = texColor;
	}

	//compute diffuse term
	float diffuse = max(dot(normalVec,lightVec),0.0);

	//compute specular term
	vec3 reflectVec = reflect(-lightVec,normalVec);
	float spec = pow( max( dot(reflectVec, eyeVec), 0.0) , material.shininess);

	vec4 c_amb  = clamp(light.ambient * material.ambient, 0.0, 1.0);
	vec4 c_diff = clamp(diffuse * light.diffuse * material.diffuse, 0.0, 1.0);
	vec4 c_spec = clamp(spec * light.specular * material.specular, 0.0, 1.0);
	vec4 c_em   = material.emission;

  return c_amb + c_diff + c_spec + c_em;
}

void main (void) {
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
	vec4 diffuseTexColor = vec4(0.0);

	if (u_diffuseTexEnabled) {
		diffuseTexColor = texture2D(u_diffuseTex, v_texCoord);
	}
	vec3 normal = normalize(v_normal);
	float light = dot(normal, u_reverseLightDirection);
	/*gl_FragColor = calculateSimplePointLight(u_light, u_material, v_lightVec, v_normalVec,
			v_eyeVec, u_diffuseTexEnabled, diffuseTexColor );*/
	float innerLimit=1.0;
	float outerLimit=2.0;
	vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
	vec3 surfaceToViewDirection = normalize(v_surfaceToView);
	vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);
	float dotFromDirection = dot(surfaceToLightDirection,
                               u_reverseLightDirection);
	float limitRange = innerLimit - outerLimit;
  float inLight = clamp((dotFromDirection - outerLimit) / limitRange, 0.0, 1.0);
  float spotlight = inLight * dot(normal, surfaceToLightDirection);
  float specular = inLight * pow(dot(normal, halfVector), 1.0);//1.0=shininess
	gl_FragColor = diffuseTexColor;
	gl_FragColor.rgb *=light;

}
