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

let mruChartParms:           ChartParmsExt | undefined;
let mruChartWidth            = 0;
let mruChartHeight           = 0;
let currentSortOrder         = "deathsDailyDesc";

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
   const e1 = parms.source != "cfr";
   const e2 = parms.mode != "trend";
   show(".regionChartMode", e1);
   show(".regionChartAbsRel", e1);
   show(".regionChartScale", e1 && e2);
   show(".info", !e1);
   setText(".info", parms.source != "cfr" ? "" :
      `(Case fatality rate with ${Calc.calcParms.caseDeathTimeLag} days cases/deaths time-lag, ${Calc.calcParms.dailyAvgDays}-day average)`);
   function set (sel: string, value: string) {
      (<HTMLSelectElement>parentElement.querySelector(sel))!.value = value; }
   function setChecked (sel: string, checked: boolean) {
      (<HTMLInputElement>parentElement.querySelector(sel))!.checked = checked; }
   function setText (sel: string, text: string) {
      parentElement.querySelector(sel)!.textContent = text; }
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
         <option value="deaths" selected>Deaths</option>
         <option value="cases">Cases</option>
         <option value="cfr">CFR</option>
        </select>
        <select class="regionChartMode">
         <option value="dailyAvg">${Calc.calcParms.dailyAvgDays}-day average</option>
         <option value="daily">Daily</option>
         <option value="cumulative">Cumulative</option>
         <!-- <option value="cleaned">Cleaned</option> -->
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
        <div class="info"></div>
        <label for="sync_${regionNdx}" title="Synchronize all charts">Sync:</label>
        <input id="sync_${regionNdx}" class="sync" type="checkbox" checked>
       </div>
       <div class="regionChartContainer">
        <canvas class="regionChart"></canvas>
       </div>
      </div>`;
   regionTableEntryElement.insertAdjacentHTML("beforeend", html);
   const chartContainerElement = <HTMLDivElement>regionTableEntryElement.querySelector(".regionChartContainer")!;
   if (mruChartWidth > 0 && mruChartWidth < document.body.clientWidth - 40) {
      chartContainerElement.style.width = mruChartWidth + "px";
      chartContainerElement.style.height = mruChartHeight + "px"; }
   const chartResizeObserver = new ResizeObserver(chartResizeObserverCallback);
   chartResizeObserver.observe(chartContainerElement);
   const parmsElement = regionTableEntryElement.querySelector(".regionChartParms")!;
   parmsElement.addEventListener("change", () => catchError(updateChart, regionTableEntryElement, regionNdx));
   const chartParms = mruChartParms ? mruChartParms : getChartParms(regionTableEntryElement);
   createChart(regionTableEntryElement, regionNdx, chartParms, chartParms.sync); }

function chartResizeObserverCallback (entries: ResizeObserverEntry[]) {
   const r = entries[0].contentRect;
   if (r.width > 0 && r.height > 0) {
      mruChartWidth = r.width;
      mruChartHeight = r.height; }}

function closeChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   regionTableEntryElement.querySelector(".regionChartBlock")!.remove();
   Chart.destroyChart(regionNdx);
   if (mruChartParms?.sync) {
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
   const clickedElement = <HTMLElement>event.target!;
   const regionTableEntryElement = <HTMLElement>clickedElement.closest(".regionTableEntry")!;
   const buttonElement = <HTMLElement>regionTableEntryElement.querySelector(".openCloseButton")!;
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
          <div class="openCloseButtonClickArea">
           <div class="openCloseButton"></div>
          </div>
          <div class="regionDataBlock">
           <div class="w200">${escapeHtml(dr.combinedName)}</div>
           <div class="w100r">${formatNumber(dr.population)}</div>
           <div class="w80r">${formatNumber(cr.deathsTotal)}</div>
           <div class="w60r">${formatPercent((cr.deathsTotal ?? NaN) / (dr.population ?? NaN), 3)}</div>
           <div class="w60r ${dailyLevel(deathsDailyRel, 0.00001)}">${formatPercent(deathsDailyRel, 4)}</div>
           <div class="w50r ${trendLevel(cr.deathsTrend)}">${formatPercent((cr.deathsTrend ?? NaN) / 100, 0, true)}</div>
           <div class="w80r">${formatNumber(cr.casesTotal)}</div>
           <div class="w60r">${formatPercent((cr.casesTotal ?? NaN) / (dr.population ?? NaN), 3)}</div>
           <div class="w60r ${dailyLevel(casesDailyRel, 0.0001)}">${formatPercent(casesDailyRel, 4)}</div>
           <div class="w50r ${trendLevel(cr.casesTrend)}">${formatPercent((cr.casesTrend ?? NaN) / 100, 0, true)}</div>
           <div class="w60r">${formatPercent(cr.cfr ?? NaN, 1)}</div>
          </div>
         </div>`; }
   document.getElementById("regionTable")!.innerHTML = html;
   for (const e of <NodeListOf<HTMLElement>>document.querySelectorAll(".orderClick")) {
      e.addEventListener("click", () => catchError(switchSortOrder, e.dataset.sortOrder)); }
   for (const regionTableEntryElement of <NodeListOf<HTMLElement>>document.querySelectorAll(".regionTableEntry")) {
      const buttonClickAreaElement = <HTMLElement>regionTableEntryElement.querySelector(".openCloseButtonClickArea")!;
      const buttonElement = <HTMLElement>regionTableEntryElement.querySelector(".openCloseButton")!;
      const regionDataBlockElement = <HTMLElement>regionTableEntryElement.querySelector(".regionDataBlock")!;
      setOpenCloseButtonSymbol(buttonElement, false);
      buttonClickAreaElement.addEventListener("click", (event: MouseEvent) => catchError(openCloseButton_click, event));
      regionDataBlockElement.addEventListener("click", (event: MouseEvent) => catchError(openCloseButton_click, event)); }}

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
   selParms.continent     = DomUtils.getValue("continent");
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

function saveInputParms() {
   // Currently we save only the "continent" parameter.
   const continent = DomUtils.getValue("continent");
   localStorage.setItem("continent", continent); }

function restoreInputParms() {
   const continent = localStorage.getItem("continent");
   if (continent) {
      DomUtils.setValue("continent", continent); }}

function onInputParmsChanged() {
   saveInputParms();
   genRegionTable(); }

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
   restoreInputParms();
   genRegionTable();
   document.getElementById("dataAsOf")!.textContent = formatDateIso(DataSource.lastDay);
// document.getElementById("applyButton")!.addEventListener("click", () => catchError(genRegionTable));
// document.getElementById("inputParms")!.addEventListener("keydown", (event: KeyboardEvent) => catchError(inputParms_keyDown, event));
   document.getElementById("inputParms")!.addEventListener("change", () => catchError(onInputParmsChanged)); }
