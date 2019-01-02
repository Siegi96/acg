var gl = null;

const camera = {
    rotation: {
        x: 0,
        y: 0
    }
};

//camera perspective
let eye = [-60,23.5,87];
let center = [-60,18,80];

//plane perspective
let planeX = -60;
let planeY = 18;
let planeZ = 80;
let planeRotateY = 0;

let helisize = 0.1;


//scene graph nodes
var root = null;
var translateLight;
var rotateLight;
var lightNode;
var heliNode;
var heliRotorNode;
var heliSecondRotorNode;
var translate;
var textureNode;


// shader
var singleShaderProgram;
var textureShaderProgram;
var waterShaderProgram;
var skyboxShaderProgram;

// water
var waterScene;

var waterReflectionFramebuffer;
var waterReflectionColorTexture;
var waterReflectionDepthTexture;
var waterRefractionFramebuffer;
var waterRefractionColorTexture;
var waterRefractionDepthTexture;

var waveImage;
var waveTexture;
var heightImage;
var heightTexture;

// settings
var canvasWidth = 1200;
var canvasHeight = 675;

var cameraStartPos = [0,-10,-10];

var waterHeight = 0;


//Lights
var reverseSunDirection = [0.5, 0.7, 1];


//textures
var textures;

//statue

//load the required resources using a utility function
loadResources({
    // cubemap shader
    vs_env: 'shader/envmap.vs.glsl',
    fs_env: 'shader/envmap.fs.glsl',

    // water shader
    vs_water: 'shader/water.vs.glsl',
    fs_water: 'shader/water.fs.glsl',

    // single shader
    vs_single: 'shader/single.vs.glsl',
    fs_single: 'shader/single.fs.glsl',

    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_texture: 'shader/texture.vs.glsl',
    fs_texture: 'shader/texture.fs.glsl',

    heli_model: '../models/heli/heli.obj',
    heli_main_rotor: '../models/heli/main_rotor.obj',
    heli_tex: '../models/heli/fuselage.jpg',

    scan: '../models/hasi.obj',
    scan_tex: '../textures/boat_texture.jpg',

    scan2: '../models/hasi.obj',
    scan2_tex: '../textures/boat_texture.jpg',

    scan3: '../models/hasi.obj',
    scan3_tex: '../textures/boat_texture.jpg',

    // boat
    model_yacht: '../models/Yacht.obj',
    texture_yacht: '../textures/boat_texture.jpg',

    // water
    waterPlane100_100: '../models/water300_300.obj',



// cubemap images
  env_pos_x: '../textures/mountains/px.jpg',
  env_neg_x: '../textures/mountains/nx.jpg',
  env_pos_y: '../textures/mountains/py.jpg',
  env_neg_y: '../textures/mountains/ny.jpg',
  env_pos_z: '../textures/mountains/pz.jpg',
  env_neg_z: '../textures/mountains/nz.jpg',

}).then(function (resources) { //an object containing our keys with the loaded resources/) {
    init(resources);

    render(0);
});

function init(resources) {

    //create a GL context
    gl = createContext(400, 400);

    // ??
    gl.enable(gl.DEPTH_TEST);

    // create shader programs
    singleShaderProgram = createProgram(gl, resources.vs_single, resources.fs_single);
    skyboxShaderProgram = createProgram(gl, resources.vs_env, resources.fs_env);
    textureShaderProgram = createProgram(gl,resources.vs_texture, resources.fs_texture);
    waterShaderProgram = createProgram(gl, resources.vs_water, resources.fs_water);

    // init skybox
    cubemap =  [resources.env_pos_x, resources.env_neg_x, resources.env_pos_y, resources.env_neg_y, resources.env_pos_z, resources.env_neg_z,false]
    initCubeMap(resources,cubemap);

    // init water
    initWaterReflectionFramebuffer();
    initWaterRefractionFramebuffer();
    initWaveTexture();
    initHeightMapTexture();

    // init interaction
    initInteraction(gl.canvas);

    //create scenegraph
    root = createSceneGraph(gl, resources);
}



