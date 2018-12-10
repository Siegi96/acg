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
var waterSceneNode = null;

//Lights
var reverseSunDirection = [0.5, 0.7, 1];
//shaders
var singleShaderProgram;
var textureShaderProgram;
var waterShaderProgram;

//textures
var textures;
var skyBox1Texture;
  var waterReflectionColorTexture;
  var waterRefractionColorTexture;
  var waterReflectionDepthTexture;
  var waterRefractionDepthTexture;

//bloomVariables
var renderTargetBloomTexture;
var textureNode;
var bloomShaderProgram;
var canvasWidth = 1920;
var canvasHeight = 1080;
var bloomFrameBuffer;
var screenQuadRoot=null;
var renderTargetDepthTexture;

  //Framebuffer
  var waterReflectionFramebuffer;
  var waterRefractionFramebuffer;

  //settings
  var waterHeight = 0;

//load the required resources using a utility function
loadResources({
  vs_single: 'shader/single.vs.glsl',
  fs_single: 'shader/single.fs.glsl',
  vs_texture: 'shader/texture.vs.glsl',
  fs_texture: 'shader/texture.fs.glsl',
  piper_model: '../models/piper/piper_pa18.obj',
    vs_water: 'shader/water.vs.glsl',
    fs_water: 'shader/water.fs.glsl',
    waterPlane100_100: '../models/water300_300.obj',

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
    waterShaderProgram = createProgram(gl, resources.vs_water, resources.fs_water);
    initWaterReflectionFramebuffer();
    initWaterRefractionFramebuffer();

  sceneOneRoot = createSceneOne(gl, resources);
}

function createSceneOne(gl, resources) {
  //create scenegraph
    waterSceneNode = createWater(gl, resources);
    createDebugRect();
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

  function render(timeInMilliseconds) {
      checkForWindowResize(gl);


      RenderWaterReflectionTexture();
      //setup viewport
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const context = createSGContext(gl);
      context.projectionMatrix = mat4.perspective(mat4.create(), 30, canvasWidth / canvasHeight, 0.01, 100);
      //very primitive camera implementation

      if (sceneNumber == 0) {
          context.viewMatrix = viewMatrixFirstScene(timeInMilliseconds);
      } else if (sceneNumber == 1) {
          context.viewMatrix = viewMatrixSecondScene(timeInMilliseconds);
      } else if (sceneNumber == 2) {
          let reversedCameraPosition = [cameraStartPos[0], cameraStartPos[1], cameraStartPos[2]];//Reverse the cameraheight for correct reflection
          let lookAtMatrix = mat4.lookAt(mat4.create(), reversedCameraPosition, [0, 0, 0], [0, 1, 0]);
          let mouseRotateMatrix = mat4.multiply(mat4.create(),
              glm.rotateX(camera.rotation.y),//reverse cameratilt for correct reflection
              glm.rotateY(camera.rotation.x));
          context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);
          context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);
      }
  }
  function createDebugRect(){
      debugRectNode  = new ShaderSGNode(singleShaderProgram);
      var translateNode = new TransformationSGNode(glm.translate(-2,-2,0));
      var textureNode =  new RenderSGNode(makeRect(3,3));
      translateNode.append(textureNode);
      debugRectNode .append(translateNode);
  }