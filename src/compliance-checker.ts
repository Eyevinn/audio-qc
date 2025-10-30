import { EBULoudnessMetrics, EBUComplianceResult, EBUStandards } from './types';
import { EBU_R128_STANDARDS } from './ebu-standards';

export class ComplianceChecker {
  private standards: EBUStandards;

  constructor(standards: EBUStandards = EBU_R128_STANDARDS) {
    this.standards = standards;
  }

  checkCompliance(
    filePath: string,
    metrics: EBULoudnessMetrics
  ): EBUComplianceResult {
    const violations: string[] = [];

    if (
      metrics.integratedLoudness < this.standards.integratedLoudness.min ||
      metrics.integratedLoudness > this.standards.integratedLoudness.max
    ) {
      violations.push(
        `Integrated loudness ${metrics.integratedLoudness} LUFS is outside acceptable range (${this.standards.integratedLoudness.min} to ${this.standards.integratedLoudness.max} LUFS)`
      );
    }

    if (metrics.loudnessRange > this.standards.loudnessRange.max) {
      violations.push(
        `Loudness range ${metrics.loudnessRange} LU exceeds maximum of ${this.standards.loudnessRange.max} LU`
      );
    }

    if (metrics.truePeakMax > this.standards.truePeak.max) {
      violations.push(
        `True peak ${metrics.truePeakMax} dBTP exceeds maximum of ${this.standards.truePeak.max} dBTP`
      );
    }

    return {
      file: filePath,
      isCompliant: violations.length === 0,
      metrics,
      violations,
      timestamp: new Date().toISOString(),
    };
  }

  static formatReport(result: EBUComplianceResult): string {
    const status = result.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT';
    
    let report = `\nEBU R128 Compliance Report for: ${result.file}\n`;
    report += `Status: ${status}\n`;
    report += `Analysis Time: ${result.timestamp}\n\n`;
    
    report += 'Measured Values:\n';
    report += `  Integrated Loudness: ${result.metrics.integratedLoudness} LUFS\n`;
    report += `  Loudness Range: ${result.metrics.loudnessRange} LU\n`;
    report += `  True Peak Max: ${result.metrics.truePeakMax} dBTP\n`;
    report += `  Momentary Max: ${result.metrics.momentaryMax} LUFS\n`;
    report += `  Short-term Max: ${result.metrics.shortTermMax} LUFS\n\n`;

    if (result.violations.length > 0) {
      report += 'Violations:\n';
      result.violations.forEach((violation, index) => {
        report += `  ${index + 1}. ${violation}\n`;
      });
    }

    return report;
  }
}