function createWater(gl, resources){

  var waterShaderNode  = new ShaderSGNode(waterShaderProgram);
  let waterRenderNode = new RenderSGNode(resources.waterPlane100_100);
  waterShaderNode.append(new TransformationSGNode(glm.transform({ translate: [0,0,0], scale: 1.5}), [waterRenderNode]));
  return waterShaderNode;
}

function createSceneGraph(gl, resources) {

  // create root node
  const root = new ShaderSGNode(textureShaderProgram);

  // create water node

  waterScene = createWater(gl,resources);

  {
    let waterShaderNode = new ShaderSGNode(waterShaderProgram);
    let waterRenderNode = new RenderSGNode(resources.waterPlane100_100);
    let waterTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 1.5}), [waterRenderNode])
    waterShaderNode.append(waterTransformationNode);
    root.append(waterShaderNode);
  }

  // create skybox node

  {
    let skyboxShaderNode = new ShaderSGNode(skyboxShaderProgram);
    let skyboxEnvironmentNode = new EnvironmentSGNode(envcubetexture,4,false,false,false, new RenderSGNode(makeSphere(120)));
    skyboxShaderNode.append(skyboxEnvironmentNode);
    root.append(skyboxShaderNode);
  }


    //create root scenegraph

    textures = {heli: resources.heli_tex, marmor: resources.scan_tex};


    {
        //initialize light
        lightNode = new LightSGNode(); //use now framework implementation of light node
        lightNode.ambient = [0.2, 0.2, 0.2, 1];
        lightNode.diffuse = [0.8, 0.8, 0.8, 1];
        lightNode.specular = [1, 1, 1, 1];
        lightNode.position = [0, 0, 0];

        rotateLight = new TransformationSGNode(mat4.create());
        translateLight = new TransformationSGNode(glm.translate(-300,500,400)); //translating the light is the same as setting the light position

        rotateLight.append(translateLight);
        translateLight.append(lightNode);
        root.append(rotateLight);
    }

    {
        let scanTexture = new TextureSGNode(textures.marmor, 0, 'u_diffuseTex',new RenderSGNode(resources.scan));

        let scanMaterial = new MaterialSGNode( scanTexture);
        //gold
        scanMaterial.ambient = [0.0, 0.0, 0.0, 1];
        scanMaterial.diffuse = [0.25, 0.13, 0.1, 1];
        scanMaterial.specular = [0.5, 0.5, 0.5, 1];
        scanMaterial.shininess = 4.0;

        let scanNode = new TransformationSGNode(glm.transform({ translate: [58,11,60], rotateY: 5, rotateX : 272, rotateZ: 90, scale: 0.05 }),  [
            scanMaterial
        ]);
        root.append(scanNode);
    }

    {
        let scanTexture = new TextureSGNode(textures.marmor, 0, 'u_diffuseTex',new RenderSGNode(resources.scan2));

        let scanMaterial = new MaterialSGNode( scanTexture);
        //gold
        scanMaterial.ambient = [0.0, 0.0, 0.0, 1];
        scanMaterial.diffuse = [0.25, 0.13, 0.1, 1];
        scanMaterial.specular = [0.5, 0.5, 0.5, 1];
        scanMaterial.shininess = 4.0;

        let scanNode = new TransformationSGNode(glm.transform({ translate: [73,11,10], rotateY: 5 ,rotateX : 272, rotateZ: 90, scale: 0.05 }),  [
            scanMaterial
        ]);
        root.append(scanNode);
    }

    {
        let scanTexture = new TextureSGNode(textures.marmor, 0, 'u_diffuseTex',new RenderSGNode(resources.scan3));

        let scanMaterial = new MaterialSGNode( scanTexture);
        //gold
        scanMaterial.ambient = [0.0, 0.0, 0.0, 1];
        scanMaterial.diffuse = [0.25, 0.13, 0.1, 1];
        scanMaterial.specular = [0.5, 0.5, 0.5, 1];
        scanMaterial.shininess = 4.0;

        let scanNode = new TransformationSGNode(glm.transform({ translate: [65,11,35], rotateY: 5, rotateX : 272, rotateZ: 90, scale: 0.05 }),  [
            scanMaterial
        ]);
        root.append(scanNode);
    }


    {
        let textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.heli_model));

        let heli = new MaterialSGNode( textureNode);
        //gold
        heli.ambient = [0.0, 0.0, 0.0, 1];
        heli.diffuse = [0.25, 0.13, 0.1, 1];
        heli.specular = [0.5, 0.5, 0.5, 1];
        heli.shininess = 4.0;

        heliNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: helisize }),  [
            heli
        ]);
        root.append(heliNode);
    }

    {
        let textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.heli_main_rotor));

        let heli_rotor = new MaterialSGNode( textureNode);
        //gold
        heli_rotor.ambient = [0.0, 0.0, 0.0, 1];
        heli_rotor.diffuse = [0.25, 0.13, 0.1, 1];
        heli_rotor.specular = [0.5, 0.5, 0.5, 1];
        heli_rotor.shininess = 4.0;

        heliRotorNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: helisize }),  [
            heli_rotor
        ]);
        root.append(heliRotorNode);
    }

    {
        var yachtTextureNode = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex', new RenderSGNode(resources.model_yacht));
        let yachtMaterialNode = new MaterialSGNode(yachtTextureNode);

        yachtMaterialNode.ambient = [0.0, 0.0, 0.0, 1];
        yachtMaterialNode.diffuse = [0.25, 0.13, 0.1, 1];
        yachtMaterialNode.specular = [0.5, 0.5, 0.5, 1];
        yachtMaterialNode.shininess = 4.0;

        var yachtTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,2, 0], scale: 0.1 }),  [yachtMaterialNode]);
        root.append(yachtTransformationNode);
      }

    return root;
}

