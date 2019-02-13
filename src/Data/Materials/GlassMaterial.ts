import Material from "./Material";

export default class GlassMaterial extends Material{
  weight: number;
  roughness: number;
  refraction: number;
  attenuation: number;
  constructor (weight: number, roughness: number, refraction: number, attenuation: number) {
    super();
    this.weight = weight || 0;
    this.roughness = roughness || 0;
    this.refraction = refraction || 0;
    this.attenuation = attenuation || 0;
  }
}
