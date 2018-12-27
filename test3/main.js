var gl = null;

const camera = {
    rotation: {
        x: 0,
        y: 0
    }
};

//camera perspective
let eye = [-40,30,70];
let center = [-40,20,40];


//plane perspective
let planeX = -40;
let planeY = 18;
let planeZ = 65;
let planeRotateY = 0;

let helisize = 0.3;

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
var canvasHeight = 1080;

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
    //heli_second_rotor: '../models/heli/second_rotor.obj',
    heli_tex: '../models/heli/fuselage.jpg',
    //scan: '../models/kondensator_deckel.obj',
    scan: '../models/hasi.obj',

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

  var waterNode  = new ShaderSGNode(waterShaderProgram);
  let water = new RenderSGNode(resources.waterPlane100_100);
  waterNode.append(new TransformationSGNode(glm.transform({ translate: [0,4,0], scale: 3}), [
      water
    ]));
  return waterNode;
}

function createSceneGraph(gl, resources) {

  waterScene = createWater(gl,resources);



  const root = new ShaderSGNode(createProgram(gl,resources.vs_texture, resources.fs_texture));


  //create scenegraph
  const rootenv = new ShaderSGNode(createProgram(gl, resources.vs_env, resources.fs_env));

  waterShaderNode = new ShaderSGNode(createProgram(gl, resources.vs_water, resources.fs_water));
 {

   let waterRenderNode = new RenderSGNode(resources.waterPlane100_100);
  waterShaderNode.append(new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 3}), [
        waterRenderNode
      ]));
  }

  {
    //add skybox by putting large sphere around us
    worldEnvNode = new EnvironmentSGNode(envcubetexture,4,false,false,false,
                    new RenderSGNode(makeSphere(100)));
    rootenv.append(worldEnvNode);
  }

    //create root scenegraph
    textures = {heli: resources.heli_tex};
    root.append(rootenv);
    root.append(waterShaderNode);

    {
        //initialize light
        lightNode = new LightSGNode(); //use now framework implementation of light node
        lightNode.ambient = [0.2, 0.2, 0.2, 1];
        lightNode.diffuse = [0.8, 0.8, 0.8, 1];
        lightNode.specular = [1, 1, 1, 1];
        lightNode.position = [0, 0, 0];

        rotateLight = new TransformationSGNode(mat4.create());
        //translateLight = new TransformationSGNode(glm.translate(3,5,0)); //translating the light is the same as setting the light position
        translateLight = new TransformationSGNode(glm.translate(-300,500,400)); //translating the light is the same as setting the light position

        rotateLight.append(translateLight);
        translateLight.append(lightNode);
        root.append(rotateLight);
    }
    {
        let scanTexture = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.scan));

        let scanMaterial = new MaterialSGNode( scanTexture);
        //gold
        scanMaterial.ambient = [0.0, 0.0, 0.0, 1];
        scanMaterial.diffuse = [0.25, 0.13, 0.1, 1];
        scanMaterial.specular = [0.5, 0.5, 0.5, 1];
        scanMaterial.shininess = 4.0;

        scanNode = new TransformationSGNode(glm.transform({ translate: [0,10, 0], rotateY :0 ,rotateX : 270,  scale: 0.05 }),  [
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
        heli.lights = [lightNode];

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
        heli_rotor.lights = [lightNode];

        heliRotorNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: helisize }),  [
            heli_rotor
        ]);
        root.append(heliRotorNode);
    }


    /*
        {
            let textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.heli_second_rotor));

            let heli_sec_rotor = new MaterialSGNode( textureNode);
            //gold
            heli_sec_rotor.ambient = [0.0, 0.0, 0.0, 1];
            heli_sec_rotor.diffuse = [0.25, 0.13, 0.1, 1];
            heli_sec_rotor.specular = [0.5, 0.5, 0.5, 1];
            heli_sec_rotor.shininess = 4.0;
            heli_sec_rotor.lights = [lightNode];

            heliSecondRotorNode = new TransformationSGNode(glm.transform({ translate: [planeX,planeY, planeZ], rotateX : -90, scale: 1 }),  [
                heli_sec_rotor
            ]);
            root.append(heliSecondRotorNode);
        }
    */
    {
        var yachtTextureNode = new TextureSGNode(resources.texture_yacht, 0, 'u_diffuseTex', new RenderSGNode(resources.model_yacht));
        let yachtMaterialNode = new MaterialSGNode(yachtTextureNode);

        yachtMaterialNode.ambient = [0.0, 0.0, 0.0, 1];
        yachtMaterialNode.diffuse = [0.25, 0.13, 0.1, 1];
        yachtMaterialNode.specular = [0.5, 0.5, 0.5, 1];
        yachtMaterialNode.shininess = 4.0;

        var yachtTransformationNode = new TransformationSGNode(glm.transform({ translate: [0,6, 0], scale: 0.1 }),  [yachtMaterialNode]);
        root.append(yachtTransformationNode);
      }

    return root;
}