function render(timeInMilliSeconds){
    checkForWindowResize(gl);

    RenderWaterReflectionTexture();

    drivePlane(timeInMilliSeconds);

    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //setup context and camera matrices
    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), 30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 200);
    //very primitive camera implementation
    let lookAtMatrix = mat4.lookAt(mat4.create(), eye, center, [0,-1,0]);
    let mouseRotateMatrix = mat4.multiply(mat4.create(),
        glm.rotateX(camera.rotation.y),
        glm.rotateY(camera.rotation.x));
    context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);

    //get inverse view matrix to allow computing eye-to-light matrix
    context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //get inverse view matrix to allow computing eye-to-light matrix
    context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

    RenderWaterRefractionTexture(context);

    gl.useProgram(singleShaderProgram);
    gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);
    gl.uniform3fv( gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),reverseSunDirection);
    gl.useProgram(textureShaderProgram);
    gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);


    //render scenegraph
    root.render(context);


    gl.useProgram(waterShaderProgram);
    setUpWaterUniforms(timeInMilliSeconds);
    bindWaterTextures();

    waterScene.render(context);

    unbindWaterTextures();



    //animate
    requestAnimationFrame(render);
}

//camera control
function initInteraction(canvas) {
    const mouse = {
        pos: { x : 0, y : 0},
        leftButtonDown: false
    };
    function toPos(event) {
        //convert to local coordinates
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    canvas.addEventListener('mousedown', function(event) {
        mouse.pos = toPos(event);
        mouse.leftButtonDown = event.button === 0;
    });
    canvas.addEventListener('mousemove', function(event) {
        const pos = toPos(event);
        const delta = { x : mouse.pos.x - pos.x, y: mouse.pos.y - pos.y };
        if (mouse.leftButtonDown) {
            //add the relative movement of the mouse to the rotation variables
            camera.rotation.x += delta.x;
            camera.rotation.y += delta.y;
        }
        mouse.pos = pos;
    });
    canvas.addEventListener('mouseup', function(event) {
        mouse.pos = toPos(event);
        mouse.leftButtonDown = false;
    });
    //register globally
    document.addEventListener('keypress', function(event) {
        //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
        if (event.code === 'KeyR') {
            camera.rotation.x = 0;
            camera.rotation.y = 0;
        }
        if (event.code === 'KeyM') {
            //enable/disable mipmapping
            globalSettings.useMipmapping = !globalSettings.useMipmapping;
            toggleMipmapping( globalSettings.useMipmapping );
        }
        if (event.code === 'KeyA') {
            //enable/disable anisotropic filtering (only visible in combination with mipmapping)
            globalSettings.useAnisotropicFiltering = !globalSettings.useAnisotropicFiltering;
            toggleAnisotropicFiltering( globalSettings.useAnisotropicFiltering );
        }
    });
}


function initCubeMap(resources,env_imgs) {
  //create the texture
  envcubetexture = gl.createTexture();
  //define some texture unit we want to work on
  gl.activeTexture(gl.TEXTURE0);
  //bind the texture to the texture unit
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envcubetexture);
  //set sampling parameters
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.MIRRORED_REPEAT); //will be available in WebGL 2
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //set correct image for each side of the cube map
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, env_imgs[6]);//flipping required for our skybox, otherwise images don't fit together
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[5]);
  //generate mipmaps (optional)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  //unbind the texture again
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

