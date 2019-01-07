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
var heliTransformationNode;
var rotorTransformationNode;
var translate;
var yacht1TransformationNode;
var yacht2TransformationNode;
var yacht3TransformationNode;


// shader
var fireShaderProgram;
var singleShaderProgram;
var skyboxShaderProgram;
var textureShaderProgram;
var waterShaderProgram;

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

// fire
var lastTimeMillis = 0;
var clockTime = 0;
var color = [0.8, 0.25, 0.25, 1.0];
var position = [2.0, 1.5, 2.0];
var size = 2.5;

// Create WebGL buffers
var lifetimeBuffer = null;
var texCoordBuffer = null;
var triCornerBuffer = null;
var centerOffsetBuffer = null;
var velocityBuffer = null;


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

    // fire shader
    vs_fire: 'shader/fire.vs.glsl',
    fs_fire: 'shader/fire.fs.glsl',

    // cubemap shader
    vs_skybox: 'shader/skybox.vs.glsl',
    fs_skybox: 'shader/skybox.fs.glsl',

    // water shader
    vs_water: 'shader/water.vs.glsl',
    fs_water: 'shader/water.fs.glsl',

    // single shader
    vs_single: 'shader/single.vs.glsl',
    fs_single: 'shader/single.fs.glsl',

    // texture shader
    vs_texture: 'shader/texture.vs.glsl',
    fs_texture: 'shader/texture.fs.glsl',

    heli_model: '../models/heli/heli.obj',
    heli_main_rotor: '../models/heli/main_rotor.obj',
    heli_tex: '../models/heli/fuselage.jpg',

    sophie: '../models/sophie.obj',
    chrisi: '../models/chrisi.obj',
    siegi: '../models/siegi.obj',

    // boat
    model_yacht: '../models/Yacht.obj',
    texture_yacht: '../textures/boat_texture.jpg',

    // water
    model_water: '../models/water.obj',
    texture_water: '../textures/waterTexture.png',

    model_bowl: '../models/fire_bowl.obj',

    // fire
    texture_fire: '../textures/fire.jpg',

    // skybox images
    skybox_pos_x: '../textures/mountains/px.jpg',
    skybox_neg_x: '../textures/mountains/nx.jpg',
    skybox_pos_y: '../textures/mountains/py.jpg',
    skybox_neg_y: '../textures/mountains/ny.jpg',
    skybox_pos_z: '../textures/mountains/pz.jpg',
    skybox_neg_z: '../textures/mountains/nz.jpg',

}).then(function (resources) {

    init(resources);
    render(0);
});

