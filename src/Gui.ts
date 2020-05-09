// Graphical user interface.

import {stripIndents as strip} from "common-tags";
import * as DataSource from "./DataSource";
import {regionDataTable} from "./DataSource";
import * as Calc from "./Calc";
import {CalcParms, regionCalcTable} from "./Calc";
import * as Selection from "./Selection";
import {SelectionParms} from "./Selection";
import * as Chart from "./Chart";
import * as DomUtils from "./utils/DomUtils";
import {escapeHtml, formatNumber, formatPercent, formatDateIso, catchError} from "./utils/MiscUtils";

interface ChartParmsExt extends Chart.ChartParms {
   sync:                     boolean; }                    // true = synchronize all charts

const regionChartCanvasWidth  = 870;
const regionChartCanvasHeight = 300;

let mruChartParms:           ChartParmsExt | undefined;
let currentSortOrder         = "deathsRelDesc";

function getChartParms (parentElement: HTMLElement) : ChartParmsExt {
   return {
      source: get(".regionChartSource"),
      mode:   get(".regionChartMode"),
      absRel: get(".regionChartAbsRel"),
      scale:  get(".regionChartScale"),
      sync:   getChecked(".sync") };
   function get (sel: string) {
      return (<HTMLSelectElement>parentElement.querySelector(sel))!.value; }
   function getChecked (sel: string) {
      return (<HTMLInputElement>parentElement.querySelector(sel))!.checked; }}

function setChartParms (parentElement: Element, parms: ChartParmsExt) {
   set(".regionChartSource", parms.source);
   set(".regionChartMode",   parms.mode);
   set(".regionChartAbsRel", parms.absRel);
   set(".regionChartScale",  parms.scale);
   setChecked(".sync",       parms.sync);
   const e1 = parms.mode != "trend";
   show(".regionChartScale", e1);
   function set (sel: string, value: string) {
      (<HTMLSelectElement>parentElement.querySelector(sel))!.value = value; }
   function setChecked (sel: string, checked: boolean) {
      (<HTMLInputElement>parentElement.querySelector(sel))!.checked = checked; }
   function show (sel: string, visible: boolean) {
      parentElement.querySelector(sel)!.classList.toggle("hidden", !visible); }}

function setAllChartParms (parms: ChartParmsExt) {
   for (const e of document.querySelectorAll(".regionChartBlock")) {
      setChartParms(e, parms); }}

function createChart (regionTableEntryElement: HTMLElement, regionNdx: number, chartParms: ChartParmsExt, updateAll: boolean) {
   if (updateAll) {
      setAllChartParms(chartParms); }
    else {
      setChartParms(regionTableEntryElement, chartParms); }
   const canvas = <HTMLCanvasElement>regionTableEntryElement.querySelector(".regionChart")!;
   Chart.createChart(canvas, regionNdx, chartParms, chartParms.sync, updateAll);
   mruChartParms = chartParms; }

function updateChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   const chartParms = getChartParms(regionTableEntryElement);
   const updateAll = !mruChartParms || mruChartParms.sync || chartParms.sync;
   createChart(regionTableEntryElement, regionNdx, chartParms, updateAll); }

function openChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   const html = strip`
      <div class="regionChartBlock">
       <div class="regionChartParms">
        <select class="regionChartSource">
         <option value="deaths">Deaths</option>
         <option value="cases">Cases</option>
        </select>
        <select class="regionChartMode">
         <option value="dailyAvg">${Calc.calcParms.dailyAvgDays}-day average</option>
         <option value="daily">Daily</option>
         <option value="cumulative">Cumulative</option>
         <option value="dailyAvgCum">Daily / cumulative</option>
         <option value="trend">Trend (${Calc.calcParms.trendDays}-day avg.)</option>
        </select>
        <select class="regionChartAbsRel">
         <option value="rel">Relative</option>
         <option value="abs">Absolute</option>
        </select>
        <select class="regionChartScale">
         <option value="lin">Linear</option>
         <option value="log">Logarithmic</option>
        </select>
        <label for="sync_${regionNdx}">Sync:</label>
        <input id="sync_${regionNdx}" class="sync" type="checkbox" checked>
       </div>
       <div class="regionChartContainer">
        <canvas class="regionChart" width="${regionChartCanvasWidth}" height="${regionChartCanvasHeight}" style="width:${regionChartCanvasWidth}px; height:${regionChartCanvasHeight}px"></canvas>
       </div>
      </div>`;
   regionTableEntryElement.insertAdjacentHTML("beforeend", html);
   const parmsElement = regionTableEntryElement.querySelector(".regionChartParms")!;
   parmsElement.addEventListener("change", () => catchError(updateChart, regionTableEntryElement, regionNdx));
   const chartParms = mruChartParms ? mruChartParms : getChartParms(regionTableEntryElement);
   createChart(regionTableEntryElement, regionNdx, chartParms, chartParms.sync); }

function closeChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   regionTableEntryElement.querySelector(".regionChartBlock")!.remove();
   Chart.destroyChart(regionNdx);
   if (mruChartParms && mruChartParms.sync) {
      Chart.syncCharts(mruChartParms); }}

function switchSortOrder (newSortOrder: string) {
   if (newSortOrder == currentSortOrder) {
      return; }
   currentSortOrder = newSortOrder;
   genRegionTable(); }

function setOpenCloseButtonSymbol (buttonElement: HTMLElement, isOpen: boolean) {
   buttonElement.classList.toggle("plusSymbol", !isOpen);
   buttonElement.classList.toggle("minusSymbol", isOpen); }

function openCloseButton_click (event: MouseEvent) {
   const buttonElement = <HTMLElement>event.target!;
   const regionTableEntryElement = <HTMLElement>buttonElement.closest(".regionTableEntry")!;
   const regionNdx = Number(regionTableEntryElement.dataset.regionNdx);
   const isOpen = buttonElement.classList.contains("minusSymbol");
   if (isOpen) {
      closeChart(regionTableEntryElement, regionNdx); }
    else {
      openChart(regionTableEntryElement, regionNdx); }
   setOpenCloseButtonSymbol(buttonElement, !isOpen); }

function renderRegionTable (selection: number[], sortOrder: string) {
   Chart.destroyAllCharts();
   const orderAscIndicator = `<div class="orderIndicator orderAscSymbol"></div>`;
   const orderDescIndicator = `<div class="orderIndicator orderDescSymbol"></div>`;
   let html = strip`
      <div class="regionTableHeader">
       <div class="w200 orderClick" data-sort-order="name">Region (country / state) ${sortOrder == "name" ? orderAscIndicator : ""}</div>
       <div class="w100r orderClick" data-sort-order="populationDesc">Population ${sortOrder == "populationDesc" ? orderDescIndicator : ""}</div>
       <div class="w250">
        <div class="columnHeader2 orderClick" data-sort-order="deathsRelDesc">Reported deaths</div>
        <div class="columnHeaderLine">
         <div class="w80r orderClick" data-sort-order="deathsAbsDesc">Abs. ${sortOrder == "deathsAbsDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="deathsRelDesc">Rel. ${sortOrder == "deathsRelDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="deathsDailyDesc">Daily ${sortOrder == "deathsDailyDesc" ? orderDescIndicator : ""}</div>
         <div class="w50r orderClick" data-sort-order="deathsTrendDesc">${sortOrder == "deathsTrendDesc" ? "Tr. " + orderDescIndicator : "Trend"}</div>
        </div>
       </div>
       <div class="w250">
        <div class="columnHeader2 orderClick" data-sort-order="casesRelDesc">Reported cases</div>
        <div class="columnHeaderLine">
         <div class="w80r orderClick" data-sort-order="casesAbsDesc">Abs. ${sortOrder == "casesAbsDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="casesRelDesc">Rel. ${sortOrder == "casesRelDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="casesDailyDesc">Daily ${sortOrder == "casesDailyDesc" ? orderDescIndicator : ""}</div>
         <div class="w50r orderClick" data-sort-order="casesTrendDesc">${sortOrder == "casesTrendDesc" ? "Tr. " + orderDescIndicator : "Trend"}</div>
        </div>
       </div>
       <div class="w60r orderClick" data-sort-order="cfrDesc" title="Overall case fatality rate, taking into account the time\nlag between reported cases and reported deaths">CFR ${sortOrder == "cfrDesc" ? orderDescIndicator : ""}</div>
      </div>`;
   for (let selPos = 0; selPos < selection.length; selPos++) {
      const regionNdx = selection[selPos];
      const dr = regionDataTable[regionNdx];
      const cr = regionCalcTable[regionNdx];
      const deathsDailyRel = (cr.deathsDaily ?? NaN) / (dr.population ?? NaN);
      const casesDailyRel = (cr.casesDaily ?? NaN) / (dr.population ?? NaN);
      html += strip`
         <div class="regionTableEntry" data-region-ndx="${regionNdx}">
          <div class="openCloseButton"></div>
          <div class="regionDataBlock">
           <div class="w200">${escapeHtml(dr.combinedName)}</div>
           <div class="w100r">${formatNumber(dr.population)}</div>
           <div class="w80r">${formatNumber(cr.deaths)}</div>
           <div class="w60r">${formatPercent((cr.deaths ?? NaN) / (dr.population ?? NaN), 3)}</div>
           <div class="w60r ${dailyLevel(deathsDailyRel, 0.00001)}">${formatPercent(deathsDailyRel, 4)}</div>
           <div class="w50r ${trendLevel(cr.deathsTrend)}">${formatPercent((cr.deathsTrend ?? NaN) / 100, 0, true)}</div>
           <div class="w80r">${formatNumber(cr.cases)}</div>
           <div class="w60r">${formatPercent((cr.cases ?? NaN) / (dr.population ?? NaN), 3)}</div>
           <div class="w60r ${dailyLevel(casesDailyRel, 0.0001)}">${formatPercent(casesDailyRel, 4)}</div>
           <div class="w50r ${trendLevel(cr.casesTrend)}">${formatPercent((cr.casesTrend ?? NaN) / 100, 0, true)}</div>
           <div class="w60r">${formatPercent(cr.cfr ?? NaN, 1)}</div>
          </div>
         </div>`; }
   document.getElementById("regionTable")!.innerHTML = html;
   for (const e of <NodeListOf<HTMLElement>>document.querySelectorAll(".orderClick")) {
      e.addEventListener("click", () => catchError(switchSortOrder, e.dataset.sortOrder)); }
   for (const buttonElement of <NodeListOf<HTMLElement>>document.querySelectorAll(".openCloseButton")) {
      buttonElement.addEventListener("click", (event: MouseEvent) => catchError(openCloseButton_click, event));
      setOpenCloseButtonSymbol(buttonElement, false); }}

