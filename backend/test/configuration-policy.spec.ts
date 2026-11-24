import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { thresholdsAreOrdered } from '../src/devices/configuration-policy.ts';

describe('voltage threshold ordering', () => {
  it('accepts the default single-phase supply thresholds', () => {
    assert.equal(thresholdsAreOrdered({
      criticalLowVoltageThreshold: 180,
      lowVoltageThreshold: 210,
      highVoltageThreshold: 250,
      criticalHighVoltageThreshold: 270,
    }), true);
  });

  it('rejects equal or inverted adjacent thresholds', () => {
    assert.equal(thresholdsAreOrdered({
      criticalLowVoltageThreshold: 180,
      lowVoltageThreshold: 180,
      highVoltageThreshold: 250,
      criticalHighVoltageThreshold: 270,
    }), false);
    assert.equal(thresholdsAreOrdered({
      criticalLowVoltageThreshold: 180,
      lowVoltageThreshold: 210,
      highVoltageThreshold: 275,
      criticalHighVoltageThreshold: 270,
    }), false);
  });
});