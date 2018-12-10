import React, { Component } from 'react';
import { Shaders, Node, GLSL } from "gl-react";
import { Surface } from "gl-react-dom";
import logo from './logo.svg';
import './App.css';

const shaders = Shaders.create({
  helloBlue: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform float blue;
      void main() {
        gl_FragColor = vec4(uv.x, uv.y, blue, 1.0);
      }
    `
  }
});

class VoxelViewer extends React.Component {
  render() {
    return (
      // @ts-ignore
      <Surface width={300} height={300}>
        <Node shader={shaders.helloBlue} uniforms={{ blue: 0.5 }} />
      </Surface>
    );
  }
}

export default class App extends Component {
  render() {
    return (
      <div className="App">
        <VoxelViewer />
      </div>
    );
  }
}
