import { EBUStandards } from './types';

export const EBU_R128_STANDARDS: EBUStandards = {
  integratedLoudness: {
    min: -24,
    max: -22,
    target: -23,
  },
  loudnessRange: {
    max: 7,
  },
  truePeak: {
    max: -1,
  },
};

export const EBU_R128_MUSIC_STANDARDS: EBUStandards = {
  integratedLoudness: {
    min: -18,
    max: -14,
    target: -16,
  },
  loudnessRange: {
    max: 20,
  },
  truePeak: {
    max: -1,
  },
};