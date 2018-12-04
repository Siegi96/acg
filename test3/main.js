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
    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_single: 'shader/single.vs.glsl',
    fs_single: 'shader/single.fs.glsl',
    vs_texture: 'shader/texture.vs.glsl',
    fs_texture: 'shader/texture.fs.glsl',
    piper_model: '../models/piper/piper_pa18.obj',
    piper_tex: '../models/piper/piper_diffuse.jpg'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
    init(resources);

    render(0);
});

function init(resources) {
    //create a GL context
    gl = createContext(400, 400);

    gl.enable(gl.DEPTH_TEST);

    //create scenegraph
    root = createSceneGraph(gl, resources);

    initInteraction(gl.canvas);
}

function createSceneGraph(gl, resources) {
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