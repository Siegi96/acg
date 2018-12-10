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
var waterScene2 = null;
var waterScene3 = null;
var debugRectNode = null;

//Lights
var reverseSunDirection = [0.5, 0.7, 1];
//shaders
var singleShaderProgram;
var textureShaderProgram;
var waterShaderProgram;
var skyBoxShaderProgram;

//images
var heightImage;
var waveImage;

//textures
var textures;
var heightTexture;
var envcubetexture;
var waveTexture;
var waterReflectionColorTexture;
var waterRefractionColorTexture;
var waterReflectionDepthTexture;
var waterRefractionDepthTexture;
var skyBox1Texture;
var skyBox2Texture;
var skyBox3Texture;

//Framebuffer
var waterReflectionFramebuffer;
var waterRefractionFramebuffer;

//settings
var waterHeight = 0;



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
  model: '../models/C-3PO.obj',
  yacht: '../models/Yacht.obj',
  rock:'../models/Rock.obj',
  island :'../models/Island.obj',
  texture_rock:'../textures/Rock.jpg',
  vs_water: 'shader/water.vs.glsl',
  fs_water: 'shader/water.fs.glsl',
  vs_env: 'shader/envmap.vs.glsl',
  fs_env: 'shader/envmap.fs.glsl',
  lake_cube_pos_x: '../textures/lake_cubemap/morning_lt.png',
  lake_cube_neg_x: '../textures/lake_cubemap/morning_rt.png',
  lake_cube_pos_y: '../textures/lake_cubemap/morning_dn.png',
  lake_cube_neg_y: '../textures/lake_cubemap/morning_up.png',
  lake_cube_pos_z: '../textures/lake_cubemap/morning_ft.png',
  lake_cube_neg_z: '../textures/lake_cubemap/morning_bk.png',
  boat_tex: '../textures/boat_texture.jpg',
  waterPlane100_100: '../models/water300_300.obj',
  bloomfs: 'shader/bloom.fs.glsl',
  bloomvs: 'shader/bloom.vs.glsl',
  night_cube_pos_x: '../textures/hw_nightsky/nightsky_lf.png',
  night_cube_neg_x: '../textures/hw_nightsky/nightsky_rt.png',
  night_cube_pos_y: '../textures/hw_nightsky/nightsky_dn.png',
  night_cube_neg_y: '../textures/hw_nightsky/nightsky_up.png',
  night_cube_pos_z: '../textures/hw_nightsky/nightsky_ft.png',
  night_cube_neg_z: '../textures/hw_nightsky/nightsky_bk.png',
  emerald_cube_pos_x: '../textures/sb_emerald/emerald_lf.png',
  emerald_cube_neg_x: '../textures/sb_emerald/emerald_rt.png',
  emerald_cube_pos_y: '../textures/sb_emerald/emerald_dn.png',
  emerald_cube_neg_y: '../textures/sb_emerald/emerald_up.png',
  emerald_cube_pos_z: '../textures/sb_emerald/emerald_ft.png',
  emerald_cube_neg_z: '../textures/sb_emerald/emerald_bk.png',
  lake2_cube_pos_x: '../textures/sor_lake1/lake1_lf.jpg',
  lake2_cube_neg_x: '../textures/sor_lake1/lake1_rt.jpg',
  lake2_cube_pos_y: '../textures/sor_lake1/lake1_dn.jpg',
  lake2_cube_neg_y: '../textures/sor_lake1/lake1_up.jpg',
  lake2_cube_pos_z: '../textures/sor_lake1/lake1_ft.jpg',
  lake2_cube_neg_z: '../textures/sor_lake1/lake1_bk.jpg',

}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  render(0);
});

