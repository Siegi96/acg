/*
Our vertex shader is the meat of our particle effect implementation.

We start by taking our current clock time modulus the lifetime of the particle. This makes our particles restart from the beginning of their motion whenever their life expires.

We then position our particle at the location of our fire, plus the offset from this fire location, plus the velocity of the particle times the amount of time that has elapsed in it’s lifetime simulation.

vLifetime is a number between 1 and 0 that decreases as the particle ages. We to size our particle proportionally to its age. It starts off large but then shrinks as it ages.

After that, if billboarding is turned on, we get the camera’s up and right direction in world space. Since we know the up and right direction of the camera we know the plane that the camera is facing. We use the billboards center position,
the size of the billboard and the camera’s up and right vectors in order to position the current vertex along the plane that the camera is facing.

*/
uniform float uTime;
uniform vec3 uFirePos;
uniform float uSize;

attribute float aLifetime;
attribute vec2 aTextureCoords;
attribute vec2 aTriCorner;
attribute vec3 aCenterOffset;
attribute vec3 aVelocity;

uniform mat4 u_projection;
uniform mat4 u_modelView;

varying float vLifetime;
varying vec2 vTextureCoords;

void main (void) {
    float time = mod(uTime, aLifetime);

    vLifetime = 1.3 - (time / aLifetime);
    vLifetime = clamp(vLifetime, 0.0, 1.0);
    float size = (vLifetime * vLifetime) * uSize;

    vec3 velocity = aVelocity;
    vec4 position = vec4(uFirePos + aCenterOffset + (time * velocity), 1.0);
    vec3 cameraRight = vec3(u_modelView[0].x, u_modelView[1].x, u_modelView[2].x);
    vec3 cameraUp = vec3(u_modelView[0].y, u_modelView[1].y, u_modelView[2].y);

    position.xyz += (cameraRight * aTriCorner.x * size) + (cameraUp * aTriCorner.y * size);

    gl_Position = u_projection * u_modelView * position;

    vTextureCoords = aTextureCoords;
    vLifetime = aLifetime;
}















/*
uniform float uTime;
uniform vec3 uFirePos;
//uniform float uSize;

attribute float aLifetime;
attribute vec2 aTextureCoords;
attribute vec2 aTriCorner;
attribute vec3 aCenterOffset;
attribute vec3 aVelocity;

uniform mat4 u_projection;
uniform mat4 u_modelView;

//uniform bool uUseBillboarding;
//uniform bool uRepeating;

varying float vLifetime;
varying vec2 vTextureCoords;

void main (void) {
    //float time = uTime;
    float time = mod(uTime, aLifetime);
  /*  if (uRepeating) {
        time = mod(uTime, aLifetime);
    }

    vLifetime = 1.3 - (time / aLifetime);
    vLifetime = clamp(vLifetime, 0.0, 1.0);
    float size = (vLifetime * vLifetime) * uSize;

    vec3 velocity = aVelocity;*/
/*
    vec4 position = vec4(
        uFirePos + aCenterOffset + (time * aVelocity),
        1.0
    );

    vLifetime = 1.3 - (time / aLifetime);
    vLifetime = clamp(vLifetime, 0.0, 1.0);
    float size = (vLifetime * vLifetime) * 0.05;

        vec3 cameraRight = vec3(
            u_modelView[0].x, u_modelView[1].x, u_modelView[2].x
        );
        vec3 cameraUp = vec3(
            u_modelView[0].y, u_modelView[1].y, u_modelView[2].y
        );

        position.xyz += (cameraRight * aTriCorner.x * size) + (cameraUp * aTriCorner.y * size);


    gl_Position = u_projection * u_modelView * position;

    vTextureCoords = aTextureCoords;
    vLifetime = aLifetime;
}*/