function drivePlane(timeInMilliSeconds) {
    let keyframe1 = 5000;
    let keyframe2 = 7000;
    let keyframe3 = 15000;
    let keyframe4 = 20000;
    let keyframe5 = 21500;
    let keyframe6 = 22500;
    let keyframe7 = 24000;
    let keyframe8 = 26000;
    let keyframe9 = 30000;

    if (timeInMilliSeconds < keyframe1) {
        let percent = calcProzent(timeInMilliSeconds, keyframe1);
        eye[1] = lerp(30, 23, percent);
        eye[2] = lerp(30, 23, percent);
    }
    else if (timeInMilliSeconds < keyframe2) {
        let percent = calcProzent((timeInMilliSeconds - keyframe1), (keyframe2 - keyframe1));
        let rotX = lerp(0, 72, percent);
        camera.rotation.x = rotX;
        eye[1] = lerp(23, 20, percent);
        eye[2] = lerp(23, 20, percent);
    }
    else if (timeInMilliSeconds < keyframe3) {
        let percent = calcProzent((timeInMilliSeconds - keyframe2), (keyframe3 - keyframe2));
        let rotX = lerp(72, 360, percent);

        camera.rotation.x = rotX;
    }
    else if (timeInMilliSeconds < keyframe4) {
        let percent = calcProzent(timeInMilliSeconds - keyframe3, (keyframe4 - keyframe3));
        planeZ = (percent*(lerp(0, -30, percent)));
        eye[2] = planeZ + 20;
    }
    else if(timeInMilliSeconds < keyframe5) {
        let percent = calcProzent(timeInMilliSeconds - keyframe4, (keyframe5 - keyframe4));
        planeX = lerp(0, 15, percent);
        planeZ = lerp(-30, -60, percent);
        planeRotateY = lerp(0, -70, percent);
        eye[0] = planeX;
        eye[2] = lerp(-10, -18, percent);
    }
    else if(timeInMilliSeconds < keyframe6) {
        let percent = calcProzent(timeInMilliSeconds - keyframe5, (keyframe6 - keyframe5));
        planeX = lerp(15, 25, percent);
        planeRotateY = lerp(-70, -90, percent);
        eye[0] = planeX;
    }
    else if(timeInMilliSeconds < keyframe7){
        let percent = calcProzent(timeInMilliSeconds - keyframe6, (keyframe7 - keyframe6));
        planeX = lerp(25, 40, percent);
        planeZ = lerp(-60, -40, percent);
        planeRotateY = lerp(-90, -150, percent);
        eye[0] = lerp(25, 40, percent);
    }
    else if(timeInMilliSeconds < keyframe8) {
        let percent = calcProzent(timeInMilliSeconds - keyframe7, (keyframe8 - keyframe7));
        planeZ = lerp(-40, -5, percent);
        planeRotateY = lerp(-150, -180, percent);
        eye[0] = lerp(40, 20, percent);
        eye[2] = lerp(-18, -5, percent);
    }
    else if(timeInMilliSeconds < keyframe9) {
        let percent = calcProzent(timeInMilliSeconds - keyframe8, (keyframe9 - keyframe8));
        planeZ = lerp(-5, 65, percent);
        eye[2] = planeZ;
    }


    heliNode.matrix = glm.transform({translate: [planeX, planeY, planeZ], rotateX : -90, rotateZ: planeRotateY});
    center = [planeX, 20, planeZ];
}

