import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export interface ViolationEvent {
  type: "face_not_visible" | "multiple_faces" | "looking_away" | "loud_audio_detected" | "phone_detected";
  description: string;
}

export class ProctoringEngine {
  private landmarker: FaceLandmarker | null = null;
  private cocoModel: cocoSsd.ObjectDetection | null = null;
  private animFrameId: number | null = null;
  private video: HTMLVideoElement | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private onViolationCallback: ((event: ViolationEvent) => void) | null = null;

  private noFaceCount = 0;
  private lookingSidewaysCount = 0;
  private loudAudioCount = 0;
  private phoneDetectCount = 0;
  private lastProcessTime = 0;
  private lastCocoTime = 0;
  private isRunning = false;

  async initialize(videoElement: HTMLVideoElement, stream?: MediaStream): Promise<void> {
    this.video = videoElement;
    this.audioStream = stream ?? null;

    try {
      // 1. Initialize MediaPipe FaceLandmarker
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 5,
      });

      // 2. Initialize COCO-SSD for Phone Object Detection (Lazy background load)
      cocoSsd.load({ base: "lite_mobilenet_v2" }).then((model) => {
        this.cocoModel = model;
      }).catch((err) => {
        console.warn("Could not load COCO-SSD phone detection model:", err);
      });

      // 3. Initialize Web Audio API for Audio Level Monitoring
      if (this.audioStream && this.audioStream.getAudioTracks().length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioContextClass();
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 512;
          source.connect(this.analyser);
        } catch (audioErr) {
          console.warn("Could not initialize AudioContext for proctoring:", audioErr);
        }
      }
    } catch (err) {
      console.error("Failed to initialize ProctoringEngine:", err);
    }
  }

  onViolation(callback: (event: ViolationEvent) => void) {
    this.onViolationCallback = callback;
  }

  start() {
    if (this.isRunning || !this.video) return;
    this.isRunning = true;
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    this.detectLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private detectLoop = () => {
    if (!this.isRunning || !this.video) return;

    const now = performance.now();

    // Process face & audio every 1000ms (1 second)
    if (now - this.lastProcessTime >= 1000 && this.video.readyState >= 2) {
      this.lastProcessTime = now;
      try {
        if (this.landmarker) {
          const results = this.landmarker.detectForVideo(this.video, now);
          const numFaces = results.faceLandmarks ? results.faceLandmarks.length : 0;

          // 1. Multiple Faces Detection
          if (numFaces >= 2) {
            this.emitViolation({
              type: "multiple_faces",
              description: `Multiple faces detected in frame (${numFaces} faces visible)`,
            });
          }

          // 2. Face Visibility Detection (3+ seconds missing)
          if (numFaces === 0) {
            this.noFaceCount++;
            if (this.noFaceCount >= 3) {
              this.emitViolation({
                type: "face_not_visible",
                description: "Student face is not visible in camera feed",
              });
              this.noFaceCount = 0;
            }
          } else {
            this.noFaceCount = 0;
          }

          // 3. Directional Head Pose / Gaze Detection
          if (numFaces === 1) {
            const landmarks = results.faceLandmarks[0];
            const noseTip = landmarks[1];
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];

            if (noseTip && leftEar && rightEar) {
              const faceWidth = Math.abs(rightEar.x - leftEar.x);
              const noseRelativeX = (noseTip.x - leftEar.x) / (faceWidth || 1);

              // IGNORE LOOKING DOWN (scratch paper) & LOOKING UP (thinking)
              // ONLY FLAG SIDEWAYS TURNS (Left/Right)
              const isLookingSideways = noseRelativeX < 0.20 || noseRelativeX > 0.80;

              if (isLookingSideways) {
                this.lookingSidewaysCount++;
                if (this.lookingSidewaysCount >= 4) {
                  this.emitViolation({
                    type: "looking_away",
                    description: "Student is repeatedly turning head sideways away from screen",
                  });
                  this.lookingSidewaysCount = 0;
                }
              } else {
                this.lookingSidewaysCount = 0;
              }
            }
          }
        }

        // 4. Audio Level Check (Loud background speech/audio)
        if (this.analyser) {
          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const averageVolume = Math.sqrt(sum / dataArray.length);

          if (averageVolume > 65) {
            this.loudAudioCount++;
            if (this.loudAudioCount >= 4) {
              this.emitViolation({
                type: "loud_audio_detected",
                description: "Sustained loud audio / speech detected in background microphone feed",
              });
              this.loudAudioCount = 0;
            }
          } else {
            this.loudAudioCount = 0;
          }
        }
      } catch (err) {
        console.warn("FaceLandmarker detection error:", err);
      }
    }

    // 5. COCO-SSD Phone Object Detection (runs every 2500ms to save resources)
    if (this.cocoModel && now - this.lastCocoTime >= 2500 && this.video.readyState >= 2) {
      this.lastCocoTime = now;
      this.cocoModel.detect(this.video).then((predictions) => {
        const phonePrediction = predictions.find(
          (p) => (p.class === "cell phone" || p.class === "remote") && p.score >= 0.50
        );

        if (phonePrediction) {
          this.phoneDetectCount++;
          if (this.phoneDetectCount >= 2) {
            this.emitViolation({
              type: "phone_detected",
              description: `Mobile phone or handheld electronic device detected in camera feed (${Math.round(phonePrediction.score * 100)}% confidence)`,
            });
            this.phoneDetectCount = 0;
          }
        } else {
          this.phoneDetectCount = 0;
        }
      }).catch(() => {});
    }

    this.animFrameId = requestAnimationFrame(this.detectLoop);
  };

  private emitViolation(event: ViolationEvent) {
    if (this.onViolationCallback) {
      this.onViolationCallback(event);
    }
  }
}