function init(resources) {
  //create a GL context
  gl = createContext(400, 400);

  console.log("Init");
  textures = {
      rocky: resources.texture_rock,
       lake: [resources.lake_cube_pos_x,resources.lake_cube_neg_x,
         resources.lake_cube_pos_y, resources.lake_cube_neg_y, resources.lake_cube_pos_z, resources.lake_cube_neg_z,true],
         boat: resources.boat_tex,
         night: [resources.night_cube_pos_x,resources.night_cube_neg_x,
           resources.night_cube_pos_y, resources.night_cube_neg_y, resources.night_cube_pos_z, resources.night_cube_neg_z,true],
         emerald: [resources.emerald_cube_pos_x,resources.emerald_cube_neg_x,
           resources.emerald_cube_pos_y, resources.emerald_cube_neg_y, resources.emerald_cube_pos_z, resources.emerald_cube_neg_z,true],
         lake2: [resources.lake2_cube_pos_x,resources.lake2_cube_neg_x,
           resources.lake2_cube_pos_y, resources.lake2_cube_neg_y, resources.lake2_cube_pos_z, resources.lake2_cube_neg_z,true]
     };

  gl.enable(gl.DEPTH_TEST);

  createScreenRectTexture();
  screenQuadRoot=createScreenRectprogramm(gl,resources);

    singleShaderProgram = createProgram(gl, resources.vs_single, resources.fs_single);
  textureShaderProgram = createProgram(gl,resources.vs_texture, resources.fs_texture);
  skyBoxShaderProgram = createProgram(gl, resources.vs_env, resources.fs_env);
  waterShaderProgram = createProgram(gl, resources.vs_water, resources.fs_water);


  initSkyBox1(resources,textures["lake"]);
  initSkyBox2(resources,textures["night"]);
  initSkyBox3(resources,textures["lake"]);

  initWaterReflectionFramebuffer();
  initWaterRefractionFramebuffer();
  initInteraction(gl.canvas);
  initWaveTexture();
  initHeightMapTexture();

  sceneOneRoot = createSceneOne(gl, resources);
  sceneTwoRoot = createSceneTwo(gl, resources);
  sceneThreeRoot = createSceneThree(gl, resources);
}
function createScreenRectprogramm(gl, resources){
bloomShaderProgram= createProgram(gl,resources.bloomvs,resources.bloomfs);
const screenQuadRoot = new ShaderSGNode(bloomShaderProgram);

let quad = new BloomSGNode(renderTargetBloomTexture , 0 , canvasWidth ,canvasHeight ,  new RenderSGNode(makeScreenQuad(1,1)));//gl.canvas.width

screenQuadRoot.append(quad);
return screenQuadRoot;
}
  //Neue Node mit der Texture die rein gehört. Append Models.T
  //node mit geometry so wie de root
  //bloomnode mit screenquad



class BloomSGNode extends SGNode {
  constructor(texture, textureunit,texturewidth, textureheight, children ) {
    super(children);
    this.texture = texture;
    this.textureunit = textureunit;
    this.textureWidthInv = 1 / texturewidth;
    this.textureHeightInv = 1 / textureheight;
  }

  render(context)
  {
    const gl = context.gl;

    //set additional shader parameters
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex'), this.textureunit);
    gl.uniform2f(gl.getUniformLocation(context.shader, 'u_texSizeInv'), this.textureWidthInv, this.textureHeightInv);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_textureWidth'), this.textureWidthInv);

    //activate and bind texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    //render children
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    super.render(context);



    //clean up

    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, null);
  //  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   }
}

function createScreenRectTexture(){
    var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
    if(!depthTextureExt) { alert('No depth texture support!!!'); return; }

    //generate color texture (required mainly for debugging and to avoid bugs in some WebGL platforms)
    bloomFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFrameBuffer);

    //create color texture
    renderTargetBloomTexture= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTargetBloomTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    //create depth texture
    renderTargetDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTargetDepthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, canvasWidth, canvasHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

    //bind textures to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, renderTargetDepthTexture ,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTargetBloomTexture, 0);


    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
      {alert('Framebuffer incomplete!');}

    //clean up
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


}

