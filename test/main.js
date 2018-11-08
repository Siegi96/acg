var gl = null;
var root = null;
var fieldOfViewInRadians = convertDegreeToRadians(45);
var rotateLight, rotateNode; // transformation nodes
var light; // light
var aircraft, floor; // material
var phongProgramm, staticProgramm; // shader programs (vs + fs)
var aircraftmodel;
var models = [];
const camera = {
    rotation: {
        x: 0,
        y: 0
    }
};

loadResources({
    vs_shader: 'shader/simple.vs.glsl',
    fs_shader: 'shader/simple.fs.glsl',
    vs_single: 'shader/single.vs.glsl',
    fs_single: 'shader/single.fs.glsl',
    model1: '../models/Sun Glyder.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
    init(resources);
    render(0);
});

function init(resources) {
    //create a GL context
    gl = createContext();

    //enable depth test to let objects in front occlude objects further away
    gl.enable(gl.DEPTH_TEST);
    root = createSceneGraph(gl, resources);


    console.log(resources)
    //TODO initialize shader, buffers, ...
}

function render(timeInMilliseconds) {
    checkForWindowResize(gl);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    //set background color to light gray
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    //clear the buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    const context = createSGContext(gl);
    context.projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);

    //ReCap: what does this mean?
    context.viewMatrix = mat4.lookAt(mat4.create(), [0,3,-10], [0,0,0], [0,1,0]);

    //rotate whole scene according to the mouse rotation stored in
    //camera.rotation.x and camera.rotation.y
    context.sceneMatrix = mat4.multiply(mat4.create(),
        glm.rotateY(camera.rotation.x),
        glm.rotateX(camera.rotation.y));
    root.render(context);

    //animate
    requestAnimationFrame(render);
}

function convertDegreeToRadians(degree) {
    return degree * Math.PI / 180
}

function createSceneGraph(gl, resources) {
    //create scenegraph
    phongProgramm = createProgram(gl, resources.vs_shader, resources.fs_shader);
    models = { aircraft: [new RenderSGNode(resources.model1)] };
    const root = new ShaderSGNode(phongProgramm);

    {
        //wrap shader with material node
        aircraft = new MaterialSGNode(
            Object.values(models)[0]
        );
        //gold
        aircraft.ambient = [0.24725, 0.1995, 0.0745, 1];
        aircraft.diffuse = [0.75164, 0.60648, 0.22648, 1];
        aircraft.specular = [0.628281, 0.555802, 0.366065, 1];
        aircraft.shininess = 50;

        rotateNode = new TransformationSGNode(mat4.create(), [
            new TransformationSGNode(glm.transform({translate: [0, 0, 0], rotateX: 0, scale: 0.8}), [
                aircraft
            ])
        ]);
        root.append(rotateNode);
    }

    {
        //wrap shader with material node
        floor = new MaterialSGNode([
            new RenderSGNode(makeRect())
        ]);

        //dark
        floor.ambient = [0, 0, 0, 1];
        floor.diffuse = [0.8, 0.8, 0.8, 1];
        floor.specular = [0.5, 0.5, 0.5, 1];
        floor.shininess = 0.3;

        root.append(new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateX: -90, scale: 2}), [
            floor
        ]));
    }

    return root;
}
