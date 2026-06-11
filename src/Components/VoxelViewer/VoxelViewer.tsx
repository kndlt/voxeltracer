import { useEffect, useRef, useState } from 'react';
import VoxelScene from '../../Data/Models/VoxelScene';
import { createVoxelTracer, VoxelTracer } from '../../core/createVoxelTracer';
import { MAX_TICK } from '../../Renderer/VoxelRenderer';
import { availableVoxelFiles } from './voxFileList';
import './VoxelViewer.css';

export interface VoxelViewerProps {
  src: string | File;
  devicePixelRatio?: number;
  onRendered?: () => void;
  onFileChange?: (src: string) => void;
  maxSteps?: number;
}

export default function VoxelViewer(props: VoxelViewerProps) {
  const { src, onFileChange, onRendered, maxSteps, devicePixelRatio } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const tracerRef = useRef<VoxelTracer | null>(null);
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;

  const [scene, setScene] = useState<VoxelScene | null>(null);
  const [status, setStatus] = useState('Loading…');
  const [error, setError] = useState<string | null>(null);

  // Tracer lifecycle (mount once)
  useEffect(() => {
    const maxTick = maxSteps ?? MAX_TICK;
    try {
      tracerRef.current = createVoxelTracer({
        container: containerRef.current!,
        devicePixelRatio,
        maxSteps: maxTick,
        onTick: (tick, ms) => {
          const fps = ms > 0 ? ((tick / ms) * 1000).toFixed(2) : '0';
          setStatus(
            tick >= maxTick
              ? `Rendering Completed (took ${Math.round(ms)}ms) — FPS: ${fps}`
              : `Rendering (${tick}/${maxTick}) — FPS: ${fps}`
          );
        },
        onRendered: () => onRenderedRef.current?.(),
      });
    } catch (e) {
      setError(`WebGL2 is required: ${String(e)}`);
      return;
    }
    return () => {
      tracerRef.current?.dispose();
      tracerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scene loading
  useEffect(() => {
    if (!tracerRef.current) return;
    let cancelled = false;
    setStatus('Loading…');
    tracerRef.current
      .load(src)
      .then((loaded) => {
        if (!cancelled) {
          setScene(loaded);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const filenameText = src instanceof File ? src.name : src;
  const voxelSize = scene && scene.models.length > 0 ? scene.models[0].size : undefined;
  const voxelSizeText = voxelSize
    ? `Voxel Size: ${voxelSize.x}x${voxelSize.y}x${voxelSize.z} (${scene!.models.length} models)`
    : '';

  return (
    <div className="voxel-viewer">
      <div className="top-bar">VoxelTracer V1.0</div>
      <div className="voxel-viewer-surface-container" ref={containerRef} />
      <div className="status-panel">
        <div>
          <select value={filenameText} onChange={(e) => onFileChange?.(e.target.value)}>
            {availableVoxelFiles.map((filename) => (
              <option key={filename} value={filename}>
                {filename}
              </option>
            ))}
          </select>
        </div>
        <div>{voxelSizeText}</div>
        <div>{error ?? status}</div>
      </div>
    </div>
  );
}
