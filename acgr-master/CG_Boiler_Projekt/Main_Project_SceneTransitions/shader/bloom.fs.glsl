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

//illumination related variables
uniform Material u_material;
uniform Light u_light;
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
float texturesize = 1920.0;

//texture related variables
varying vec2 v_texCoord;
uniform bool u_diffuseTexEnabled;
uniform sampler2D u_tex;

uniform float fadeAlpha;


vec2 size= vec2(4000.0,4000.0);
float samples = 1.0; // pixels per axis; higher = bigger glow, worse performance
float quality = 2.3; // lower = smaller glow, better quality

vec4 bloomblur(vec4 colour, sampler2D tex, vec2 tc)
{
  vec4 source = texture2D(tex, tc);
  vec4 sum = vec4(0);
  const int diff = 1;
  vec2 sizeFactor = vec2(1) / size * quality;

  for (int x = -diff; x <= diff; x++)
  {
    for (int y = -diff; y <= diff; y++)
    {
      vec2 offset = vec2(x, y) * sizeFactor;
      sum += texture2D(tex, tc + offset);
    }
  }

  return ((sum / (samples * samples)) + source) * colour;
}

// based on https://github.com/Jam3/glsl-fast-gaussian-blur/
vec4 blur(sampler2D tex, vec2 texCoord, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += texture2D(tex, texCoord) * 0.1964825501511404;
  color += texture2D(tex, texCoord + (off1 / resolution)) * 0.2969069646728344;
  color += texture2D(tex, texCoord - (off1 / resolution)) * 0.2969069646728344;
  color += texture2D(tex, texCoord + (off2 / resolution)) * 0.09447039785044732;
  color += texture2D(tex, texCoord - (off2 / resolution)) * 0.09447039785044732;
  color += texture2D(tex, texCoord + (off3 / resolution)) * 0.010381362401148057;
  color += texture2D(tex, texCoord - (off3 / resolution)) * 0.010381362401148057;
  return color;
}



void main (void) {

	vec4 diffuseTexColor = vec4(0.0);

		diffuseTexColor = texture2D(u_tex, v_texCoord);

			// this was meant a fade to Black with a gaussion blur of the fade to Black
			// discarded because of not looking good
			//gl_FragColor =	effect(vec4(0.14),u_tex,v_texCoord)*blur(u_tex, v_texCoord, vec2(1920, 1080), vec2(0,(1.0-fadeAlpha)*5.0))*vec4(1.0,1.0,1.0,fadeAlpha); //kawaseBloom(u_tex,v_texCoord,texturesize,5.0);//diffuseTexColor;

			gl_FragColor =	effect(vec4(0.14),u_tex,v_texCoord)*vec4(1.0,1.0,1.0,fadeAlpha);

}
