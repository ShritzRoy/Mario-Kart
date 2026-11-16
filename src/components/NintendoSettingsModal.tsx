import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, X } from 'lucide-react';
import type { ControlMode } from '../game/engine.ts';

interface NintendoSettingsModalProps {
  open: boolean;
  smartSteering: boolean;
  autoAccel: boolean;
  autoUseItem: boolean;
  controlMode: ControlMode;
  cameraTilt: boolean;
  soundMuted: boolean;
  onChangeSmartSteering: (v: boolean) => void;
  onChangeAutoAccel: (v: boolean) => void;
  onChangeAutoUseItem: (v: boolean) => void;
  onChangeControlMode: (m: ControlMode) => void;
  onChangeCameraTilt: (v: boolean) => void;
  onChangeSoundMuted: (v: boolean) => void;
  onReturnHome: () => void;
  onClose: () => void;
  onPlaySelect?: () => void;
}

const CONTROL_MODES: { id: ControlMode; label: string }[] = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'controller', label: 'Controller' },
  { id: 'mobile_joystick', label: 'Joystick' },
  { id: 'mobile_buttons', label: 'Touch Pads' },
];

export function NintendoSettingsModal({
  open,
  smartSteering,
  autoAccel,
  autoUseItem,
  controlMode,
  cameraTilt,
  soundMuted,
  onChangeSmartSteering,
  onChangeAutoAccel,
  onChangeAutoUseItem,
  onChangeControlMode,
  onChangeCameraTilt,
  onChangeSoundMuted,
  onReturnHome,
  onClose,
  onPlaySelect,
}: NintendoSettingsModalProps) {
  const [activeRow, setActiveRow] = useState<number>(1);

  if (!open) return null;

  const cycleControl = (dir: -1 | 1) => {
    const idx = CONTROL_MODES.findIndex((c) => c.id === controlMode);
    const next = CONTROL_MODES[(idx + dir + CONTROL_MODES.length) % CONTROL_MODES.length];
    onChangeControlMode(next.id);
    onPlaySelect?.();
  };

  const controlLabel = CONTROL_MODES.find((c) => c.id === controlMode)?.label ?? 'Keyboard';

  const rows: {
    id: string;
    label: string;
    value: string;
    onStep: (dir: -1 | 1) => void;
  }[] = [
    {
      id: 'smart_steering',
      label: 'Smart Steering',
      value: smartSteering ? 'On' : 'Off',
      onStep: () => {
        onChangeSmartSteering(!smartSteering);
        onPlaySelect?.();
      },
    },
    {
      id: 'auto_accel',
      label: 'Auto-Accelerate',
      value: autoAccel ? 'On' : 'Off',
      onStep: () => {
        onChangeAutoAccel(!autoAccel);
        onPlaySelect?.();
      },
    },
    {
      id: 'auto_item',
      label: 'Auto-Use Item',
      value: autoUseItem ? 'On' : 'Off',
      onStep: () => {
        onChangeAutoUseItem(!autoUseItem);
        onPlaySelect?.();
      },
    },
    {
      id: 'control_mode',
      label: 'Control Mode',
      value: controlLabel,
      onStep: (dir) => cycleControl(dir),
    },
    {
      id: 'camera_tilt',
      label: 'Camera Tilt',
      value: cameraTilt ? 'Dynamic' : 'Level',
      onStep: () => {
        onChangeCameraTilt(!cameraTilt);
        onPlaySelect?.();
      },
    },
    {
      id: 'sound',
      label: 'Sound & Music',
      value: soundMuted ? 'Muted' : 'On',
      onStep: () => {
        onChangeSoundMuted(!soundMuted);
        onPlaySelect?.();
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-mk"
      style={{ backgroundColor: 'rgba(8, 12, 22, 0.72)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative w-full max-w-[600px] rounded-[34px] bg-white border-[5px] border-[#261c15] shadow-[0_24px_65px_rgba(0,0,0,0.68)] px-4 sm:px-7 py-5 sm:py-6"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148,163,184,0.12) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Corner Button */}
        <button
          onClick={onClose}
          title="Close Settings"
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#ef4444] hover:bg-[#f87171] border-[3px] border-[#261c15] text-white flex items-center justify-center shadow-xl cursor-pointer transition hover:scale-105"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Pill Rows matching Nintendo Switch MK Settings UI */}
        <div className="space-y-2 sm:space-y-2.5">
          {rows.map((row, idx) => {
            const isSelected = activeRow === idx;
            return (
              <div key={row.id} className="relative flex items-center">
                {isSelected && (
                  <span className="hidden sm:block absolute -left-3.5 text-[#facc15] drop-shadow-[0_2px_0_#261c15] text-lg select-none">
                    ◀
                  </span>
                )}
                <div
                  onMouseEnter={() => setActiveRow(idx)}
                  onClick={() => {
                    setActiveRow(idx);
                    row.onStep(1);
                  }}
                  className={`w-full rounded-full px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#fde047] shadow-[0_4px_14px_rgba(250,204,21,0.55)] scale-[1.015] border-2 border-[#f59e0b]'
                      : 'bg-slate-100/95 hover:bg-slate-200/80 border-2 border-transparent'
                  }`}
                >
                  <span
                    className={`italic text-sm sm:text-lg tracking-wide truncate ${
                      isSelected ? 'text-white mk-stroke-sm' : 'text-slate-500'
                    }`}
                  >
                    {row.label}
                  </span>

                  <div
                    className="flex items-center gap-3 sm:gap-5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRow(idx);
                        row.onStep(-1);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs sm:text-sm transition cursor-pointer ${
                        isSelected
                          ? 'bg-white/95 text-[#261c15] border-2 border-[#261c15] hover:scale-110'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ◀
                    </button>

                    <span
                      className={`min-w-[82px] sm:min-w-[104px] text-center italic text-sm sm:text-lg ${
                        isSelected ? 'text-white mk-stroke-sm' : 'text-slate-700'
                      }`}
                    >
                      {row.value}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveRow(idx);
                        row.onStep(1);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs sm:text-sm transition cursor-pointer ${
                        isSelected
                          ? 'bg-white/95 text-[#261c15] border-2 border-[#261c15] hover:scale-110'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ▶
                    </button>
                  </div>
                </div>
                {isSelected && (
                  <span className="hidden sm:block absolute -right-3.5 text-[#facc15] drop-shadow-[0_2px_0_#261c15] text-lg select-none">
                    ▶
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions: Return to Home + Resume/Done */}
        <div className="mt-4 pt-3 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onPlaySelect?.();
              onClose();
              onReturnHome();
            }}
            className="flex-1 min-w-[155px] py-2.5 px-4 rounded-full bg-gradient-to-b from-[#ef4444] to-[#dc2626] hover:brightness-110 border-[3px] border-[#261c15] text-white italic text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95 mk-stroke-sm"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Return to Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPlaySelect?.();
              onClose();
            }}
            className="flex-1 min-w-[130px] py-2.5 px-4 rounded-full bg-gradient-to-b from-[#38bdf8] to-[#0284c7] hover:brightness-110 border-[3px] border-[#261c15] text-white italic text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95 mk-stroke-sm"
          >
            <span>OK / Resume</span>
          </button>
        </div>

        {/* Classic Nintendo Yellow Pointer Pip on Bottom Lip */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-[#facc15] drop-shadow-[0_2px_0_#261c15]" />
      </motion.div>
    </div>
  );
}
