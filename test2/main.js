var gl = null;

const camera = {
    rotation: {
        x: 0,
        y: 0
    }
};

//scene graph nodes
var root = null;
var translateLight;
var rotateLight;
var lightNode;
var rotateNode;
var translate;
var textureNode;

var waterShaderProgram;


//textures
var waterReflectionColorTexture;
var waterRefractionColorTexture;
var waterReflectionDepthTexture;
var waterRefractionDepthTexture;

//Framebuffer
var waterReflectionFramebuffer;
var waterRefractionFramebuffer;

//settings
var waterHeight = 0;

//load the required resources using a utility function
loadResources({
    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_single: 'shader/simple.vs.glsl',
    fs_single: 'shader/simple.fs.glsl',
    vs_water: 'shader/water.vs.glsl',
    fs_water: 'shader/water.fs.glsl',
    waterPlane100_100: '../models/water300_300.obj',
    paper_model: '../models/Sun Glyder.obj',
    sunglyder_material: '../models/Sun Glyder/Sun_Glyder.mtl'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
    init(resources);

    render(0);
});

function init(resources) {
    //create a GL context
    gl = createContext(400, 400);

    gl.enable(gl.DEPTH_TEST);
    waterShaderProgram = createProgram(gl, resources.vs_water, resources.fs_water);

    initWaterReflectionFramebuffer();
    initWaterRefractionFramebuffer();
    //create scenegraph
    root = createSceneGraph(gl, resources);

}

function createSceneGraph(gl, resources) {
    //create root scenegraph
    const root = new ShaderSGNode(createProgram(gl, resources.vs_simple, resources.fs_simple));

    //light debug helper function
    function createLightSphere() {
        return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
            new RenderSGNode(makeSphere(.2,10,10))
        ]);
    }

    {
        //initialize light
        lightNode = new LightSGNode(); //use now framework implementation of light node
        lightNode.ambient = [0.2, 0.2, 0.2, 1];
        lightNode.diffuse = [0.8, 0.8, 0.8, 1];
        lightNode.specular = [1, 1, 1, 1];
        lightNode.position = [0, 0, 0];

        rotateLight = new TransformationSGNode(mat4.create());
        translateLight = new TransformationSGNode(glm.translate(0,-3,3)); //translating the light is the same as setting the light position

        rotateLight.append(translateLight);
        translateLight.append(lightNode);
        translateLight.append(createLightSphere()); //add sphere for debugging: since we use 0,0,0 as our light position the sphere is at the same position as the light source
        root.append(rotateLight);
    }

    {
        //initialize sunglyder
        let sunglyder = new MaterialSGNode([ //use now framework implementation of material node
            new RenderSGNode(resources.paper_model)
        ]);
        //gold
        sunglyder.ambient = [0.24725, 0.1995, 0.0745, 1];
        sunglyder.diffuse = [0.75164, 0.60648, 0.22648, 1];
        sunglyder.specular = [0.628281, 0.555802, 0.366065, 1];
        sunglyder.shininess = 0.7;

        rotateNode = new TransformationSGNode(mat4.create(), [
            new TransformationSGNode(glm.transform({ translate: [0,1, 0], rotateX : 180, scale: 0.01 }),  [
                sunglyder
            ])
        ]);
        root.append(rotateNode);
    }

    return root;
}

function render(){
    checkForWindowResize(gl);

    rotateNode.matrix = glm.rotateY(-1000);
    rotateLight.matrix = glm.rotateY(50);

    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //setup context and camera matrices
    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), 30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
    //very primitive camera implementation
    let lookAtMatrix = mat4.lookAt(mat4.create(), [0,-1,-4], [0,0,0], [0,1,0]);
    let mouseRotateMatrix = mat4.multiply(mat4.create(),
        glm.rotateX(camera.rotation.y),
        glm.rotateY(camera.rotation.x));
    context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);

    //get inverse view matrix to allow computing eye-to-light matrix
    context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

    //render scenegraph
    root.render(context);

    //animate
    requestAnimationFrame(render);
}

function initWaterReflectionFramebuffer(){
    var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
    if(!depthTextureExt) { alert('No depth texture support!!!'); return; }

    waterReflectionFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, waterReflectionFramebuffer);

    waterReflectionColorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waterReflectionColorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, waterReflectionColorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waterReflectionColorTexture, 0);

    waterReflectionDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waterReflectionDepthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, waterReflectionDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, canvasWidth, canvasHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, waterReflectionDepthTexture ,0);

    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
    {alert('Framebuffer incomplete!');}
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function initWaterRefractionFramebuffer(){
    waterRefractionFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, waterRefractionFramebuffer);

    waterRefractionColorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waterRefractionColorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waterRefractionColorTexture, 0);

    waterRefractionDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waterRefractionDepthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, waterRefractionDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, canvasWidth, canvasHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, waterRefractionDepthTexture ,0);

    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
    {alert('Framebuffer incomplete!');}
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function initWaveTexture(){
    waveTexture = gl.createTexture();
    waveImage = new Image();
    waveImage.onload = function(resources) { handleTextureLoaded(waveImage, waveTexture); }
    waveImage.src = '../textures/waterNormal2.jpg';
}
function initHeightMapTexture(){
    heightTexture = gl.createTexture();
    heightImage = new Image();
    heightImage.onload = function(resources) { handleTextureLoaded(heightImage, heightTexture); }
    heightImage.src = '../textures/waterHeightMap.jpg';
}
function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,gl.RGB,gl.UNSIGNED_BYTE , image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function createWater(gl, resources){

    var waterNode  = new ShaderSGNode(waterShaderProgram);
    let water = new RenderSGNode(resources.waterPlane100_100);
    waterNode .append(new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 1}), [
        water
    ]));
    return waterNode;
}