function init(resources) {

    //create a GL context
    gl = createContext(400, 400);

    // ??
    gl.enable(gl.DEPTH_TEST);

    // create shader programs
    fireShaderProgram = createProgram(gl, resources.vs_fire, resources.fs_fire);
    singleShaderProgram = createProgram(gl, resources.vs_single, resources.fs_single);
    skyboxShaderProgram = createProgram(gl, resources.vs_skybox, resources.fs_skybox);
    textureShaderProgram = createProgram(gl,resources.vs_texture, resources.fs_texture);
    waterShaderProgram = createProgram(gl, resources.vs_water, resources.fs_water);

    // init skybox
    let cubemap =  [resources.skybox_pos_x, resources.skybox_neg_x, resources.skybox_pos_y, resources.skybox_neg_y, resources.skybox_pos_z, resources.skybox_neg_z,false]
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

    // ??
    gl.enable(gl.BLEND);
}
let bowlNode;
function createSceneGraph(gl, resources) {
  // create root node
  const root = new ShaderSGNode(textureShaderProgram);

  // create water node
  waterScene = createWater(gl,resources);

  {
    let waterShaderNode = new ShaderSGNode(waterShaderProgram);
    let waterTextureNode = new TextureSGNode(resources.texture_water, 0, 'u_diffuseTex', new RenderSGNode(resources.model_water));
    let waterTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 3}), [waterTextureNode]);

    // let waterRenderNode = new RenderSGNode(resources.model_water);
    // let waterTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 3}), [waterRenderNode]);
    waterShaderNode.append(waterTransformationNode);
    root.append(waterShaderNode);
  }

  // create skybox node
  {
    let skyboxShaderNode = new ShaderSGNode(skyboxShaderProgram);
    let skyboxEnvironmentNode = new EnvironmentSGNode(skyboxtexture,4,false,false,false, new RenderSGNode(makeSphere(200)));
    skyboxShaderNode.append(skyboxEnvironmentNode);
    root.append(skyboxShaderNode);
  }

  // create fire node
  createFire(gl, resources);
  {
    fireShaderNode = new ShaderSGNode(fireShaderProgram);

    let pos = [[53, 4, 63], [55, 4, 55], [60, 4, 40], [61, 4, 29], [64, 4, 12.5], [65, 4, 5]];
    for (var i=0; i<pos.length; i++) {
      let fireTextureNode = new TextureSGNode(resources.texture_fire, 0, 'u_particleAtlas', new RenderSGNode(makeRect(1.0, 1.0, this.vertexIndices)));
      for (var j=0; j<5; j++) {
        let fireTransformationNode = new TransformationSGNode(glm.transform({ translate: pos[i]}),  [fireTextureNode]);
        fireShaderNode.append(fireTransformationNode);
      }
    }
  }

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
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [55, 4, 65], rotateY: 0, rotateX : 0, scale: 2 }),  [
      bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [57, 4, 57], rotateY: 0, rotateX : 0, scale: 2 }),  [
      bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [62, 4, 42], rotateY: 0, rotateX : 0, scale: 2 }),  [
      bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [63, 4, 31], rotateY: 0, rotateX : 0, scale: 2 }),  [
      bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [66, 4, 14.5], rotateY: 0, rotateX : 0, scale: 2 }),  [
      bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let bowlTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.model_bowl));
    let bowlMaterial = new MaterialSGNode(bowlTexture);
    let bowlNode = new TransformationSGNode(glm.transform({ translate: [67, 4, 7], rotateY: 0, rotateX : 0, scale: 2 }),  [
     bowlMaterial
    ]);
    root.append(bowlNode);
  }

  {
    let sophieTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.sophie));
    let sophieMaterial = new MaterialSGNode(sophieTexture);
    let sophieNode = new TransformationSGNode(glm.transform({ translate: [58,-5,60], rotateY: 0, rotateX : 272, rotateZ: 85, scale: 45.05 }),  [
      sophieMaterial
    ]);
    root.append(sophieNode);
  }

  {
    let chrisiTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.chrisi));
    let chrisiMaterial = new MaterialSGNode( chrisiTexture);
    let chrisiNode = new TransformationSGNode(glm.transform({ translate: [71,-1,11], rotateY: 0 ,rotateX : 270, rotateZ: 95, scale: 45.05 }),  [
      chrisiMaterial
    ]);
    root.append(chrisiNode);
  }

  {
    let siegiTexture = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex',new RenderSGNode(resources.siegi));
    let siegiMaterial = new MaterialSGNode(siegiTexture);
    let siegiNode = new TransformationSGNode(glm.transform({ translate: [67, 0.5, 36], rotateY: 0, rotateX : 270, rotateZ: 75, scale: 45.05 }),  [
      siegiMaterial
    ]);
    root.append(siegiNode);
  }

  {
    let heliTextureNode = new TextureSGNode(resources.heli_tex, 0, 'u_diffuseTex', new RenderSGNode(resources.heli_model));
    let heliMaterialNode = new MaterialSGNode(heliTextureNode);
    heliTransformationNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: helisize }),  [heliMaterialNode]);
    root.append(heliTransformationNode);
  }

  {
    let rotorTextureNode = new TextureSGNode(resources.heli_tex, 0, 'u_diffuseTex',new RenderSGNode(resources.heli_main_rotor));
    let rotorMaterialNode = new MaterialSGNode(rotorTextureNode);
    rotorTransformationNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: helisize }),  [rotorMaterialNode]);
    root.append(rotorTransformationNode);
  }

  {
    let yachtTextureNode = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex', new RenderSGNode(resources.model_yacht));
    let yachtMaterialNode = new MaterialSGNode(yachtTextureNode);
    yacht1TransformationNode = new TransformationSGNode(glm.transform({ translate: [30, 3.5, -20], scale: 0.1 }),  [yachtMaterialNode]);
    root.append(yacht1TransformationNode);
  }

  {
    let yachtTextureNode = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex', new RenderSGNode(resources.model_yacht));
    let yachtMaterialNode = new MaterialSGNode(yachtTextureNode);
    yacht2TransformationNode = new TransformationSGNode(glm.transform({ translate: [-30, 4.5, -80], scale: 0.13, rotateY: 90 }),  [yachtMaterialNode]);
    root.append(yacht2TransformationNode);
  }

  {
    let yachtTextureNode = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex', new RenderSGNode(resources.model_yacht));
    let yachtMaterialNode = new MaterialSGNode(yachtTextureNode);
    yacht3TransformationNode = new TransformationSGNode(glm.transform({ translate: [-80, 3.5, 20], scale: 0.1, rotateY: 180 }),  [yachtMaterialNode]);
    root.append(yacht3TransformationNode);
  }

  return root;
}