function makeScreenQuad() {
  var width = 1;
  var height = 1;
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

function createSceneOne(gl, resources) {
  //create scenegraph

  waterScene1 = createWater(gl,resources);
  createDebugRect();
  const root = new ShaderSGNode(textureShaderProgram);
  root.append(createSkyBox(gl, skyBox1Texture));
  {
      var textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.rock));

      let rock = new MaterialSGNode( textureNode);
      //gold
      rock.ambient = [0.0, 0.0, 0.0, 1];
      rock.diffuse = [0.25, 0.13, 0.1, 1];
      rock.specular = [0.5, 0.5, 0.5, 1];
      rock.shininess = 4.0;

      var rockNode = new TransformationSGNode(glm.transform({ translate: [-3,0, 2], rotateX : 180, scale: 1 }),  [
          rock
        ]);
      root.append(rockNode);
  }
  {
    var textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.rock));

    let rock = new MaterialSGNode( textureNode);
    //gold
    rock.ambient = [0.0, 0.0, 0.0, 1];
    rock.diffuse = [0.75164, 0.60648, 0.22648, 1];
    rock.specular = [0.628281, 0.555802, 0.366065, 1];
    rock.shininess = 4.0;

    var rockNode =
      new TransformationSGNode(glm.transform({ translate: [25,0, 20], rotateX : 180, scale: 3  }),  [
        rock
      ]);
    root.append(rockNode);
    }
 {
    var textureNode = new TextureSGNode(Object.values(textures)[0], 0, 'u_diffuseTex',new RenderSGNode(resources.rock));
      let rock = new MaterialSGNode( textureNode);
    //gold
    rock.ambient = [0.24725, 0.1995, 0.0745, 1];
    rock.diffuse = [0.75164, 0.60648, 0.22648, 1];
    rock.specular = [0.628281, 0.555802, 0.366065, 1];
    rock.shininess = 0.4;

    var rockNode =
      new TransformationSGNode(glm.transform({ translate: [-5,0, 20], rotateX : 180, scale: 7 }),  [
        rock
      ]);
    root.append(rockNode);
    }


    {
    var textureNode = new TextureSGNode(Object.values(textures)[2], 0, 'u_diffuseTex',
                    new RenderSGNode(resources.yacht));
    //initialize yacht
    let yacht = new MaterialSGNode( textureNode);
    //initialize yacht

    //gold
    yacht.ambient = [0.24725, 0.1995, 0.0745, 1];
    yacht.diffuse = [0.1, 0.1, 0.22648, 1];
    yacht.specular = [0.628281, 0.555802, 0.366065, 1];
    yacht.shininess = 0.4;

    rockNode =
      new TransformationSGNode(glm.transform({ translate: [3,-2, 0], rotateX : 180, scale: 0.1 }),  [
        yacht
      ]);
    root.append(rockNode);
  }

  return root;
}
function createSceneTwo(gl, resources) {
  waterScene2 = createWater(gl,resources);
  const root = new ShaderSGNode(singleShaderProgram);
  root.append(createSkyBox(gl, skyBox2Texture));
  {
    var textureNode = new TextureSGNode(Object.values(textures)[2], 0, 'u_diffuseTex',
                    new RenderSGNode(resources.yacht));
    //initialize yacht
    let yacht = new MaterialSGNode(textureNode);
    //gold
    yacht.ambient = [0.24725, 0.1995, 0.0745, 1];
    yacht.diffuse = [0.75164, 0.60648, 0.22648, 1];
    yacht.specular = [0.628281, 0.555802, 0.366065, 1];
    yacht.shininess = 0.4;

    var yachtNode =
      new TransformationSGNode(glm.transform({ translate: [0,-1.5, 0], rotateX : 180, scale: 0.1 }),  [
        yacht
    ]);
    root.append(yachtNode);
  }
  {
    //initialize yacht
    let light = new LightSGNode([0,1,0]);


    /*var yachtNode =
      new TransformationSGNode(glm.transform({ translate: [0,-1.5, 0], rotateX : 180, scale: 0.1 }),  [
        yacht
    ]);*/
    root.append(light);
  }


  return root;
}
function createSceneThree(gl, resources) {
  waterScene3 = createWater(gl,resources);
  const root = new ShaderSGNode(singleShaderProgram);
  root.append(createSkyBox(gl, skyBox3Texture));
  {
    //initialize yacht
    let island = new MaterialSGNode([ //use now framework implementation of material node
      new RenderSGNode(resources.island)
    ]);
    //gold
    island.ambient = [0.24725, 0.1995, 0.0745, 1];
    island.diffuse = [0.75164, 0.60648, 0.22648, 1];
    island.specular = [0.628281, 0.555802, 0.366065, 1];
    island.shininess = 0.4;

    var islandNode =  new TransformationSGNode(glm.transform({ translate: [0,-0.75, 0], rotateX : 180, scale: 0.08 }),  [
        island
      ]);
  //  root.append(islandNode);
  }

  {
    var textureNode = new TextureSGNode(Object.values(textures)[2], 0, 'u_diffuseTex',
                    new RenderSGNode(resources.yacht));
    //initialize yacht
    let yacht = new MaterialSGNode(textureNode);
    //gold
    yacht.ambient = [0.24725, 0.1995, 0.0745, 1];
    yacht.diffuse = [0.75164, 0.60648, 0.22648, 1];
    yacht.specular = [0.628281, 0.555802, 0.366065, 1];
    yacht.shininess = 0.4;

    var yachtNode =  new TransformationSGNode(glm.transform({ translate: [0,-1.5, 0], rotateX : 180, scale: 0.1 }),  [
        yacht
    ]);
    root.append(yachtNode);
  }

  return root;
}

