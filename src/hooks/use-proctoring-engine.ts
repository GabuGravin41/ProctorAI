import { useEffect, useRef, useState } from "react";
import { ProctoringEngine, ViolationEvent } from "@/lib/proctoring-engine";

export function useProctoringEngine(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  enabled: boolean,
  onViolation: (event: ViolationEvent) => void
) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<ProctoringEngine | null>(null);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const engine = new ProctoringEngine();
    engineRef.current = engine;

    let isMounted = true;

    async function init() {
      if (!videoRef.current) return;
      setIsInitializing(true);
      await engine.initialize(videoRef.current, stream ?? undefined);
      if (isMounted) {
        engine.onViolation(onViolation);
        engine.start();
        setEngineReady(true);
        setIsInitializing(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      engine.stop();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [enabled, videoRef, stream]);

  return { isInitializing, engineReady };
}
