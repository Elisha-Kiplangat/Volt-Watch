export interface VoltageThresholds {
  criticalLowVoltageThreshold: number
  lowVoltageThreshold: number
  highVoltageThreshold: number
  criticalHighVoltageThreshold: number
}

export function thresholdsAreOrdered(thresholds: VoltageThresholds) {
  return thresholds.criticalLowVoltageThreshold < thresholds.lowVoltageThreshold &&
    thresholds.lowVoltageThreshold < thresholds.highVoltageThreshold &&
    thresholds.highVoltageThreshold < thresholds.criticalHighVoltageThreshold;
}