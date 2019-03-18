/**
 * Bytes to String
 * Code is from Stack Overflow answer
 * https://stackoverflow.com/a/3195961
 */
export function b2s(typedArray: Uint8Array): string {
  // @ts-ignore
  return String.fromCharCode.apply(String, typedArray);
}

export function uint8(buffer: ArrayBuffer, byteOffset: number, length: number): Uint8Array {
  return new Uint8Array(buffer, byteOffset, length);
}
