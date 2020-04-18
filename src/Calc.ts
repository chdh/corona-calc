// Calucations

import {regionDataTable, regions, days} from "./DataSource";

export interface RegionCalcRecord {
   latestCases?:             number;                       // latest number of reported cases
   latestDeaths?:            number;                       // latest number of reported deaths
   }

export var regionCalcTable:  RegionCalcRecord[];

function buildRegionCalcTable() {
   regionCalcTable = new Array(regions);
   for (let regionNdx = 0; regionNdx < regionDataTable.length; regionNdx++) {
      const dr = regionDataTable[regionNdx];
      const cr = <RegionCalcRecord>{};
      regionCalcTable[regionNdx] = cr;
      cr.latestCases = dr.cases?.[days - 1];
      cr.latestDeaths = dr.deaths?.[days - 1]; }}

export function init() {
   buildRegionCalcTable(); }
