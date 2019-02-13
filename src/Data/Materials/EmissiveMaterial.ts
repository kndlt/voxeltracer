import Material from "./Material";

export default class EmmissiveMaterial extends Material{
  weight: number;
  flux: number;
  glow: number;
  constructor (weight: number, flux: number, glow: number) {
    super();
    this.weight = weight || 0;
    this.flux = flux || 0;
    this.glow = glow || 0;
  }
}
