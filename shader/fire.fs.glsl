/*
As we simulate our particle our fragment shader calculates a number between 0 and ` called percentOfLife.
Based on the percentage of the particle’s life that has elapsed we choose one of the 16 textures in the texture atlas that we downloaded earlier.

Lastly we multiply gl_FragColor.a *= vLifetime;. This means that as vLifetime decreases the fragment fades away.
*/

precision mediump float;

uniform vec4 uColor;
uniform float uTimeFrag;

varying float vLifetime;
varying vec2 vTextureCoords;

uniform sampler2D u_particleAtlas;

void main (void) {
  float time = mod(uTimeFrag, vLifetime);
  float percentOfLife = time / vLifetime;
  percentOfLife = clamp(percentOfLife, 0.0, 1.0);

  float offset = floor(16.0 * percentOfLife);
  float offsetX = floor(mod(offset, 4.0)) / 4.0;
  float offsetY = 0.75 - floor(offset / 4.0) / 4.0;

  vec4 texColor = texture2D(u_particleAtlas, vec2((vTextureCoords.x / 4.0) + offsetX, (vTextureCoords.y / 4.0) + offsetY));
  gl_FragColor = uColor * texColor;

  gl_FragColor.a *= vLifetime;
}
