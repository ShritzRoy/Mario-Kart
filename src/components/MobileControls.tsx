import { useEffect, useRef, useState } from 'react';
import type { ControlMode } from '../game/engine.ts';

interface MobileControlsProps {
  controlMode: ControlMode;
  autoAccel: boolean;
  onUpdate: (
    steer: number,
    drift: boolean,
    triggerItem: boolean,
    throttle: boolean,
    brake: boolean
  ) => void;
}

export function MobileControls({ controlMode, autoAccel, onUpdate }: MobileControlsProps) {
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyPointerIdRef = useRef<number | null>(null);
  const joyCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const stateRef = useRef({
    steer: 0,
    left: false,
    right: false,
    throttle: false,
    brake: false,
    drift: false,
    item: false,
  });

  const isActive =
    controlMode === 'mobile_joystick' || controlMode === 'mobile_buttons';

  const pushUpdate = () => {
    const s = stateRef.current;
    const steer =
      controlMode === 'mobile_joystick'
        ? s.steer
        : (s.right ? 1 : 0) - (s.left ? 1 : 0);
    onUpdate(steer, s.drift, s.item, s.throttle || autoAccel, s.brake);
  };

  useEffect(() => {
    if (isActive) {
      pushUpdate();
    } else {
      onUpdate(0, false, false, false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccel, controlMode]);

  if (!isActive) return null;

  const useJoystick = controlMode === 'mobile_joystick';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 sm:bottom-5 px-3 sm:px-5 flex items-end justify-between z-30">
      {/* Left Thumb Zone: Circular Analog Joystick OR Circular Left/Right Steer Buttons */}
      {useJoystick ? (
        <div
          className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-white/30 touch-none flex items-center justify-center shadow-2xl"
          style={{ backgroundColor: 'rgba(10, 15, 28, 0.72)' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            joyPointerIdRef.current = e.pointerId;
            const rect = e.currentTarget.getBoundingClientRect();
            joyCenterRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            const dx = Math.max(-40, Math.min(40, e.clientX - joyCenterRef.current.x));
            const dy = Math.max(-40, Math.min(40, e.clientY - joyCenterRef.current.y));
            setJoyKnob({ x: dx, y: dy });
            stateRef.current.steer = dx / 40;
            pushUpdate();
          }}
          onPointerMove={(e) => {
            if (joyPointerIdRef.current !== e.pointerId) return;
            const dx = Math.max(-40, Math.min(40, e.clientX - joyCenterRef.current.x));
            const dy = Math.max(-40, Math.min(40, e.clientY - joyCenterRef.current.y));
            setJoyKnob({ x: dx, y: dy });
            stateRef.current.steer = dx / 40;
            pushUpdate();
          }}
          onPointerUp={(e) => {
            if (joyPointerIdRef.current !== e.pointerId) return;
            joyPointerIdRef.current = null;
            setJoyKnob({ x: 0, y: 0 });
            stateRef.current.steer = 0;
            pushUpdate();
          }}
          onPointerCancel={() => {
            joyPointerIdRef.current = null;
            setJoyKnob({ x: 0, y: 0 });
            stateRef.current.steer = 0;
            pushUpdate();
          }}
        >
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 border-2 border-white shadow-lg"
            style={{
              transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
            }}
          />
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2.5 touch-none">
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              stateRef.current.left = true;
              pushUpdate();
            }}
            onPointerUp={() => {
              stateRef.current.left = false;
              pushUpdate();
            }}
            onPointerCancel={() => {
              stateRef.current.left = false;
              pushUpdate();
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/35 text-white font-black text-xl sm:text-2xl shadow-xl active:scale-95 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(10, 15, 28, 0.78)' }}
          >
            ◀
          </button>
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              stateRef.current.right = true;
              pushUpdate();
            }}
            onPointerUp={() => {
              stateRef.current.right = false;
              pushUpdate();
            }}
            onPointerCancel={() => {
              stateRef.current.right = false;
              pushUpdate();
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/35 text-white font-black text-xl sm:text-2xl shadow-xl active:scale-95 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(10, 15, 28, 0.78)' }}
          >
            ▶
          </button>
        </div>
      )}

      {/* Right Thumb Zone: All Circular Buttons (Item + Drift + Gas + Brake) */}
      <div className="pointer-events-auto flex items-end gap-2 touch-none">
        <button
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            stateRef.current.item = true;
            pushUpdate();
          }}
          onPointerUp={() => {
            stateRef.current.item = false;
            pushUpdate();
          }}
          onPointerCancel={() => {
            stateRef.current.item = false;
            pushUpdate();
          }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-sky-200/80 bg-sky-500/90 text-slate-950 font-black text-[11px] uppercase shadow-xl active:scale-95 flex items-center justify-center"
        >
          Item
        </button>

        <button
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            stateRef.current.drift = true;
            pushUpdate();
          }}
          onPointerUp={() => {
            stateRef.current.drift = false;
            pushUpdate();
          }}
          onPointerCancel={() => {
            stateRef.current.drift = false;
            pushUpdate();
          }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-200/85 bg-amber-400/95 text-slate-950 font-black text-[11px] sm:text-xs uppercase shadow-xl active:scale-95 flex items-center justify-center"
        >
          Drift
        </button>

        {!autoAccel && (
          <div className="flex items-end gap-2">
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                stateRef.current.brake = true;
                pushUpdate();
              }}
              onPointerUp={() => {
                stateRef.current.brake = false;
                pushUpdate();
              }}
              onPointerCancel={() => {
                stateRef.current.brake = false;
                pushUpdate();
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-rose-200/70 bg-rose-600/90 text-white font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center justify-center"
            >
              Brk
            </button>

            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                stateRef.current.throttle = true;
                pushUpdate();
              }}
              onPointerUp={() => {
                stateRef.current.throttle = false;
                pushUpdate();
              }}
              onPointerCancel={() => {
                stateRef.current.throttle = false;
                pushUpdate();
              }}
              className="w-15 h-15 sm:w-16 sm:h-16 rounded-full border-2 border-emerald-200/80 bg-emerald-500/95 text-slate-950 font-black text-xs uppercase shadow-xl active:scale-95 flex items-center justify-center"
            >
              Gas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
