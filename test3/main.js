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

//load the required resources using a utility function
loadResources({
    // cubemap shader
    vs_env: 'shader/envmap.vs.glsl',
    fs_env: 'shader/envmap.fs.glsl',

    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_single: 'shader/single.vs.glsl',
    fs_single: 'shader/single.fs.glsl',
    vs_texture: 'shader/texture.vs.glsl',
    fs_texture: 'shader/texture.fs.glsl',
    piper_model: '../models/piper/piper_pa18.obj',
    piper_tex: '../models/piper/piper_diffuse.jpg',

    // cubemap
  env_winter_pos_x: '../textures/winter_cubemap/px.jpg',
  env_winter_neg_x: '../textures/winter_cubemap/nx.jpg',
  env_winter_pos_y: '../textures/winter_cubemap/py.jpg',
  env_winter_neg_y: '../textures/winter_cubemap/ny.jpg',
  env_winter_pos_z: '../textures/winter_cubemap/pz.jpg',
  env_winter_neg_z: '../textures/winter_cubemap/nz.jpg',

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

    textures = {
        winter: [resources.env_winter_pos_x, resources.env_winter_neg_x,
          resources.env_winter_pos_y, resources.env_winter_neg_y,
          resources.env_winter_pos_z, resources.env_winter_neg_z,false],
        mountains: [resources.env_pos_x, resources.env_neg_x, resources.env_pos_y, resources.env_neg_y, resources.env_pos_z, resources.env_neg_z,true]
    };
    initCubeMap(resources,textures["mountains"]);

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
                    new RenderSGNode(makeSphere(10)));
    rootenv.append(worldEnvNode);
  }
/*
  {
    //initialize
    sphereEnvNode = new EnvironmentSGNode(envcubetexture,4,true,true,true,
        new RenderSGNode(makeSphere(1)));
    let sphere = new TransformationSGNode(glm.transform({ translate: [0,0, 0], rotateX : 0, rotateZ : 0, scale: 1.0 }),
                   sphereEnvNode );
                   //new RenderSGNode(resources.model)));

    rootenv.append(sphere);
  }*/

    //create root scenegraph
    textures = {piper: resources.piper_tex};
    const root = new ShaderSGNode(createProgram(gl, resources.vs_texture, resources.fs_texture));

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
        let textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.piper_model));

        let piper = new MaterialSGNode( textureNode);
        //gold
        piper.ambient = [0.0, 0.0, 0.0, 1];
        piper.diffuse = [0.25, 0.13, 0.1, 1];
        piper.specular = [0.5, 0.5, 0.5, 1];
        piper.shininess = 4.0;

        piperNode = new TransformationSGNode(glm.transform({ translate: [-3,0, 2], rotateX : 180, scale: 1 }),  [
            piper
        ]);
        root.append(piperNode);
        root.append(rootenv);
    }

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

    piperNode.matrix = glm.rotateY(-1000);
    rotateLight.matrix = glm.rotateY(50);

    //drivePlane(timeInMilliSeconds);

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
