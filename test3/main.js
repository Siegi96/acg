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
var piperNode;
var translate;
var textureNode;

//textures
var textures;

//Lights
var reverseSunDirection = [0.5, 0.7, 1];

//load the required resources using a utility function
loadResources({
    // cubemap shader
    vs_env: 'shader/envmap.vs.glsl',
    fs_env: 'shader/envmap.fs.glsl',

    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_texture: 'shader/texture.vs.glsl',
    fs_texture: 'shader/texture.fs.glsl',
    piper_model: '../models/airplane/Kfir.obj',
    piper_tex: '../models/airplane/Diffuse.jpg',

// floor  texture
    texture_diffuse: '../textures/wood.png',


// cubemap images
  env_pos_x: '../textures/mountains/px.jpg',
  env_neg_x: '../textures/mountains/nx.jpg',
  env_pos_y: '../textures/mountains/py.jpg',
  env_neg_y: '../textures/mountains/ny.jpg',
  env_pos_z: '../textures/mountains/pz.jpg',
  env_neg_z: '../textures/mountains/nz.jpg',
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
    init(resources);

    render(0);
});

function init(resources) {
    //create a GL context
    gl = createContext(400, 400);

    cubemap =  [resources.env_pos_x, resources.env_neg_x, resources.env_pos_y, resources.env_neg_y, resources.env_pos_z, resources.env_neg_z,false]
    initCubeMap(resources,cubemap);

    gl.enable(gl.DEPTH_TEST);

    //create scenegraph
    root = createSceneGraph(gl, resources);

    initInteraction(gl.canvas);
}

function createSceneGraph(gl, resources) {

  //create scenegraph
  const rootenv = new ShaderSGNode(createProgram(gl, resources.vs_env, resources.fs_env));

  {
    //add skybox by putting large sphere around us
    worldEnvNode = new EnvironmentSGNode(envcubetexture,4,false,false,false,
                    new RenderSGNode(makeSphere(100)));
    rootenv.append(worldEnvNode);
  }

    //create root scenegraph
    textures = {piper: resources.piper_tex, wood: resources.texture_diffuse};
    const root = new ShaderSGNode(createProgram(gl, resources.vs_texture, resources.fs_texture));

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
        let textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.piper_model));

        let piper = new MaterialSGNode( textureNode);
        //gold
        piper.ambient = [0.0, 0.0, 0.0, 1];
        piper.diffuse = [0.25, 0.13, 0.1, 1];
        piper.specular = [0.5, 0.5, 0.5, 1];
        piper.shininess = 4.0;

        piperNode = new TransformationSGNode(glm.transform({ translate: [-3,5, 2], rotateX : 0, scale: 1 }),  [
            piper
        ]);
        root.append(piperNode);
    }

    {
      //initialize floor
      textureNodeFloor =  new TextureSGNode(textures.wood, 0, 'u_diffuseTex',  new RenderSGNode(makeFloor()));
      let floor = new MaterialSGNode( textureNodeFloor  );

      //dark
      floor.ambient = [0.5, 0.5, 0.5, 1];
      floor.diffuse = [0.1, 0.9, 0.1, 1];
      floor.specular = [0.5, 0.5, 0.5, 1];
      floor.shininess = 50.0;
      floor.lights = [lightNode];

      floorNode = new TransformationSGNode(glm.transform({ translate: [0,-1,0], rotateX: -90, scale: 1}), [
        floor
      ]);
      root.append(floorNode);
    }

    root.append(rootenv);

    return root;
}

function drivePlane(timeInMilliSeconds) {
    let keyframe = 50000;
    let prozent = calcProzent(timeInMilliSeconds, keyframe);
    if(prozent >= 1) prozent = 1;
    console.log(prozent);
    let x = lerp(-3, 50, prozent);
    piperNode.matrix = glm.translate(x,0,2);

}

function calcProzent(timeInMilliseconds, keyFrame){
    return timeInMilliseconds/keyFrame;
}
function lerp(a, b, n) {
    return (1 - n) * a + n * b;
}

function render(timeInMilliSeconds){
    checkForWindowResize(gl);

    //piperNode.matrix = glm.rotateY(-1000);
    //rotateLight.matrix = glm.rotateY(50);

    //drivePlane(timeInMilliSeconds);

    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //setup context and camera matrices
    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), 30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 200);
    //very primitive camera implementation
    let lookAtMatrix = mat4.lookAt(mat4.create(), [0,10,5], [0,0,0], [0,-1,0]);
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


function makeFloor() {
  var width = 100;
  var height = 100;
  var position = [-width, -height, 0,   width, -height, 0,   width, height, 0,   -width, height, 0];
  var normal = [0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1];
  var texturecoordinates = [0, 0,   1, 0,   1, 1,   0, 1];
  //var texturecoordinates = [0, 0,   5, 0,   5, 5,   0, 5];
  var index = [0, 1, 2,   2, 3, 0];
  return {
    position: position,
    normal: normal,
    texture: texturecoordinates,
    index: index
  };
}
