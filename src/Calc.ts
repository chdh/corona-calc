// Calucations

import {regionDataTable, regions, days} from "./DataSource";

export interface CalcParms {                               // calculation parameters
   caseDeathTimeLag:         number;                       // time lag between reported cases and reported deaths, in days
   dailyAvgDays:             number;                       // number of days over which to average for the calculation of daily new cases/deaths (first derivative)
   growthDays:               number; }                     // number of days over which to average for the calculation of growth (second derivative)

export interface RegionCalcRecord {
   latestCases?:             number;                       // latest number of reported cases
   latestDeaths?:            number;                       // latest number of reported deaths
   laggedCases?:             number;                       // number of reported cases `caseDeathTimeLag` days before
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
   cr.latestCases = dr.cases?.[days - 1];
   cr.latestDeaths = dr.deaths?.[days - 1];
   cr.laggedCases = dr.cases?.[Math.max(0, days - 1 - calcParms.caseDeathTimeLag)];
   cr.cfr = (cr.latestDeaths != undefined && cr.laggedCases) ? cr.latestDeaths / cr.laggedCases : undefined;
   return cr; }

export function differentiate (a: Float64Array, w: number) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      if (i < w) {
         a2[i] = a[i] / (i + 1); }
       else {
         a2[i] = (a[i] - a[i - w]) / w; }}
   return a2; }

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
