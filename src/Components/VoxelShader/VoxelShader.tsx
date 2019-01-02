import React from "react";
import { Shaders, Node, GLSL } from "gl-react";
import sampleShader from '../../Shaders/sampleShader.glsl';

interface VoxelShaderProps {
  eye: number[];
  matrixWorldInverse: Float32Array;
  projectionMatrixInverse: Float32Array;
}

const shaders = Shaders.create({
  vt01: {
    frag: GLSL`${sampleShader}`
  }
});

export default class VoxelShader extends React.Component<VoxelShaderProps> {

  render() {

    const { eye, matrixWorldInverse, projectionMatrixInverse } = this.props;

    // console.log(projectionMatrixInverse.multiplyVector4(new Vector4(1,1,0,1)));
    return (
      <Node shader={shaders.vt01} uniforms={{
        eye,
        matrixWorldInverse,
        projectionMatrixInverse
      }} />
    );

  }

}