function trendLevel (v: number | undefined) {
   return (
      v == undefined || !isFinite(v) ? "" :
      v > 2 ? "levelHi" :
      v < -2 ? "levelLo" :
      "levelMed"); }

function dailyLevel (v: number | undefined, treshold: number) {
   return (
      v == undefined || !isFinite(v) ? "" :
      v > treshold ? "levelHi" :
      v > treshold / 10 ? "levelMed" :
      "levelLo"); }

function getSelectionParms() : SelectionParms {
   const selParms = <SelectionParms>{};
   selParms.minPopulation = DomUtils.getValueNumOpt("minPopulation");
   selParms.minDeaths     = DomUtils.getValueNumOpt("minDeaths");
   selParms.countriesOnly = DomUtils.getChecked("countriesOnly");
   selParms.sortOrder     = currentSortOrder;
   return selParms; }

function getCalcParms() : CalcParms {
   const calcParms = <CalcParms>{};
   calcParms.caseDeathTimeLag = DomUtils.getValueNumReq("caseDeathTimeLag");
   calcParms.trendDays        = DomUtils.getValueNumReq("trendDays");
   calcParms.dailyAvgDays     = 7;
   return calcParms; }

function genRegionTable() {
   const calcParms = getCalcParms();
   const selParms = getSelectionParms();
   Calc.build(calcParms);
   const selection = Selection.createSelection(selParms);
   renderRegionTable(selection, selParms.sortOrder); }

/*
function inputParms_keyDown (event: KeyboardEvent) {
   const keyName = MiscUtils.genKeyName(event);
   if (keyName == "Enter") {
      genRegionTable(); }}
*/

export function init() {
   DomUtils.setValueNum("minPopulation", 1000000);
   DomUtils.setValueNum("minDeaths", 1000);
   DomUtils.addNumericFieldFormatSwitcher("minPopulation");
   DomUtils.addNumericFieldFormatSwitcher("minDeaths");
   genRegionTable();
   document.getElementById("dataAsOf")!.textContent = formatDateIso(DataSource.lastDay);
// document.getElementById("applyButton")!.addEventListener("click", () => catchError(genRegionTable));
// document.getElementById("inputParms")!.addEventListener("keydown", (event: KeyboardEvent) => catchError(inputParms_keyDown, event));
   document.getElementById("inputParms")!.addEventListener("change", () => catchError(genRegionTable)); }
