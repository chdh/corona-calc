// Calculations

import {regionDataTable, regions, days} from "./DataSource";

export interface CalcParms {                               // calculation parameters
   caseDeathTimeLag:         number;                       // time lag between reported cases and reported deaths, in days
   dailyAvgDays:             number;                       // number of days over which to average for the calculation of daily new cases/deaths (first derivative)
   trendDays:                number; }                     // number of days over which to average for the trend calculation (second derivative)

export interface RegionCalcRecord {
   casesCleaned?:            Float64Array;                 // cleaned reported cases time series
   deathsCleaned?:           Float64Array;                 // cleaned reported deaths time series
   casesTotal?:              number;                       // latest number of reported cases
   deathsTotal?:             number;                       // latest number of reported deaths
   casesDaily?:              number;                       // average number of new cases in the last `dailyAvgDays` days
   deathsDaily?:             number;                       // average number of new deaths in the last `dailyAvgDays` days
   casesTrend?:              number;                       // latest relative trend of the reported cases
   deathsTrend?:             number;                       // latest relative trend of the reported deaths
   cfr?:                     number; }                     // overall case fatality rate

export var regionCalcTable:  RegionCalcRecord[];
export var calcParms:        CalcParms;

export function build (newCalcParms: CalcParms) {
   calcParms = newCalcParms;
   buildRegionCalcTable(); }

function buildRegionCalcTable() {
   regionCalcTable = new Array(regions);
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      regionCalcTable[regionNdx] = buildRegionCalcRecord(regionNdx); }}

function buildRegionCalcRecord (regionNdx: number) : RegionCalcRecord {
   const dr = regionDataTable[regionNdx];
   const cr = <RegionCalcRecord>{};
   cr.casesCleaned = dr.cases ? cleanCumulativeTimeSeries(dr.cases) : undefined;
   cr.deathsCleaned = dr.deaths ? cleanCumulativeTimeSeries(dr.deaths) : undefined;
   cr.casesTotal = dr.cases?.[days - 1];
   cr.deathsTotal = dr.deaths?.[days - 1];
   cr.casesDaily = dr.cases ? getDerivative(dr.cases, days - 1, calcParms.dailyAvgDays) : undefined;
   cr.deathsDaily = dr.deaths ? getDerivative(dr.deaths, days - 1, calcParms.dailyAvgDays) : undefined;
   cr.casesTrend = cr.casesCleaned ? getTrend(cr.casesCleaned, days - 1, true) : undefined;
   cr.deathsTrend = cr.deathsCleaned ? getTrend(cr.deathsCleaned, days - 1, true) : undefined;
   const laggedCases = dr.cases?.[Math.max(0, days - 1 - calcParms.caseDeathTimeLag)];   // number of reported cases `caseDeathTimeLag` days before
   cr.cfr = (cr.deathsTotal != undefined && laggedCases) ? cr.deathsTotal / laggedCases : undefined;
   return cr; }

// Removes artefacts from the time series.
// The result must only be used for daily and trend calculations. Cumulative values are not valid in the result.
function cleanCumulativeTimeSeries (a: Float64Array) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   let offset = 0;
   for (let i = 0; i < n; i++) {
      const v = a[i];
      if (i < 1 || !isFinite(v)) {
         a2[i] = v;
         continue; }
      const d = v - a[i - 1];
      if (d < 0) {                                         // ignore negative derivative
         offset -= d; }
       else if (v > 200 && d / v > 0.15 && i >= 10) {
         const d2a = getDerivative(a2, i - 2, 5);
         const d2b = getDerivative(a, i - 2, 5);
         const d2Max = Math.max(d2a, d2b);
         if (d / d2Max > 5) {
            offset -= d - d2Max; }}
      a2[i] = v + offset; }
   return a2; }

export function differentiate (a: Float64Array, w: number) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = getDerivative(a, i, w); }
   return a2; }

function getDerivative (a: Float64Array, i: number, w: number) : number {
   if (i <= 0) {
      return NaN; }
   const w2 = Math.min(w, i);
   return (a[i] - a[i - w2]) / w2; }

export function getTrendSeries (a1: Float64Array, relative: boolean) : Float64Array {
   const n = a1.length;
   const a2 = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = getTrend(a1, i, relative); }
   return a2; }

// Calculates a trend value (second derivative, averaged over a window of `trendDays` days).
// If `relative` is true, the returned value is in percent (relative to the previous daily value).
function getTrend (a: Float64Array, i: number, relative: boolean) : number {
   const minDailyForRelative = 5;
   const relativeTrendLimit = 40;
   if (i <= 2) {
      return NaN; }
   const w = Math.min(calcParms.trendDays, i - 1);
   const d1 = getDerivative(a, i - w, calcParms.dailyAvgDays);
   const d2 = getDerivative(a, i,     calcParms.dailyAvgDays);
   const t = (d2 - d1) / w;                                // second derivative = absolute trend
   if (!relative) {
      return t; }
   const d3 = getDerivative(a, i - 1, calcParms.dailyAvgDays);
   if (d3 < minDailyForRelative) {
      return NaN; }
   const r = t / d3 * 100;                                 // relative trend
   if (Math.abs(r) >= relativeTrendLimit) {
      return NaN; }
   return r; }

export function movingAverage (a: Float64Array, w: number) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   let sum = 0;
   for (let i = 0; i < n; i++) {
      if (i >= w) {
         sum -= a[i - w]; }
      sum += a[i];
      a2[i] = sum / w; }
   return a2; }

export function getCfrSeries (regionNdx: number) : Float64Array {
   const a = new Float64Array(days);
   for (let i = 0; i < days; i++) {
      a[i] = getCfr(regionNdx, i); }
   return a; }

// Computes the case fatality rate in percent.
function getCfr (regionNdx: number, i: number) : number {
   const cr = regionCalcTable[regionNdx];
   if (i <= calcParms.caseDeathTimeLag || !cr.deathsCleaned || !cr.casesCleaned) {
      return NaN; }
   const dd = getDerivative(cr.deathsCleaned, i, calcParms.dailyAvgDays);
   const dc = getDerivative(cr.casesCleaned, i - calcParms.caseDeathTimeLag, calcParms.dailyAvgDays);
   if (dd <= 0 || dc < 100) {
      return NaN; }
   const r = dd / dc * 100;
   if (r >= 50) {
      return NaN; }
   return r; }
