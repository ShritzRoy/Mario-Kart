import { useEffect, useRef, useState } from 'react';
import type { ControlMode } from '../game/engine.ts';
import type { DeviceTier } from './CircularAbilityWheel.tsx';

interface MobileControlsProps {
  controlMode: ControlMode;
  autoAccel: boolean;
  deviceTier: DeviceTier;
  onUpdate: (
    steer: number,
    drift: boolean,
    triggerItem: boolean,
    throttle: boolean,
    brake: boolean
  ) => void;
}

export function MobileControls({
  controlMode,
  autoAccel,
  deviceTier,
  onUpdate,
}: MobileControlsProps) {
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
  const compact = deviceTier === 'mobile';
  const joyMax = compact ? 32 : 42;
  const btnPrimary = compact ? 50 : 62;
  const btnSecondary = compact ? 44 : 54;
  const btnSmall = compact ? 38 : 46;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 sm:bottom-4 px-2.5 sm:px-5 flex items-end justify-between z-30">
      {/* Left Thumb Zone: Circular Analog Joystick OR Circular Left/Right Steer Buttons */}
      {useJoystick ? (
        <div
          className="pointer-events-auto relative rounded-full border-2 border-white/30 touch-none flex items-center justify-center shadow-2xl"
          style={{
            width: compact ? 96 : 124,
            height: compact ? 96 : 124,
            backgroundColor: 'rgba(10, 15, 28, 0.72)',
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            joyPointerIdRef.current = e.pointerId;
            const rect = e.currentTarget.getBoundingClientRect();
            joyCenterRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            const dx = Math.max(-joyMax, Math.min(joyMax, e.clientX - joyCenterRef.current.x));
            const dy = Math.max(-joyMax, Math.min(joyMax, e.clientY - joyCenterRef.current.y));
            setJoyKnob({ x: dx, y: dy });
            stateRef.current.steer = dx / joyMax;
            pushUpdate();
          }}
          onPointerMove={(e) => {
            if (joyPointerIdRef.current !== e.pointerId) return;
            const dx = Math.max(-joyMax, Math.min(joyMax, e.clientX - joyCenterRef.current.x));
            const dy = Math.max(-joyMax, Math.min(joyMax, e.clientY - joyCenterRef.current.y));
            setJoyKnob({ x: dx, y: dy });
            stateRef.current.steer = dx / joyMax;
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
            className="rounded-full bg-amber-400 border-2 border-white shadow-lg"
            style={{
              width: compact ? 42 : 54,
              height: compact ? 42 : 54,
              transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
            }}
          />
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2 touch-none">
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
            className="rounded-full border-2 border-white/35 text-white font-black shadow-xl active:scale-95 flex items-center justify-center"
            style={{
              width: btnPrimary,
              height: btnPrimary,
              fontSize: compact ? 18 : 22,
              backgroundColor: 'rgba(10, 15, 28, 0.78)',
            }}
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
            className="rounded-full border-2 border-white/35 text-white font-black shadow-xl active:scale-95 flex items-center justify-center"
            style={{
              width: btnPrimary,
              height: btnPrimary,
              fontSize: compact ? 18 : 22,
              backgroundColor: 'rgba(10, 15, 28, 0.78)',
            }}
          >
            ▶
          </button>
        </div>
      )}

      {/* Right Thumb Zone: All Circular Buttons (Item + Drift + Brake + Gas) */}
      <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2 touch-none">
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
          className="rounded-full border-2 border-sky-200/80 bg-sky-500/90 text-slate-950 font-black uppercase shadow-xl active:scale-95 flex items-center justify-center"
          style={{ width: btnSecondary, height: btnSecondary, fontSize: compact ? 10 : 11 }}
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
          className="rounded-full border-2 border-amber-200/85 bg-amber-400/95 text-slate-950 font-black uppercase shadow-xl active:scale-95 flex items-center justify-center"
          style={{ width: btnPrimary, height: btnPrimary, fontSize: compact ? 10 : 12 }}
        >
          Drift
        </button>

        {!autoAccel && (
          <div className="flex items-end gap-1.5 sm:gap-2">
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
              className="rounded-full border-2 border-rose-200/70 bg-rose-600/90 text-white font-black uppercase shadow-xl active:scale-95 flex items-center justify-center"
              style={{ width: btnSmall, height: btnSmall, fontSize: 9 }}
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
              className="rounded-full border-2 border-emerald-200/80 bg-emerald-500/95 text-slate-950 font-black uppercase shadow-xl active:scale-95 flex items-center justify-center"
              style={{ width: btnPrimary, height: btnPrimary, fontSize: compact ? 11 : 12 }}
            >
              Gas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