//a scene graph node for setting environment mapping parameters
class EnvironmentSGNode extends SGNode {

  constructor(envtexture, textureunit, doReflect, doRefract, useFresnel, children ) {
      super(children);
      this.envtexture = envtexture;
      this.textureunit = textureunit;
      this.doReflect = doReflect;
      this.doRefract = doRefract;
      this.useFresnel = useFresnel;
      this.n2 = 1.55; // glass
      this.n1 = 1.0;  // air
  }

  render(context)
  {
    //set additional shader parameters
    let invView3x3 = mat3.fromMat4(mat3.create(), context.invViewMatrix); //reduce to 3x3 matrix since we only process direction vectors (ignore translation)
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_invView3x3'), false, invView3x3);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_texCube'), this.textureunit);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useReflection'), this.doReflect);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useRefraction'), this.doRefract);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useFresnel'), this.useFresnel);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_refractionEta'), this.n1/this.n2);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_fresnelR0'), Math.pow((this.n1-this.n2)/(this.n1+this.n2),2));


    //activate and bind texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.envtexture);

    //render children
    super.render(context);

    //clean up
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}



///////////////////////////////////////////////////////////////////
// WATER /////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////

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

function enableAboveWaterClipping(shader){
  gl.useProgram(shader);
  gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),1);
  gl.uniform1i(gl.getUniformLocation(shader, 'clipHigher'), 0);
  gl.uniform1f(gl.getUniformLocation(shader, 'clipDistance'), waterHeight);
}

function enableUnderWaterClipping(shader){
  gl.useProgram(shader);
  gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),1);
  gl.uniform1i(gl.getUniformLocation(shader, 'clipHigher'), 1);
  gl.uniform1f(gl.getUniformLocation(shader, 'clipDistance'), waterHeight);
}