function initSkyBox1(resources, env_imgs) {
  skyBox1Texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyBox1Texture);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, env_imgs[6]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[5]);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}
function initSkyBox2(resources, env_imgs) {
  skyBox2Texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyBox2Texture);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, env_imgs[6]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[5]);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}
function initSkyBox3(resources, env_imgs) {
  skyBox3Texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyBox3Texture);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, env_imgs[6]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[5]);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
function createSkyBox(gl, texture){
  var skyBox = new ShaderSGNode(skyBoxShaderProgram);
  skyBox.append( new EnvironmentSGNode(texture,4,false,false,false,
                      new RenderSGNode(makeSphere(70))));
  var transformNode =  new TransformationSGNode(glm.translate(0,0,0));
  transformNode.append(skyBox);
  return skyBox;
}
function createWater(gl, resources){

  var waterNode  = new ShaderSGNode(waterShaderProgram);
  let water = new RenderSGNode(resources.waterPlane100_100);
  waterNode .append(new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateZ: -180, scale: 1}), [
      water
    ]));
  return waterNode;
}
function createDebugRect(){
  debugRectNode  = new ShaderSGNode(singleShaderProgram);
  var translateNode = new TransformationSGNode(glm.translate(-2,-2,0));
  var textureNode =  new RenderSGNode(makeRect(3,3));
  translateNode.append(textureNode);
  debugRectNode .append(translateNode);
}

class EnvironmentSGNode extends SGNode {

  constructor(envtexture, textureunit, doReflect, doRefract, useFresnel, children ) {
      super(children);
      this.envtexture = envtexture;
      this.textureunit = textureunit;
      this.doReflect = doReflect;
      this.doRefract = doRefract;
      this.useFresnel = useFresnel;
      this.n2 = 1.55;
      this.n1 = 1.0;
  }

  render(context)
  {
    let invView3x3 = mat3.fromMat4(mat3.create(), context.invViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_invView3x3'), false, invView3x3);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_texCube'), this.textureunit);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useReflection'), this.doReflect);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useRefraction'), this.doRefract);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useFresnel'), this.useFresnel);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_refractionEta'), this.n1/this.n2);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_fresnelR0'), Math.pow((this.n1-this.n2)/(this.n1+this.n2),2));

    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.envtexture);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    super.render(context);

    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
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
  gl.clearColor(0,0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), 30, canvasWidth / canvasHeight, 0.01, 100);
  //very primitive camera implementation

  if(sceneNumber == 0){
    context.viewMatrix = viewMatrixFirstScene(timeInMilliseconds);
  }else if(sceneNumber==1){
    context.viewMatrix = viewMatrixSecondScene(timeInMilliseconds);
  }else if(sceneNumber==2){
    let reversedCameraPosition = [cameraStartPos[0],cameraStartPos[1], cameraStartPos[2]];//Reverse the cameraheight for correct reflection
    let lookAtMatrix = mat4.lookAt(mat4.create(), reversedCameraPosition, [0,0,0], [0,1,0]);
    let mouseRotateMatrix = mat4.multiply(mat4.create(),
                            glm.rotateX(camera.rotation.y),//reverse cameratilt for correct reflection
                            glm.rotateY(camera.rotation.x));
    context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);
    context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);
  }


  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //get inverse view matrix to allow computing eye-to-light matrix
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

  RenderWaterRefractionTexture(context);

  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFrameBuffer);

  gl.useProgram(singleShaderProgram);
  gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 0);
  gl.uniform3fv( gl.getUniformLocation(singleShaderProgram, "u_reverseLightDirection"),reverseSunDirection);
  gl.useProgram(textureShaderProgram);
  gl.uniform3fv( gl.getUniformLocation(textureShaderProgram, "u_reverseLightDirection"), reverseSunDirection);
  renderScene(context);
  gl.useProgram(waterShaderProgram);
  setUpWaterUniforms(timeInMilliseconds);
  bindWaterTextures();
  renderWater(context);
  unbindWaterTextures();


  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.useProgram(bloomShaderProgram);
  gl.uniform1i(gl.getUniformLocation(bloomShaderProgram,'u_tex'),renderTargetBloomTexture);
  gl.viewport(0,0,canvasWidth, canvasHeight);
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  screenQuadRoot.render(context);

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

