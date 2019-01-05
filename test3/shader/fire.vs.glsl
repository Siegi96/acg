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

uniform bool uUseBillboarding;
uniform bool uRepeating;

varying float vLifetime;
varying vec2 vTextureCoords;

void main (void) {
    float time = uTime;
    if (uRepeating) {
        time = mod(uTime, aLifetime);
    }

    vLifetime = 1.3 - (time / aLifetime);
    vLifetime = clamp(vLifetime, 0.0, 1.0);
    float size = (vLifetime * vLifetime) * uSize;

    vec3 velocity = aVelocity;

    vec4 position = vec4(
        uFirePos + aCenterOffset + (time * velocity),
        1.0
    );

    if (uUseBillboarding) {
        vec3 cameraRight = vec3(
            u_modelView[0].x, u_modelView[1].x, u_modelView[2].x
        );
        vec3 cameraUp = vec3(
            u_modelView[0].y, u_modelView[1].y, u_modelView[2].y
        );

        position.xyz += (cameraRight * aTriCorner.x * size) + (cameraUp * aTriCorner.y * size);
    } else {
        position.xy += aTriCorner.xy * size;
    }

    gl_Position = u_projection * u_modelView * position;

    vTextureCoords = aTextureCoords;
    vLifetime = aLifetime;
}
