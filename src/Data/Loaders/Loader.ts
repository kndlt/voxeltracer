import VoxelScene from "../Models/VoxelScene";
import Context from "./Context";
import MagicaVoxelContext from "../MagicaVoxel/MagicaVoxelContext";

export default class Loader {

  private contexts: { [_: string]: Context }  = {
    'vox': new MagicaVoxelContext()
  }

  private getPotentialDecoders(url: string, buffer: ArrayBuffer): Context[] {
    const contexts: Context[] = [];
    if (url.endsWith('.vox')) {
      contexts.push(this.contexts.vox);
    }
    return contexts;
  }

  public loadUrl(url: string): Promise<VoxelScene> {
    const request = new Request(url, {
      headers: new Headers({'Content-Type': 'application/octet-stream'})
    });

    return fetch(request).then((response) => {
      if (!response.ok) {
        throw Error(`Unable to download, server returned ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer().then((buffer) => {
        let contexts = this.getPotentialDecoders(url, buffer);

        if (!contexts.length) {
          throw "Was unable to find a context for the file.";
        }

        let scene: VoxelScene | null = null;
        for (let i = 0; i < contexts.length; ++i) {
          const context = contexts[i];
          scene = context.parseScene(buffer);
          if (scene) {
            break;
          }
        }

        if (!scene) {
          throw "Unable to read the file.";
        }

        return scene;
      });
    });
  }
}
