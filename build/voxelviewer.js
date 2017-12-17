(function () {
'use strict';

/**
 * Voxelviewer
 * @author kndlt
 */
function main() {

  var angleX = 30;
  var angleY = 10;
  var gl = GL.create({ version: 2 });

  if( gl.webgl_version != 2 || !gl )
  {
    alert("WebGL 2.0 not supported by your browser");
    return;
  }

  var gridSize = vec3.fromValues(4, 4, 4);

  var gridCenter = vec3.fromValues(2, 2, 2);

  var toLight = vec3.fromValues(0.5, 0.7, 1.0);

  // Normalize light direction
  toLight = vec3.normalize(toLight, toLight);

  var planeMesh = GL.Mesh.plane();

  // var cubeMesh = GL.Mesh.cube({ size: 16, wireframe: true });

  var flatShader = GL.Shader.getFlatShader();

  var voxelData = (function () {
    var data = new Uint8Array( gridSize[0] * gridSize[1] * gridSize[2] * 4 );
    for(var i = 0; i < data.length; ++i) {
      data[i] = Math.random() * 255;
    }
    return data;
  })();

  var voxelTexture = new GL.Texture(gridSize[0], gridSize[1], {
    depth: gridSize[2],
    texture_type: GL.TEXTURE_3D,
    format: gl.RGBA,
    magFilter: gl.NEAREST,
    pixel_data: voxelData
  });

  var voxelShader = new GL.Shader(
    document.getElementById("shader-vs").text,
    document.getElementById("shader-fs").text
  );

  // Create basic matrices for cameras and transformation

  var persp = mat4.create();

  var view = mat4.create();

  var model = mat4.create();

  var mvp = mat4.create();

  var temp = mat4.create();

  var identity = mat4.create();

  // Get mouse actions
  gl.captureMouse();

  gl.onmousemove = function(e)
  {
  	if(e.dragging) {
      mat4.rotateY(model, model, e.deltax * 0.01);
    }
    gl.ondraw();
  };

  // Generic gl flags and settings
  // @TODO Might want this.
  // gl.enable( gl.DEPTH_TEST );

  gl.ondraw = function() {

    // @TODO Might not want this.
  	gl.clearColor(0.1,0.1,0.1,1);

  	// gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // Set the camera position
    mat4.perspective(persp, 45 * DEG2RAD, gl.canvas.width / gl.canvas.height, 0.1, 1000);
    mat4.lookAt(view, [0,4,10],[0,0,0], [0,1,0]);

    // Create modelview and projection matrices
    mat4.multiply(temp, view, model);
  	mat4.multiply(mvp, persp, temp);

    // Get corner rays
    var w = gl.canvas.width;
    var h = gl.canvas.height;
    var tracer = new GL.Raytracer(mvp);
    voxelShader.uniforms({
      eye: tracer.eye,
      size: gridSize,
      center: gridCenter,
			voxelTexture: voxelTexture.bind(0),
      toLight: toLight,
      ray00: tracer.getRayForPixel(0, h),
      ray10: tracer.getRayForPixel(w, h),
      ray01: tracer.getRayForPixel(0, 0),
      ray11: tracer.getRayForPixel(w, 0)
    });

    // Trace the rays
    voxelShader.draw(planeMesh);

    // Bounding box overlay
		// flatShader.uniforms({
		// 	u_color: [1,1,1,1],
		// 	u_mvp: mvp
		// }).draw(cubeMesh, gl.LINES, "wireframe" );
  };

  // Attach canvas
  var container = document.body;

  container.appendChild(gl.canvas);

  // On resize
  function resize() {
    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.ondraw();
  }

  window.addEventListener('resize', resize);

  resize();
}

main();

}());
//# sourceMappingURL=voxelviewer.js.map