function render(timeInMilliSeconds){
    // compute delta between frames
    let delta = timeInMilliSeconds - lastTimeMillis;
    lastTimeMillis = timeInMilliSeconds;
    clockTime += delta / 1000;

    drivePlane(timeInMilliSeconds);

    checkForWindowResize(gl);

    // TODO: boot spiegelt sich so schiach!
    RenderWaterReflectionTexture();


    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //setup context and camera matrices
    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), 30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 1000);
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

    // water
    gl.useProgram(waterShaderProgram);
    setUpWaterUniforms(timeInMilliSeconds);
    bindWaterTextures();
    waterScene.render(context);
    unbindWaterTextures();

    // fire
    enableFireVertexAttributes();
    setUpFireUniforms(delta, context);
    fireShaderNode.render(context);

    gl.depthMask(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //animate
    requestAnimationFrame(render);
}


// -----------------------------------------------------------
// ----- SKYBOX ----------------------------------------------
// -----------------------------------------------------------

function initCubeMap(resources, skybox_imgs) {
  //create the texture
  skyboxtexture = gl.createTexture();
  //define some texture unit we want to work on
  gl.activeTexture(gl.TEXTURE0);
  //bind the texture to the texture unit
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxtexture);
  //set sampling parameters
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.MIRRORED_REPEAT); //will be available in WebGL 2
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //set correct image for each side of the cube map
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, skybox_imgs[6]);//flipping required for our skybox, otherwise images don't fit together
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skybox_imgs[5]);
  //generate mipmaps (optional)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  //unbind the texture again
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}



// -----------------------------------------------------------
// ----- FIRE ------------------------------------------------
// -----------------------------------------------------------

