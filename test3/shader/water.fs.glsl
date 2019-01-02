
precision mediump float;

uniform sampler2D u_noiseSampler;
uniform sampler2D u_reflectionSampler;
uniform sampler2D u_refractionSampler;
uniform vec3 u_sunDirection;
uniform vec3 u_sunColor;
uniform vec3 u_horizonColor;
uniform vec3 u_zenithColor;
uniform float u_atmosphereDensity;
uniform vec3 u_fogColor;
uniform float u_fogDensity;
uniform float u_fogFalloff;

varying vec3 v_eyePos;
varying vec3 v_worldPos;
varying vec4 v_projPos;
varying float v_time;

vec4 getNoise(vec2 uv){
    vec2 uv0 = (uv/103.0)+vec2(v_time/17.0, v_time/29.0);
    vec2 uv1 = uv/107.0-vec2(v_time/-19.0, v_time/31.0);
    vec2 uv2 = uv/vec2(897.0, 983.0)+vec2(v_time/101.0, v_time/97.0);
    vec2 uv3 = uv/vec2(991.0, 877.0)-vec2(v_time/109.0, v_time/-113.0);
    vec4 noise = (texture2D(u_noiseSampler, uv0)) +
                 (texture2D(u_noiseSampler, uv1)) +
                 (texture2D(u_noiseSampler, uv2)) +
                 (texture2D(u_noiseSampler, uv3));
    return noise*0.5-1.0;
}

void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse,
              inout vec3 diffuseColor, inout vec3 specularColor){
    vec3 reflection = normalize(reflect(-u_sunDirection, surfaceNormal));
    float direction = max(0.0, dot(eyeDirection, reflection));
    specularColor += pow(direction, shiny)*u_sunColor*spec;
    diffuseColor += max(dot(u_sunDirection, surfaceNormal),0.0)*u_sunColor*diffuse;
}

/* not used cause buggy */
vec3 atmosphereColor(vec3 rayDirection){
    float a = max(0.0, dot(rayDirection, vec3(0.0, 1.0, 0.0)));
    vec3 skyColor = mix(u_horizonColor, u_zenithColor, a);
    float sunTheta = max( dot(rayDirection, u_sunDirection), 0.0 );
    return skyColor+u_sunColor*pow(sunTheta, 256.0)*0.5;
}

vec3 applyFog(vec3 albedo, float dist, vec3 rayOrigin, vec3 rayDirection){
    float fog = exp((-rayOrigin.y*u_fogFalloff)*u_fogDensity) * (1.0-exp(-dist*rayDirection.y*u_fogFalloff*u_fogDensity))/(rayDirection.y*u_fogFalloff);
    return mix(albedo, u_fogColor, clamp(fog, 0.0, 1.0));
}

vec3 aerialPerspective(vec3 albedo, float dist, vec3 rayOrigin, vec3 rayDirection){
    /* not used cause buggy */
    //vec3 atmosphere = atmosphereColor(rayDirection)+vec3(0.0, 0.02, 0.04);
    //vec3 color = mix(albedo, atmosphere, clamp(1.0-exp(-dist*u_atmosphereDensity), 0.0, 1.0));
    return applyFog(albedo, dist, rayOrigin, rayDirection);
}

vec2 calculateReflectionTexCoords(vec2 distortion){
  vec3 inverseProj = vec3(v_projPos.x,-v_projPos.y,v_projPos.z);
	vec2 screen = (inverseProj.xy/inverseProj.z + 1.0)*0.5;
  return vec2(screen.x,screen.y)+distortion;
}

vec2 calculateDistortion(vec3 worldToEye, vec3 surfaceNormal){
  float dist = length(worldToEye);
  float distortionFactor = max(dist/100.0, 10.0);
  return surfaceNormal.xz/distortionFactor;
}

vec2 calculateRefractionTexCoords(vec2 distortion){
  vec2 screen = (v_projPos.xy/v_projPos.z + 1.0)*0.5;
  return screen - distortion;
}

void main() {

	vec4 noise = getNoise(v_worldPos.xz);
	vec3 surfaceNormal = normalize(noise.xzy*vec3(2.0, 1.0, 2.0));

	vec3 diffuse = vec3(0.0);
	vec3 specular = vec3(0.0);

	vec3 worldToEye = v_eyePos-v_worldPos;
	vec3 eyeDirection = normalize(worldToEye);
	sunLight(surfaceNormal, eyeDirection,5.0, 5.0, 0.5, diffuse, specular);

  vec2 distortion = calculateDistortion(worldToEye, surfaceNormal);

	vec2 reflectTexCoords = calculateReflectionTexCoords(distortion);
	vec4 reflectionSample = texture2D(u_reflectionSampler, reflectTexCoords);

  vec2 refractionTexCoords = calculateRefractionTexCoords(distortion);
  vec4 refractionSample = texture2D(u_refractionSampler, refractionTexCoords);

	//schlicksApproximation
	float theta1 = max(dot(eyeDirection, surfaceNormal), 0.0);
	float rf0 = 0.02;
	float reflectance = rf0 + (1.0 - rf0)*pow((1.0 - theta1),5.0);
	vec3 scatter = max(0.0, dot(surfaceNormal,eyeDirection)) * vec3(0.0,0.14,0.2);
	vec3 albedo = mix((scatter+(vec3(refractionSample)*diffuse)), (vec3(0.1)+vec3(reflectionSample)*0.9+specular), reflectance);

  vec3 rayDirection = normalize(v_worldPos - v_eyePos);
  albedo = aerialPerspective(albedo, length(worldToEye), v_eyePos,rayDirection);

	gl_FragColor = vec4(albedo, 1.0);
}
