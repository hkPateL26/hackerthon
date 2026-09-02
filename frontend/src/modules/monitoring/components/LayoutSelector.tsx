import React from 'react';
import type { LayoutMode } from '../types/monitoring';
import { LAYOUT_CONFIGS } from '../hooks/useMonitoring';
import styles from './LayoutSelector.module.css';

interface LayoutSelectorProps {
  currentLayout: LayoutMode;
  onSelectLayout: (layout: LayoutMode) => void;
}

const LAYOUT_OPTIONS: Array<{ id: LayoutMode; label: string; icon: string }> = [
  { id: '1x1', label: '1x1', icon: '⏹' },
  { id: '2x2', label: '2x2', icon: '⊞' },
  { id: '2x3', label: '2x3', icon: '▥' },
  { id: '3x3', label: '3x3', icon: '▦' },
];

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentLayout,
  onSelectLayout,
}) => {
  return (
    <div className={styles.layoutGroup} role="group" aria-label="Monitoring Grid Layout Controls">
      {LAYOUT_OPTIONS.map((opt) => {
        const isActive = currentLayout === opt.id;
        const config = LAYOUT_CONFIGS[opt.id];
        return (
          <button
            key={opt.id}
            type="button"
            className={`${styles.layoutBtn} ${isActive ? styles.layoutBtnActive : ''}`}
            onClick={() => onSelectLayout(opt.id)}
            title={`Switch to ${config.label}`}
            aria-pressed={isActive}
            id={`layout-btn-${opt.id}`}
          >
            <span className={styles.gridIcon}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