function createFire(gl, resources) {

  var numParticles = 1000;
  var lifetimes = [];
  var triCorners = [];
  var texCoords = [];
  var vertexIndices = [];
  var centerOffsets = [];
  var velocities = [];

  var triCornersCycle = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
  var texCoordsCycle = [0, 0, 1, 0, 1, 1, 0, 1];

  for (var i=0; i<numParticles; i++) {
    var lifetime = 8 * Math.random();

    var diameterAroundCenter = 0.5;
    var halfDiameterAroundCenter = diameterAroundCenter / 2;

    var xStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter;
    xStartOffset /= 3;

    var yStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter;
    yStartOffset /= 10;

    var zStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter;
    zStartOffset /= 3;

    var upVelocity = 0.1 * Math.random();

    var xSideVelocity = 0.02 * Math.random();

    if (xStartOffset > 0) xSideVelocity *= -1;

    var zSideVelocity = 0.02 * Math.random();

    if (zStartOffset > 0) zSideVelocity *= -1;

    for (var j=0; j<4; j++) {
      lifetimes.push(lifetime);

      triCorners.push(triCornersCycle[j * 2]);
      triCorners.push(triCornersCycle[j * 2 + 1]);

      texCoords.push(texCoordsCycle[j * 2]);
      texCoords.push(texCoordsCycle[j * 2 + 1]);

      centerOffsets.push(xStartOffset);
      centerOffsets.push(yStartOffset + Math.abs(xStartOffset / 2.0));
      centerOffsets.push(zStartOffset);

      velocities.push(xSideVelocity);
      velocities.push(upVelocity);
      velocities.push(zSideVelocity);
    }

    vertexIndices = vertexIndices.concat([0, 1, 2, 0, 2, 3].map(function (num) {
      return num + 4 * i
    }));
  }

  // create WebGL buffers
  lifetimeBuffer = createBuffer('ARRAY_BUFFER', Float32Array, lifetimes);
  texCoordBuffer = createBuffer('ARRAY_BUFFER', Float32Array, texCoords);
  triCornerBuffer = createBuffer('ARRAY_BUFFER', Float32Array, triCorners);
  centerOffsetBuffer = createBuffer('ARRAY_BUFFER', Float32Array, centerOffsets);
  velocityBuffer = createBuffer('ARRAY_BUFFER', Float32Array, velocities);
  createBuffer('ELEMENT_ARRAY_BUFFER', Uint16Array, vertexIndices);
}

function createBuffer (bufferType, DataType, data) {
    var buffer = gl.createBuffer()
    gl.bindBuffer(gl[bufferType], buffer)
    gl.bufferData(gl[bufferType], new DataType(data), gl.STATIC_DRAW)
    return buffer
}

function enableFireVertexAttributes() {

    gl.useProgram(fireShaderNode.program);

    gl.enableVertexAttribArray(gl.getAttribLocation(fireShaderNode.program, 'aLifetime'));
    gl.enableVertexAttribArray(gl.getAttribLocation(fireShaderNode.program, 'aTextureCoords'));
    gl.enableVertexAttribArray(gl.getAttribLocation(fireShaderNode.program, 'aTriCorner'));
    gl.enableVertexAttribArray(gl.getAttribLocation(fireShaderNode.program, 'aCenterOffset'));
    gl.enableVertexAttribArray(gl.getAttribLocation(fireShaderNode.program, 'aVelocity'));

    gl.bindBuffer(gl.ARRAY_BUFFER, lifetimeBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(fireShaderNode.program, 'aLifetime'), 1, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(fireShaderNode.program, 'aTextureCoords'), 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, triCornerBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(fireShaderNode.program, 'aTriCorner'), 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, centerOffsetBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(fireShaderNode.program, 'aCenterOffset'), 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(fireShaderNode.program, 'aVelocity'), 3, gl.FLOAT, false, 0, 0)
}

function setUpFireUniforms(delta, context) {

    clockTime += delta / 1000;

    // Disable to get particle system to work
    gl.depthMask(false);

    // Additive blending
    gl.blendFunc(gl.ONE, gl.ONE);

   //gl.uniform1f(gl.getUniformLocation(fireShaderNode.program, 'uTime'), clockTime);
    gl.uniform1f(gl.getUniformLocation(fireShaderNode.program, 'uTimeFrag'), clockTime);
    gl.uniform1i(gl.getUniformLocation(fireShaderNode.program, 'uUseBillboarding'), true);
    gl.uniform1i(gl.getUniformLocation(fireShaderNode.program, 'uRepeating'), true);

    gl.uniform3fv(gl.getUniformLocation(fireShaderNode.program, 'uFirePos'), position);
    gl.uniform4fv(gl.getUniformLocation(fireShaderNode.program, 'uColor'), color);
    gl.uniform1f(gl.getUniformLocation(fireShaderNode.program, 'uSize'), size);
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

function createWater(gl, resources){

  let waterShaderNode = new ShaderSGNode(waterShaderProgram);
  let waterRenderNode = new RenderSGNode(resources.model_water);
  let waterTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,0,0], scale: 3}), [waterRenderNode]);
  waterShaderNode.append(waterTransformationNode);
  return waterShaderNode;
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
/*
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
}*/

