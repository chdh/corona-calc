// Creates selections (filter, sort).

import {regionDataTable} from "./DataSource";
import {regionCalcTable} from "./Calc";

export interface SelectionParms {
   continent?:               string;
   minPopulation?:           number;
   minDeaths?:               number;
   countriesOnly:            boolean;
   sortOrder:                string; }

// Creates a selection of regions.
export function createSelection (selParms: SelectionParms) : number[] {
   const sel: number[] = [];
   for (let regionNdx = 0; regionNdx < regionDataTable.length; regionNdx++) {
      const dr = regionDataTable[regionNdx];
      const cr = regionCalcTable[regionNdx];
      if (selParms.continent && selParms.continent != dr.continent) {
         continue; }
      if (selParms.minPopulation && selParms.minPopulation > (dr.population ?? -1)) {
         continue; }
      if (selParms.minDeaths && selParms.minDeaths > (cr.deathsTotal ?? -1)) {
         continue; }
      if (selParms.countriesOnly && !dr.isCountry) {
         continue; }
      sel.push(regionNdx); }
   sel.sort(sortFunction);
   return sel;

   function sortFunction (regionNdx1: number, regionNdx2: number) : number {
      const dr1 = regionDataTable[regionNdx1];
      const dr2 = regionDataTable[regionNdx2];
      const cr1 = regionCalcTable[regionNdx1];
      const cr2 = regionCalcTable[regionNdx2];
      const nameSort = dr1.combinedName.localeCompare(dr2.combinedName);
      switch (selParms.sortOrder) {
         case "populationDesc": {
            return (dr2.population ?? -1) - (dr1.population ?? -1) || nameSort; }
         case "casesAbsDesc": {
            return (cr2.casesTotal ?? -1) - (cr1.casesTotal ?? -1) || nameSort; }
         case "deathsAbsDesc": {
            return (cr2.deathsTotal ?? -1) - (cr1.deathsTotal ?? -1) || nameSort; }
         case "casesRelDesc": {
            const r1 = (cr1.casesTotal ?? -1) / (dr1.population ?? Infinity);
            const r2 = (cr2.casesTotal ?? -1) / (dr2.population ?? Infinity);
            return r2 - r1 || nameSort; }
         case "deathsRelDesc": {
            const r1 = (cr1.deathsTotal ?? -1) / (dr1.population ?? Infinity);
            const r2 = (cr2.deathsTotal ?? -1) / (dr2.population ?? Infinity);
            return r2 - r1 || nameSort; }
         case "casesDailyDesc": {
            const r1 = vn(cr1.casesDaily, -1) / (dr1.population ?? Infinity);
            const r2 = vn(cr2.casesDaily, -1) / (dr2.population ?? Infinity);
            return r2 - r1 || nameSort; }
         case "deathsDailyDesc": {
            const r1 = vn(cr1.deathsDaily, -1) / (dr1.population ?? Infinity);
            const r2 = vn(cr2.deathsDaily, -1) / (dr2.population ?? Infinity);
            return r2 - r1 || nameSort; }
         case "casesTrendDesc": {
            return vn(cr2.casesTrend, -999) - vn(cr1.casesTrend, -999) || nameSort; }
         case "deathsTrendDesc": {
            return vn(cr2.deathsTrend, -999) - vn(cr1.deathsTrend, -999) || nameSort; }
         case "cfrDesc": {
            return (cr2.cfr ?? -1) - (cr1.cfr ?? -1) || nameSort; }
         case "name": {
            return nameSort; }
         default: {
            throw new Error("Undefined sortOrder."); }}}}

function vn (n: number | undefined, fallbackValue: number) : number {
   return (n != undefined && isFinite(n)) ? n : fallbackValue; }