function disableWaterClipping(shader){
  gl.useProgram(shader);
  gl.uniform1i(gl.getUniformLocation(shader, 'enableClipping'),0);
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
  //enableAboveWaterClipping(skyBoxShaderProgram);
  gl.useProgram(singleShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),  reverseSunDirection);
  gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);
  gl.useProgram(textureShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  root.render(context);
  disableWaterClipping(singleShaderProgram);
  disableWaterClipping(textureShaderProgram);
  //disableWaterClipping(skyBoxShaderProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function RenderWaterRefractionTexture(context){
  gl.bindFramebuffer(gl.FRAMEBUFFER, waterRefractionFramebuffer);

  gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  enableUnderWaterClipping(singleShaderProgram);
  enableUnderWaterClipping(textureShaderProgram);
  //enableUnderWaterClipping(skyBoxShaderProgram);
  gl.useProgram(textureShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  root.render(context);
  disableWaterClipping(singleShaderProgram);
  disableWaterClipping(textureShaderProgram);
  //disableWaterClipping(skyBoxShaderProgram);

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


function drivePlane(timeInMilliSeconds) {
    let buffer = 10000;
    let keyframe1 = 15000;
    let keyframe2 = 18500;
    let keyframe3 = 20000;
    let keyframe4 = 29000;
    let keyframe5 = 32000; //first turn
    let keyframe6 = 35000;
    let keyframe7 = 36000;
    let keyframe8 = 45000;
    let keyframe9 = 48000; //second turn
    let keyframe10 = 51000;
    let keyframe11 = 52000;
    let keyframe12 = 61000;
    let keyframe13 = 64000; //third turn
    let keyframe14 = 67000;
    let keyframe15 = 68000;
    let keyframe16 = 77000;
    let keyframe17 = 81000; //fourth turn
    let keyframe18 = 86000;
    let keyframe19 = 87000;
    let keyframe20 = 91500;
    let keyframe21 = 95000; //fifth (half) turn
    let keyframe22 = 106000;
    let keyframe23 = 109000;
    let keyframe24 = 114000;
    let keyframe25 = 119000;
    let keyframe26 = 127000;
    let keyframe27 = 133000;
    let keyframe28 = 137000;
    let keyframe29 = 143000;
    let keyframe30 = 150000;

    if(timeInMilliSeconds > buffer) {
        if (timeInMilliSeconds < keyframe1) {
            let percent = calcProzent(timeInMilliSeconds - buffer, keyframe1 - buffer);
            eye[1] = lerp(23.5, 18.5, percent);
            eye[2] = lerp(87, 77, percent);
            planeZ = lerp(80, 75, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe2) {
            let percent = calcProzent(timeInMilliSeconds - keyframe1, (keyframe2 - keyframe1));
            planeZ = (lerp(75, 64.5, percent));
            eye[2] = planeZ + 2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe3) {
            let percent = calcProzent(timeInMilliSeconds - keyframe2, (keyframe3 - keyframe2));
            planeZ = (lerp(64.5, 60, percent));
            planeRotateY = lerp(0, -5, percent);
            eye[2] = planeZ + 2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe4) {
            let percent = calcProzent(timeInMilliSeconds - keyframe3, (keyframe4 - keyframe3));
            planeX = lerp(-60, -31, percent);
            planeZ = lerp(60, 31, percent);
            planeRotateY = lerp(-5, -75, percent);
            eye[0] = lerp(-60, -31, percent);
            eye[2] = lerp(62, 35, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe5) {
            let percent = calcProzent(timeInMilliSeconds - keyframe4, (keyframe5 - keyframe4));
            planeX = lerp(-31, -25, percent);
            planeZ = lerp(31, 25, percent);
            planeRotateY = lerp(-75, -90, percent);
            eye[0] = lerp(-31, -27, percent);
            eye[2] = lerp(35, 25, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe6) {
            let percent = calcProzent(timeInMilliSeconds - keyframe5, (keyframe6 - keyframe5));
            planeX = lerp(-25, -13.5, percent);
            eye[0] = planeX-2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe7) {
            let percent = calcProzent(timeInMilliSeconds - keyframe6, (keyframe7 - keyframe6));
            planeX = lerp(-13.5, -10, percent);
            planeRotateY = lerp(-90, -85, percent);
            eye[0] = planeX-2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe8) {
            let percent = calcProzent(timeInMilliSeconds - keyframe7, (keyframe8 - keyframe7));
            planeX = lerp(-10, 19, percent);
            planeZ = lerp(25, -4, percent);
            planeRotateY = lerp(-85, -15, percent);
            eye[0] = lerp(-12, 15, percent);
            eye[2] = lerp(25, -4, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe9) {
            let percent = calcProzent(timeInMilliSeconds - keyframe8, (keyframe9 - keyframe8));
            planeX = lerp(19, 25, percent);
            planeZ = lerp(-4, -10, percent);
            planeRotateY = lerp(-15, 0, percent);
            eye[0] = lerp(15, 25, percent);
            eye[2] = lerp(-4, -8, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe10) {
            let percent = calcProzent(timeInMilliSeconds - keyframe9, (keyframe10 - keyframe9));
            planeZ = lerp(-10, -21.5, percent);
            eye[2] = planeZ+2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe11) {
            let percent = calcProzent(timeInMilliSeconds - keyframe10, (keyframe11 - keyframe10));
            planeZ = lerp(-21.5, -25, percent);
            planeRotateY = lerp(0, 5, percent);
            eye[2] = planeZ+2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe12) {
            let percent = calcProzent(timeInMilliSeconds - keyframe11, (keyframe12 - keyframe11));
            planeX = lerp(25, -4, percent);
            planeZ = lerp(-25, -54, percent);
            planeRotateY = lerp(5, 75, percent);
            eye[0] = lerp(25, -4, percent);
            eye[2] = lerp(-23, -50, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe13) {
            let percent = calcProzent(timeInMilliSeconds - keyframe12, (keyframe13 - keyframe12));
            planeX = lerp(-4, -10, percent);
            planeZ = lerp(-54, -60, percent);
            planeRotateY = lerp(75, 90, percent);
            eye[0] = lerp(-4, -8, percent);
            eye[2] = lerp(-50, -60, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe14) {
            let percent = calcProzent(timeInMilliSeconds - keyframe13, (keyframe14 - keyframe13));
            planeX = lerp(-10, -21.5, percent);
            eye[0] = planeX+2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe15) {
            let percent = calcProzent(timeInMilliSeconds - keyframe14, (keyframe15 - keyframe14));
            planeX = lerp(-21.5, -25, percent);
            planeRotateY = lerp(90, 95, percent);
            eye[0] = planeX+2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe16) {
            let percent = calcProzent(timeInMilliSeconds - keyframe15, (keyframe16 - keyframe15));
            planeX = lerp(-25, -54, percent);
            planeZ = lerp(-60, -31, percent);
            planeRotateY = lerp(95, 165, percent);
            eye[0] = lerp(-23, -50, percent);
            eye[2] = lerp(-60, -31, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe17) {
            let percent = calcProzent(timeInMilliSeconds - keyframe16, (keyframe17 - keyframe16));
            planeX = lerp(-54, -60, percent);
            planeZ = lerp(-31, -25, percent);
            planeRotateY = lerp(165, 180, percent);
            eye[0] = lerp(-50, -60, percent);
            eye[2] = lerp(-31, -27, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe18) {
            let percent = calcProzent(timeInMilliSeconds - keyframe17, (keyframe18 - keyframe17));
            planeZ = lerp(-25, 2.5, percent);
            eye[2] = planeZ-2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe19) {
            let percent = calcProzent(timeInMilliSeconds - keyframe18, (keyframe19 - keyframe18));
            planeZ = lerp(2.5, 6, percent);
            planeRotateY = lerp(180, 185, percent);
            eye[2] = planeZ-2;
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe20) {
            let percent = calcProzent(timeInMilliSeconds - keyframe19, (keyframe20 - keyframe19));
            planeX = lerp(-60, -47, percent);
            planeZ = lerp(6, 19, percent);
            planeRotateY = lerp(185, 215, percent);
            eye[0] = lerp(-60, -47, percent);
            eye[2] = lerp(4, 15, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe21) {
            let percent = calcProzent(timeInMilliSeconds - keyframe20, (keyframe21-keyframe20));
            planeX = lerp(-47, -43, percent);
            planeZ = lerp(19, 23, percent);
            planeRotateY = lerp(215, 225, percent);
            eye[0] = lerp(-47, -44, percent);
            eye[2] = lerp(15, 22, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe22) {
            let percent = calcProzent(timeInMilliSeconds - keyframe21, (keyframe22 - keyframe21));
            planeX = lerp(-43, -14, percent);
            planeZ = lerp(23, 52, percent);
            eye[0] = lerp(-44, -15, percent);
            eye[2] = lerp(22, 51, percent);
            center = [planeX, planeY, planeZ];
        }
        else if (timeInMilliSeconds < keyframe23) {
            let percent = calcProzent(timeInMilliSeconds - keyframe22, (keyframe23 - keyframe22));
            planeX = lerp(-14, -6, percent);
            planeZ = lerp(52, 60, percent);
            eye[0] = lerp(-15, -5, percent);
            eye[2] = lerp(51, 52, percent);
            let centerX = lerp(-14, 2, percent);
            let centerZ = lerp(52, 54, percent);
            center = [centerX, planeY, centerZ];
        }
        else if (timeInMilliSeconds < keyframe24) {
            let percent = calcProzent(timeInMilliSeconds - keyframe23, (keyframe24 - keyframe23));
            planeX = lerp(-6, 14, percent);
            planeZ = lerp(60, 80, percent);
            eye[0] = lerp(-5, 12, percent);
            eye[2] = lerp(52, 54.5, percent);
            let centerX = lerp(2, 30, percent);
            let centerZ = lerp(54, 57, percent);
            center = [centerX, planeY, centerZ];
        }
        else if (timeInMilliSeconds < keyframe25) {
            let percent = calcProzent(timeInMilliSeconds - keyframe24, (keyframe25 - keyframe24));
            planeX = lerp(20, 40, percent);
            planeZ = lerp(80, 120, percent);
            eye[0] = lerp(12, 29, percent);
            eye[2] = lerp(54.5, 57, percent);
            let centerX = lerp(30, 58, percent);
            let centerZ = lerp(57, 60, percent);
            let centerY = lerp(18, 11, percent);
            center = [centerX, centerY, centerZ];
        }
        else if (timeInMilliSeconds < keyframe26) {
            let percent = calcProzent(timeInMilliSeconds - keyframe25, (keyframe26 - keyframe25));
            let centerX = lerp(58, 73, percent);
            let centerZ = lerp(60, 10, percent);
            eye[0] = lerp(29, 44, percent);
            eye[2] = lerp(57, 9, percent);
            center = [centerX, 11, centerZ];
        }
        else if (timeInMilliSeconds < keyframe27) {
            let percent = calcProzent(timeInMilliSeconds - keyframe26, (keyframe27 - keyframe26));
            eye[0] = lerp(44, 70, percent);
            eye[2] = lerp(9, -19, percent);
        }
        else if (timeInMilliSeconds < keyframe28) {
            let percent = calcProzent(timeInMilliSeconds - keyframe27, (keyframe28 - keyframe27));
            eye[0] = lerp(70, 58, percent);
            eye[1] = lerp(18.5, 5, percent);
            eye[2] = lerp(-19, -35, percent);
        }
        else if (timeInMilliSeconds < keyframe29) {
            let percent = calcProzent(timeInMilliSeconds - keyframe28, (keyframe29 - keyframe28));
            eye[0] = lerp(58, 42, percent);
            eye[2] = lerp(-35, -65, percent);
        }
        else if (timeInMilliSeconds < keyframe30) {
            let percent = calcProzent(timeInMilliSeconds - keyframe29, (keyframe30 - keyframe29));
            eye[0] = lerp(42, 16, percent);
            eye[1] = lerp(5, 30, percent);
            eye[2] = lerp(-65, -95, percent);
        }
    }

    heliNode.matrix = glm.transform({translate: [planeX, planeY, planeZ], rotateX : -90, rotateZ: planeRotateY, scale: helisize});
    heliRotorNode.matrix = glm.transform({translate: [planeX,planeY, planeZ], rotateX : -90, scale: 1, rotateZ: timeInMilliSeconds*timeInMilliSeconds, scale: helisize});
}

function calcProzent(timeInMilliseconds, keyFrame){
    return timeInMilliseconds/keyFrame;
}

function lerp(a, b, n) {
    return (1 - n) * a + n * b;
}

