// Creates selections (filter, sort).

import {regionDataTable} from "./DataSource";
import {regionCalcTable} from "./Calc";

export interface SelectionParms {
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
      if (selParms.minPopulation && selParms.minPopulation > (dr.population ?? -1)) {
         continue; }
      if (selParms.minDeaths && selParms.minDeaths > (cr.latestDeaths ?? -1)) {
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
            return (cr2.latestCases ?? -1) - (cr1.latestCases ?? -1) || nameSort; }
         case "deathsAbsDesc": {
            return (cr2.latestDeaths ?? -1) - (cr1.latestDeaths ?? -1) || nameSort; }
         case "casesRelDesc": {
            const relCases1 = (cr1.latestCases ?? -1) / (dr1.population ?? Infinity);
            const relCases2 = (cr2.latestCases ?? -1) / (dr2.population ?? Infinity);
            return relCases2 - relCases1 || nameSort; }
         case "deathsRelDesc": {
            const relDeaths1 = (cr1.latestDeaths ?? -1) / (dr1.population ?? Infinity);
            const relDeaths2 = (cr2.latestDeaths ?? -1) / (dr2.population ?? Infinity);
            return relDeaths2 - relDeaths1 || nameSort; }
         case "cfrDesc": {
            return (cr2.cfr ?? -1) - (cr1.cfr ?? -1) || nameSort; }
         case "name": {
            return nameSort; }
         default: {
            throw new Error("Undefined sortOrder."); }}}}
