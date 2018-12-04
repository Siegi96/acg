  /**
 * Created by Erik Thiele, Wolfgang Essl and Daniel Kepplinger on 07.01.2018.
 */
'use strict';

const camera = {
  rotation: {
    x: 0,
    y: 0
  }
};
var cameraStartPos = [0,-10,-10];

var gl = null;

//current scene
var sceneNumber = 0;
//scene graph nodes
var sceneOneRoot = null;
var sceneTwoRoot = null;
var sceneThreeRoot = null;
var waterScene1 = null;

//Lights
var reverseSunDirection = [0.5, 0.7, 1];
//shaders
var singleShaderProgram;
var textureShaderProgram;
var waterShaderProgram;

//textures
var textures;
var skyBox1Texture;

//bloomVariables
var renderTargetBloomTexture;
var textureNode;
var bloomShaderProgram;
var canvasWidth = 1920;
var canvasHeight = 1080;
var bloomFrameBuffer;
var screenQuadRoot=null;
var renderTargetDepthTexture;

//load the required resources using a utility function
loadResources({
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

  textures = {
      piper: resources.piper_tex
  };

  gl.enable(gl.DEPTH_TEST);

  singleShaderProgram = createProgram(gl, resources.vs_single, resources.fs_single);
  textureShaderProgram = createProgram(gl,resources.vs_texture, resources.fs_texture);

  sceneOneRoot = createSceneOne(gl, resources);
}

function createSceneOne(gl, resources) {
  //create scenegraph

  const root = new ShaderSGNode(textureShaderProgram);

  {
      var textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.piper_model));

      let piper = new MaterialSGNode( textureNode);
      //gold
      piper.ambient = [0.0, 0.0, 0.0, 1];
      piper.diffuse = [0.25, 0.13, 0.1, 1];
      piper.specular = [0.5, 0.5, 0.5, 1];
      piper.shininess = 4.0;

      var piperNode = new TransformationSGNode(glm.transform({ translate: [-3,0, 2], rotateX : 180, scale: 1 }),  [
          piper
        ]);
      root.append(piperNode);
  }

  return root;
}



function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  //setup viewport
  gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.clearColor(0,0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), 30, canvasWidth / canvasHeight, 0.01, 100);
  //very primitive camera implementation

    context.viewMatrix = viewMatrixFirstScene(timeInMilliseconds);



  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //get inverse view matrix to allow computing eye-to-light matrix
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

  gl.useProgram(singleShaderProgram);
  gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);
  gl.uniform3fv( gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),reverseSunDirection);
  gl.useProgram(textureShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  renderScene(context);

  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,canvasWidth, canvasHeight);
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //renderDebugRect(context);
  requestAnimationFrame(render);
}

function viewMatrixFirstScene(timeInMilliseconds){
  var firstKeyframe = 7500;
  var secondKeyframe = 15000;
  var thirdKeyframe = 25000;
  var fourthKeyframe = 30000;
  var fifthKeyframe = 40000;
  var prozent = 0.0;
  var eyeX = 0.0;
  var eyeY = -5;
  var eyeZ = -3;
  var centerZ = 0;
  var alpha=1.0;

  gl.useProgram(bloomShaderProgram);
  gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
  if(undefined === timeInMilliseconds ){
    timeInMilliseconds = 0.0;
  }

  if(timeInMilliseconds < firstKeyframe) {
      prozent = calcProzent(timeInMilliseconds, firstKeyframe);
      eyeX = lerp(-15, -3, prozent);
  }else if(timeInMilliseconds < secondKeyframe) {
      prozent = calcProzent((timeInMilliseconds - firstKeyframe), secondKeyframe-firstKeyframe);
      eyeX = lerp(-3, 5, prozent);
      eyeY = lerp(-5, -3, prozent);
  } else if(timeInMilliseconds < thirdKeyframe) {
      eyeX = lerp(-3, 5, 1);
      eyeY = lerp(-3, -3, 1);
  } else if(timeInMilliseconds < fourthKeyframe) {
      prozent = calcProzent((timeInMilliseconds - thirdKeyframe), fourthKeyframe-thirdKeyframe);
      eyeX = lerp(5, -5, prozent);
      eyeY = lerp(-3, -5, prozent);
      eyeZ = lerp(-3,8, prozent);

  } else if(timeInMilliseconds < fifthKeyframe){
      prozent = calcProzent((timeInMilliseconds - fourthKeyframe), fifthKeyframe-fourthKeyframe);
    alpha= 1 - prozent;
    gl.useProgram(bloomShaderProgram);
    gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
    eyeX = lerp(5, -5, 1);
    eyeY = lerp(-3, -5, 1);
    eyeZ = lerp(-3, 8, 1);

  }else{
    alpha = 1;
    sceneNumber = 1;
    gl.useProgram(bloomShaderProgram);
    gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
  }

  return calculateViewMatrix(eyeX, eyeY, eyeZ, centerZ);

}

function renderScene(context){
  if(sceneNumber == 0){
    sceneOneRoot.render(context);
  }else if(sceneNumber==1){
    sceneTwoRoot.render(context);
  }else if(sceneNumber==2){
    sceneThreeRoot.render(context);
  }
}




function calculateViewMatrix(eyeX,eyeY,eyeZ,centerZ) {

  var eye = [eyeX,eyeY,eyeZ];
  var center = [0, 0, centerZ];
  //var eye = [0,3,3];
  //var center = [0, 0, 0];
  var up = [0,1,0];
  var viewMatrix = mat4.lookAt(mat4.create(), eye, center, up);
  return viewMatrix;
}

function calcProzent(timeInMilliseconds, keyFrame){
  return timeInMilliseconds/keyFrame;
}
function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}