function RenderWaterReflectionTexture(){

  gl.bindFramebuffer(gl.FRAMEBUFFER, waterReflectionFramebuffer);

  //gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.clearColor(0,0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), 30, canvasWidth / canvasHeight, 0.01, 1000);

  let distance = cameraStartPos[1] - waterHeight;
  let reversedCameraPosition = [cameraStartPos[0],cameraStartPos[1] - distance * 2,cameraStartPos[2]];//Reverse the cameraheight for correct reflection
  let lookAtMatrix = mat4.lookAt(mat4.create(), reversedCameraPosition, [0,0,0], [0,1,0]);
  let mouseRotateMatrix = mat4.multiply(mat4.create(), glm.rotateX(-camera.rotation.y), glm.rotateY(camera.rotation.x));

  context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

  //enableAboveWaterClipping(singleShaderProgram);
  //enableAboveWaterClipping(textureShaderProgram);

  gl.useProgram(singleShaderProgram);
  gl.uniform3fv(gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),  reverseSunDirection);
  gl.uniform1i(gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);

  gl.useProgram(textureShaderProgram);
  gl.uniform3fv(gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  root.render(context);
  //disableWaterClipping(singleShaderProgram);
  //disableWaterClipping(textureShaderProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function RenderWaterRefractionTexture(context){
  gl.bindFramebuffer(gl.FRAMEBUFFER, waterRefractionFramebuffer);

  gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //(singleShaderProgram);
  //enableUnderWaterClipping(textureShaderProgram);
  gl.useProgram(textureShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  root.render(context);
  //disableWaterClipping(singleShaderProgram);
  //disableWaterClipping(textureShaderProgram);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function setUpWaterUniforms(timeInMilliseconds){
  gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_time'), timeInMilliseconds/1000.0);
  // TODO: set sun direction (weiß am wasser)
  //gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_sunDirection'), [1,1,0]);
  gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_sunDirection'), [1,1,0]);
  gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_sunColor'), [1,1,1]);
  gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_horizonColor'), [0.6,0.6,0.6]);
  gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_zenithColor'), [0.6,0.6,0.6]);
  gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_atmosphereDensity'), 0.000025);
  //gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_fogDensity'), 0.003);
  //gl.uniform1f(gl.getUniformLocation(waterShaderProgram, 'u_fogFalloff'), 20.0);
  //gl.uniform3fv(gl.getUniformLocation(waterShaderProgram, 'u_fogColor'), [0.8,0.8,0.9]);

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
    let keyframe29 = 145000;

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
            planeZ = lerp(80, 130, percent);
            eye[0] = lerp(12, 29, percent);
            eye[2] = lerp(54.5, 57, percent);
            let centerX = lerp(30, 58, percent);
            let centerZ = lerp(57, 60, percent);
            let centerY = lerp(18, 11, percent);
            center = [centerX, centerY, centerZ];
        }
        else if (timeInMilliSeconds < keyframe26) {
            let percent = calcProzent(timeInMilliSeconds - keyframe25, (keyframe26 - keyframe25));
            planeZ = lerp(130, 200, percent);
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
            eye[0] = lerp(58, 36, percent);
            eye[2] = lerp(-35, -75, percent);
        }
    }

    heliTransformationNode.matrix = glm.transform({translate: [planeX, planeY, planeZ], rotateX : -90, rotateZ: planeRotateY, scale: helisize});
    rotorTransformationNode.matrix = glm.transform({translate: [planeX,planeY, planeZ], rotateX : -90, scale: 1, rotateZ: timeInMilliSeconds*timeInMilliSeconds, scale: helisize});
}

function calcProzent(timeInMilliseconds, keyFrame){
    return timeInMilliseconds/keyFrame;
}

function lerp(a, b, n) {
    return (1 - n) * a + n * b;
}