function enableAboveWaterClipping(shader){
    gl.useProgram(shader);
    gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),1);
    gl.uniform1i(gl.getUniformLocation(shader, 'clipHigher'), 0);
    gl.uniform1f(gl.getUniformLocation(shader, 'clipDistance'), waterHeight);
}
function disableWaterClipping(shader){
    gl.useProgram(shader);
    gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),0);
}
function enableUnderWaterClipping(shader){
    gl.useProgram(shader);
    gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),1);
    gl.uniform1i(gl.getUniformLocation(shader, 'clipHigher'), 1);
    gl.uniform1f(gl.getUniformLocation(shader, 'clipDistance'), waterHeight);
}

function RenderWaterRefractionTexture(context){
    gl.bindFramebuffer(gl.FRAMEBUFFER, waterRefractionFramebuffer);

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    enableUnderWaterClipping(singleShaderProgram);
    enableUnderWaterClipping(textureShaderProgram);
    enableUnderWaterClipping(skyBoxShaderProgram);
    gl.useProgram(textureShaderProgram);
    gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
    renderScene(context);
    disableWaterClipping(singleShaderProgram);
    disableWaterClipping(textureShaderProgram);
    disableWaterClipping(skyBoxShaderProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function RenderWaterReflectionTexture(){
    gl.bindFramebuffer(gl.FRAMEBUFFER, waterReflectionFramebuffer);

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0,0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), 30, canvasWidth / canvasHeight, 0.01, 100);

    let distance = cameraStartPos[1] - waterHeight;
    let reversedCameraPosition = [cameraStartPos[0],cameraStartPos[1] - distance * 2,cameraStartPos[2]];//Reverse the cameraheight for correct reflection
    let lookAtMatrix = mat4.lookAt(mat4.create(), reversedCameraPosition, [0,0,0], [0,1,0]);
    let mouseRotateMatrix = mat4.multiply(mat4.create(),
        glm.rotateX(-camera.rotation.y),//reverse cameratilt for correct reflection
        glm.rotateY(camera.rotation.x));
    context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);
    context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

    enableAboveWaterClipping(singleShaderProgram);
    enableAboveWaterClipping(textureShaderProgram);
    enableAboveWaterClipping(skyBoxShaderProgram);
    gl.useProgram(singleShaderProgram);
    gl.uniform3fv( gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),  reverseSunDirection);
    gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);
    gl.useProgram(textureShaderProgram);
    gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
    renderScene(context);
    disableWaterClipping(singleShaderProgram);
    disableWaterClipping(textureShaderProgram);
    disableWaterClipping(skyBoxShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function setUpWaterUniforms(timeInMilliseconds){
    gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_time'), timeInMilliseconds/1000.0);
    gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_sunDirection'), [1,1,0]);
    gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_sunColor'), [1,1,1]);
    gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_horizonColor'), [0.6,0.6,0.6]);
    gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_zenithColor'), [0.6,0.6,0.6]);
    gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_atmosphereDensity'), 0.000025);
    gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_fogDensity'), 0.003);
    gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_fogFalloff'), 20.0);
    gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_fogColor'), [0.8,0.8,0.9]);

}
function bindWaterTextures(){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waveTexture);
    gl.uniform1i(gl.getUniformLocation(waterShaderProgram, 'u_waveSampler'), 0);
    gl.activeTexture(gl.TEXTURE0+1);
    gl.bindTexture(gl.TEXTURE_2D, waterReflectionColorTexture);
    gl.uniform1i(gl.getUniformLocation(waterShaderProgram, 'u_reflectionSampler'), 1);
    gl.activeTexture(gl.TEXTURE0+2);
    gl.bindTexture(gl.TEXTURE_2D, waterRefractionColorTexture);
    gl.uniform1i(gl.getUniformLocation(waterShaderProgram, 'u_refractionSampler'), 2);
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_2D, heightTexture);
    gl.uniform1i(gl.getUniformLocation(waterShaderProgram, 'u_heightSampler'),3);
}
function unbindWaterTextures(){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0+1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0+2);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_2D, null);
}