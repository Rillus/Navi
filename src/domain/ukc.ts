export type DepthDatum = 'lat' | 'msl' | 'unknown'

export type DepthInput = {
  draughtM: number
  ukcM: number
  tideAboveDatumM: number | null
}

export type DepthEvaluationInput = DepthInput & {
  chartedDepthM: number | null
  datum: DepthDatum
}

export type DepthStatus = 'ok' | 'marginal' | 'unsafe' | 'unknown'

export type DepthEvaluation = {
  status: DepthStatus
  safe: boolean
  requiredChartedDepthM: number | null
  reason?: string
}

export function requiredChartedDepthM(input: DepthInput): number {
  const tide = input.tideAboveDatumM ?? 0
  return round2(input.draughtM + input.ukcM - tide)
}

export function evaluateDepth(input: DepthEvaluationInput): DepthEvaluation {
  if (input.datum !== 'lat') {
    return {
      status: 'unknown',
      safe: false,
      requiredChartedDepthM: null,
      reason: 'Depth datum is not LAT; cannot treat this grid as charted depth.',
    }
  }
  if (input.tideAboveDatumM == null) {
    return {
      status: 'unknown',
      safe: false,
      requiredChartedDepthM: null,
      reason: 'Tide unknown — treating water as not safe.',
    }
  }
  if (input.chartedDepthM == null) {
    return {
      status: 'unknown',
      safe: false,
      requiredChartedDepthM: requiredChartedDepthM(input),
      reason: 'No charted depth for this cell.',
    }
  }

  const required = requiredChartedDepthM(input)
  const margin = input.chartedDepthM - required
  if (margin < 0) {
    return { status: 'unsafe', safe: false, requiredChartedDepthM: required }
  }
  if (margin < 0.3) {
    return { status: 'marginal', safe: true, requiredChartedDepthM: required }
  }
  return { status: 'ok', safe: true, requiredChartedDepthM: required }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
