/**
 * This random code is from https://github.com/evanw/webgl-path-tracing
 */
int mod(int a, int b) {
    return a-a/b*b;
}

#pragma glslify: export(mod)
