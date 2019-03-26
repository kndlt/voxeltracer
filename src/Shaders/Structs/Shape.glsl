struct Shape {
  int modelIndex;
  int byteOffset;
  // TODO: Passing two matrices are quite expansive. Let's fine another way.
  mat4 modelMatrix;
  mat4 invertedModelMatrix;
  ivec3 size;
  ivec3 pos;
};

#pragma glslify: export(Shape)