function drivePlane2(timeInMilliSeconds) {
    let keyframe1 = 5000;
    let keyframe2 = 10000;
    let keyframe3 = 13000;
    let keyframe4 = 16000;
    let keyframe5 = 19000;
    let keyframe6 = 21000;
    let keyframe7 = 23000;

    if (timeInMilliSeconds < keyframe1) {
        let percent = calcProzent(timeInMilliSeconds, keyframe1);
        eye[1] = lerp(30, 20, percent);
        eye[2] = lerp(70, 50, percent);
        planeZ = lerp(65, 40, percent);
    }
    else if (timeInMilliSeconds < keyframe2) {
        let percent = calcProzent(timeInMilliSeconds - keyframe1, (keyframe2 - keyframe1));
        planeZ = (lerp(40, 0, percent));
        eye[2] = planeZ + 10;
    }
    else if(timeInMilliSeconds < keyframe3) {
        let percent = calcProzent(timeInMilliSeconds - keyframe2, (keyframe3 - keyframe2));
        planeX = lerp(-40, -30, percent);
        planeZ = lerp(0, -20, percent);
        planeRotateY = lerp(0, -50, percent);
        eye[0] = planeX;
        eye[2] = lerp(10, -5, percent);
    }
    else if(timeInMilliSeconds < keyframe4) {
        let percent = calcProzent(timeInMilliSeconds - keyframe3, (keyframe4 - keyframe3));
        planeX = lerp(-30, -10, percent);
        planeZ = lerp(-20, -35, percent);
        planeRotateY = lerp(-50, -100, percent);
        eye[0] = planeX;
        eye[2] = lerp(-5, -20, percent);
    }
    else if(timeInMilliSeconds < keyframe5){
        let percent = calcProzent(timeInMilliSeconds - keyframe4, (keyframe5 - keyframe4));
        planeX = lerp(-10, 15, percent);
        planeZ = lerp(-35, -25, percent);
        planeRotateY = lerp(-100, -135, percent);
        eye[0] = lerp(-10, 10, percent);
        eye[2] = lerp(-20, -25, percent);
    }
    else if(timeInMilliSeconds < keyframe6) {
        let percent = calcProzent(timeInMilliSeconds - keyframe5, (keyframe6 - keyframe5));
        planeX = lerp(15, 25, percent);
        planeZ = lerp(-25, -10, percent);
        planeRotateY = lerp(-135, -180, percent);
        eye[0] = lerp(10, 20, percent);
        eye[2] = lerp(-25, -15, percent);
        console.log("key6");
    }
    else if(timeInMilliSeconds < keyframe7) {
        let percent = calcProzent(timeInMilliSeconds - keyframe6, (keyframe7 - keyframe6));
        planeX = lerp(25, 15, percent);
        planeZ = lerp(-10, 0, percent);
        planeRotateY = lerp(-180, -225, percent);
        eye[0] = lerp(20, 10, percent);
        eye[2] = lerp(-15, -10, percent);
    }


    heliNode.matrix = glm.transform({translate: [planeX, planeY, planeZ], rotateX : -90, rotateZ: planeRotateY, scale: helisize});
    center = [planeX, 20, planeZ];

}


function calcProzent(timeInMilliseconds, keyFrame){
    return timeInMilliseconds/keyFrame;
}
function lerp(a, b, n) {
    //bei 30%: 70% von a, 30% von b
    return (1 - n) * a + n * b;
}

function render(timeInMilliSeconds){
    checkForWindowResize(gl);

    heliRotorNode.matrix = glm.transform({translate: [planeX,planeY, planeZ], rotateX : -90, scale: 1, rotateZ: timeInMilliSeconds*0.6, scale: helisize});
   // heliSecondRotorNode.matrix = glm.transform({translate: [planeX,planeY, planeZ], rotateX : -90, scale: 1});

    RenderWaterReflectionTexture();

    drivePlane2(timeInMilliSeconds);

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

    //gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFrameBuffer);

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
