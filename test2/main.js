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


//load the required resources using a utility function
loadResources({
    vs_simple: 'shader/simple.vs.glsl',
    fs_simple: 'shader/simple.fs.glsl',
    vs_single: 'shader/simple.vs.glsl',
    fs_single: 'shader/simple.fs.glsl',
    sunglyder_model: '../models/Sun Glyder.obj',
    sunglyder_material: '../models/Sun Glyder/Sun_Glyder.mtl'
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
            new RenderSGNode(resources.sunglyder_model)
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