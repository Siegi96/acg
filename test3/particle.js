class ParticleSystemNode {

    constructor(gl, resources) {
        this.shaderNode = null;
        this.vertexIndices = [];
        this.clockTime = 0;

        this.position = [1.0, 0.0, 0.0];
        this.color = [0.8, 0.25, 0.25, 1.0];
        this.size = 1000;
        this.duration = 1.0;
        this.repeat = false;
        this.lifetime = 1.0;
        this.numOfParticles = 500;

        this.sideVelocity = 0.05;
        this.upVelocity = 0.2;

        this.setPlayOnAwake(false);

        this.createParticleSystem(gl, resources);
    }

    createParticleSystem(gl, resources) {
        this.shaderNode = new ShaderSGNode(createProgram(gl, resources.vs_fire, resources.fs_fire));
    }

    createParticleValues(gl, resources) {
        var numParticles = 500
        var lifetimes = []
        var triCorners = []
        var texCoords = []
        var centerOffsets = []
        var velocities = []

        var triCornersCycle = [
            -1.0, -1.0,
            1.0, -1.0,
            1.0, 1.0,
            -1.0, 1.0
        ]
        var texCoordsCycle = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]

        for (var i = 0; i < this.numOfParticles; i++) {
            var lifetime = this.lifetime * Math.random()

            var diameterAroundCenter = this.size * 3.0;
            var halfDiameterAroundCenter = diameterAroundCenter / 2

            var xStartOffset = diameterAroundCenter *
                Math.random() - halfDiameterAroundCenter
            xStartOffset /= 3

            var yStartOffset = diameterAroundCenter *
                Math.random() - halfDiameterAroundCenter
            yStartOffset /= 10

            var zStartOffset = diameterAroundCenter *
                Math.random() - halfDiameterAroundCenter
            zStartOffset /= 3

            var upVelocity = this.upVelocity * Math.random()

            var xSideVelocity = this.sideVelocity * Math.random()
            if (xStartOffset > 0) {
                xSideVelocity *= -1
            }

            var zSideVelocity = this.sideVelocity * Math.random()
            if (zStartOffset > 0) {
                zSideVelocity *= -1
            }

            for (var j = 0; j < 4; j++) {
                lifetimes.push(lifetime)

                triCorners.push(triCornersCycle[j * 2])
                triCorners.push(triCornersCycle[j * 2 + 1])

                texCoords.push(texCoordsCycle[j * 2])
                texCoords.push(texCoordsCycle[j * 2 + 1])

                centerOffsets.push(xStartOffset)
                centerOffsets.push(yStartOffset + Math.abs(xStartOffset / 2.0))
                centerOffsets.push(zStartOffset)

                velocities.push(xSideVelocity)
                velocities.push(upVelocity)
                velocities.push(zSideVelocity)
            }

            this.vertexIndices = this.vertexIndices.concat([
                0, 1, 2, 0, 2, 3
            ].map(function (num) { return num + 4 * i }))
        }

        // Create WebGL buffers
        this.lifetimeBuffer = this.createBuffer('ARRAY_BUFFER', Float32Array, lifetimes)
        this.texCoordBuffer = this.createBuffer('ARRAY_BUFFER', Float32Array, texCoords)
        this.triCornerBuffer = this.createBuffer('ARRAY_BUFFER', Float32Array, triCorners)
        this.centerOffsetBuffer = this.createBuffer('ARRAY_BUFFER', Float32Array, centerOffsets)
        this.velocityBuffer = this.createBuffer('ARRAY_BUFFER', Float32Array, velocities)
        this.createBuffer('ELEMENT_ARRAY_BUFFER', Uint16Array, this.vertexIndices)

        this.setupParticleProgram();

        // Create particles texture
        var particleTextureNode = new TextureSGNode(resources.texture_fire, 0, 'u_particleAtlas', new RenderSGNode(makeRect(1.0, 1.0, this.vertexIndices)));
        particleTextureNode.init(gl);
        this.shaderNode.append(particleTextureNode);
    }

    createBuffer (bufferType, DataType, data) {
        var buffer = gl.createBuffer()
        gl.bindBuffer(gl[bufferType], buffer)
        gl.bufferData(gl[bufferType], new DataType(data), gl.STATIC_DRAW)
        return buffer
    }

    setupParticleProgram() {
        gl.useProgram(this.shaderNode.program);
        var lifetimeAttrib = gl.getAttribLocation(
            this.shaderNode.program, 'aLifetime'
        )
        var texCoordAttrib = gl.getAttribLocation(
            this.shaderNode.program, 'aTextureCoords'
        )
        var triCornerAttrib = gl.getAttribLocation(
            this.shaderNode.program, 'aTriCorner'
        )
        var centerOffsetAttrib = gl.getAttribLocation(
            this.shaderNode.program, 'aCenterOffset'
        )
        var velocityAttrib = gl.getAttribLocation(
            this.shaderNode.program, 'aVelocity'
        )
        gl.enableVertexAttribArray(lifetimeAttrib)
        gl.enableVertexAttribArray(texCoordAttrib)
        gl.enableVertexAttribArray(triCornerAttrib)
        gl.enableVertexAttribArray(centerOffsetAttrib)
        gl.enableVertexAttribArray(velocityAttrib)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lifetimeBuffer);
        gl.vertexAttribPointer(lifetimeAttrib, 1, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triCornerBuffer);
        gl.vertexAttribPointer(triCornerAttrib, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.centerOffsetBuffer);
        gl.vertexAttribPointer(centerOffsetAttrib, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.vertexAttribPointer(velocityAttrib, 3, gl.FLOAT, false, 0, 0)
    }

    setPosition(position) {
        this.position = position;
    }

    setColor(color) {
        this.color = color;
    }

    setDuration(duration) {
        this.duration = duration;
    }

    setRepeat(repeat) {
        this.repeat = repeat;
    }

    setPlayOnAwake(play) {
        if (!play) {
            this.clockTime = 1000;
        }
    }

    setSize(size) {
        this.size = size;
    }

    setLifetime(lifetime) {
        this.lifetime = lifetime;
    }

    setNumOfParticles(num) {
        this.numOfParticles = num;
    }

    play() {
        this.clockTime = 0;
    }

    render(delta, context) {

        var gl = context.gl;

        this.clockTime += delta / 1000;
        /*if (this.repeat && this.clockTime > this.duration) {
            this.clockTime = 0;
        }*/

        this.setupParticleProgram();

        // Disable to get particle system to work
        gl.depthMask(false);

        // Additive blending
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.uniform1f(gl.getUniformLocation(this.shaderNode.program, 'uTime'), this.clockTime);
        gl.uniform1f(gl.getUniformLocation(this.shaderNode.program, 'uTimeFrag'), this.clockTime);
        gl.uniform1i(gl.getUniformLocation(this.shaderNode.program, 'uUseBillboarding'), true);
        gl.uniform1i(gl.getUniformLocation(this.shaderNode.program, 'uRepeating'), this.repeat);

        gl.uniform3fv(gl.getUniformLocation(this.shaderNode.program, 'uFirePos'), this.position);
        gl.uniform4fv(gl.getUniformLocation(this.shaderNode.program, 'uColor'), this.color);
        gl.uniform1f(gl.getUniformLocation(this.shaderNode.program, 'uSize'), this.size);
        this.shaderNode.render(context);
    }
}