function viewMatrixSecondScene(timeInMilliseconds){
  var firstKeyframe = 47000;
  var secondKeyframe = 53000;
  var thirdKeyframe = 57000;
  var fourthKeyframe = 66000;
  var fifthKeyframe = 75000;
  var prozent = 0.0;
  var eyeX = 0.0;
  var eyeY = -2;
  var eyeZ = -8;
  var centerZ = 0;
  var alpha=1.0;

  gl.useProgram(bloomShaderProgram);
  gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
  if(undefined === timeInMilliseconds ){
    timeInMilliseconds = 0.0;
  }

  if(timeInMilliseconds < firstKeyframe) {
      prozent = 0.0;
      prozent = calcProzent(timeInMilliseconds, firstKeyframe);
      eyeX = lerp(14, -3, prozent);
  }else if(timeInMilliseconds < secondKeyframe) {
      prozent = calcProzent((timeInMilliseconds - firstKeyframe), secondKeyframe-firstKeyframe);
      eyeX = lerp(-3, -6, prozent);
      eyeY = lerp(-2, -4, prozent);

  } else if(timeInMilliseconds < thirdKeyframe) {
      prozent = calcProzent((timeInMilliseconds - secondKeyframe), thirdKeyframe-secondKeyframe);
      eyeX = lerp(-6, -10, prozent);
      eyeY = lerp(-4, -7, prozent);

  } else if(timeInMilliseconds < fourthKeyframe) {
      prozent = calcProzent((timeInMilliseconds - thirdKeyframe), fourthKeyframe-thirdKeyframe);
      eyeX = lerp(-10, -14, prozent);
      eyeY = lerp(-7, -8, prozent);


  } else if(timeInMilliseconds < fifthKeyframe){
      prozent = calcProzent((timeInMilliseconds - fourthKeyframe), fifthKeyframe-fourthKeyframe);

    alpha= 1 - prozent;
    gl.useProgram(bloomShaderProgram);
    gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
    eyeX = lerp(-14, -14, 1);
    eyeY = lerp(-8, -8, 1);


  }else{
    alpha = 1;
    sceneNumber = 2;
    gl.useProgram(bloomShaderProgram);
    gl.uniform1f(gl.getUniformLocation(bloomShaderProgram,'fadeAlpha'),alpha);
  }

  return calculateViewMatrix(eyeX, eyeY, eyeZ, centerZ);

}


function renderWater(context){
  if(sceneNumber == 0){
    waterScene1.render(context);
  }else if(sceneNumber==1){
    waterScene2.render(context);
  }else if(sceneNumber==2){
    waterScene3.render(context);
  }
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
function renderDebugRect(context){
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(singleShaderProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, waterReflectionColorTexture);
  //gl.bindTexture(gl.TEXTURE_2D, waterRefractionColorTexture);
  gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTex"), 0);
  gl.uniform1i( gl.getUniformLocation(singleShaderProgram, "u_diffuseTexEnabled"), 1);
  debugRectNode .render(context);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.enable(gl.DEPTH_TEST);
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
    if (event.code === 'Space') {
      sceneNumber++;
      sceneNumber = sceneNumber %3;
    }
  });
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
