// Graphical user interface.

import {stripIndents as strip} from "common-tags";
import * as DataSource from "./DataSource";
import {regionDataTable} from "./DataSource";
import {regionCalcTable} from "./Calc";
import * as Selection from "./Selection";
import {SelectionParms} from "./Selection";
import * as Chart from "./Chart";
import {ChartParms} from "./Chart";
import * as DomUtils from "./utils/DomUtils";
import {escapeHtml, formatNumber, formatPercent, formatDateIso, catchError} from "./utils/MiscUtils";

const regionChartCanvasWidth  = 650;
const regionChartCanvasHeight = 300;

let mruChartParms:           ChartParms | undefined;
let currentSortOrder         = "deathsRelDesc";

function getChartParms (parentElement: HTMLElement) : ChartParms {
   return {
      absRel: get(".regionChartAbsRel"),
      mode:   get(".regionChartMode"),
      source: get(".regionChartSource"),
      scale:  get(".regionChartScale") };
   function get (sel: string) {
      return (<HTMLSelectElement>parentElement.querySelector(sel))!.value; }}

function setChartParms (parentElement: HTMLElement, parms: ChartParms) {
   set(".regionChartAbsRel", parms.absRel);
   set(".regionChartMode",   parms.mode);
   set(".regionChartSource", parms.source);
   set(".regionChartScale",  parms.scale);
   function set (sel: string, value: string) {
      (<HTMLSelectElement>parentElement.querySelector(sel))!.value = value; }}

function createChart (parentElement: HTMLElement, regionNdx: number, rememberParms = false) {
   const canvas = <HTMLCanvasElement>parentElement.querySelector(".regionChart")!;
   const parms = getChartParms(parentElement);
   if (rememberParms) {
      mruChartParms = parms; }
   Chart.createChart(canvas, regionNdx, parms); }

function openChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   const html = strip`
      <div class="regionChartBlock">
       <div class="regionChartParms">
        <select class="regionChartAbsRel">
         <option value="rel">Relative</option>
         <option value="abs">Absolute</option>
        </select>
        <select class="regionChartMode">
         <option value="daily7">7-day average</option>
         <option value="daily">Daily</option>
         <option value="cumulative">Cumulative</option>
         <option value="daily7Cum">Daily / cumulative</option>
        </select>
        <select class="regionChartSource">
         <option value="deaths">Deaths</option>
         <option value="cases">Cases</option>
        </select>
        <select class="regionChartScale">
         <option value="lin">Linear</option>
         <option value="log">Logarithmic</option>
        </select>
       </div>
       <div class="regionChartContainer">
        <canvas class="regionChart" width="${regionChartCanvasWidth}" height="${regionChartCanvasHeight}" style="width:${regionChartCanvasWidth}px; height:${regionChartCanvasHeight}px"></canvas>
       </div>
      </div>`;
   regionTableEntryElement.insertAdjacentHTML("beforeend", html);
   const parmsElement = regionTableEntryElement.querySelector(".regionChartParms")!;
   parmsElement.addEventListener("input", () => catchError(createChart, regionTableEntryElement, regionNdx, true));
   if (mruChartParms) {
      setChartParms(regionTableEntryElement, mruChartParms); }
   createChart(regionTableEntryElement, regionNdx); }

function closeChart (regionTableEntryElement: HTMLElement, regionNdx: number) {
   regionTableEntryElement.querySelector(".regionChartBlock")!.remove();
   Chart.destroyChart(regionNdx); }

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
       <div class="w220 orderClick" data-sort-order="name">Region (country / state) ${sortOrder == "name" ? orderAscIndicator : ""}</div>
       <div class="w100r orderClick" data-sort-order="populationDesc">Population ${sortOrder == "populationDesc" ? orderDescIndicator : ""}</div>
       <div class="w140r">
        <div class="orderClick" data-sort-order="deathsRelDesc">Reported deaths</div>
        <div class="columnHeaderLine">
         <div class="w80r orderClick" data-sort-order="deathsAbsDesc"">abs. ${sortOrder == "deathsAbsDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="deathsRelDesc">rel. ${sortOrder == "deathsRelDesc" ? orderDescIndicator : ""}</div>
        </div>
       </div>
       <div class="w140r">
        <div class="orderClick" data-sort-order="casesRelDesc">Reported cases</div>
        <div class="columnHeaderLine">
         <div class="w80r orderClick" data-sort-order="casesAbsDesc"">abs. ${sortOrder == "casesAbsDesc" ? orderDescIndicator : ""}</div>
         <div class="w60r orderClick" data-sort-order="casesRelDesc">rel. ${sortOrder == "casesRelDesc" ? orderDescIndicator : ""}</div>
        </div>
       </div>
      </div>`;
   for (let selPos = 0; selPos < selection.length; selPos++) {
      const regionNdx = selection[selPos];
      const dr = regionDataTable[regionNdx];
      const cr = regionCalcTable[regionNdx];
      html += strip`
         <div class="regionTableEntry" data-region-ndx="${regionNdx}">
          <div class="openCloseButton"></div>
          <div class="regionDataBlock">
           <div class="w220">${escapeHtml(dr.combinedName)}</div>
           <div class="w100r">${formatNumber(dr.population)}</div>
           <div class="w80r">${formatNumber(cr.latestDeaths)}</div>
           <div class="w60r">${formatPercent((cr.latestDeaths ?? NaN) / (dr.population ?? NaN), 3)}</div>
           <div class="w80r">${formatNumber(cr.latestCases)}</div>
           <div class="w60r">${formatPercent((cr.latestCases ?? NaN) / (dr.population ?? NaN), 3)}</div>
          </div>
         </div>`; }
//     <div class="w100r" title="Proportion of the number of reported deaths to the number of reported cases.\nThe large fluctuations are an indication of the unreliability of the reported numbers.">Deaths/cases</div>
//         <div class="w100r">${formatPercent((cr.latestDeaths ?? NaN) / (cr.latestCases ?? NaN), 3)}</div>
   document.getElementById("regionTable")!.innerHTML = html;
   for (const e of <NodeListOf<HTMLElement>>document.querySelectorAll(".orderClick")) {
      e.addEventListener("click", () => catchError(switchSortOrder, e.dataset.sortOrder)); }
   for (const buttonElement of <NodeListOf<HTMLElement>>document.querySelectorAll(".openCloseButton")) {
      buttonElement.addEventListener("click", (event: MouseEvent) => catchError(openCloseButton_click, event));
      setOpenCloseButtonSymbol(buttonElement, false); }}

function getSelectionParms() : SelectionParms {
   const selParms = <SelectionParms>{};
   selParms.minPopulation = DomUtils.getValueNumOpt("minPopulation");
   selParms.minDeaths     = DomUtils.getValueNumOpt("minDeaths");
   selParms.countriesOnly = DomUtils.getChecked("countriesOnly");
   selParms.sortOrder     = currentSortOrder;
   return selParms; }

function genRegionTable() {
   const selParms = getSelectionParms();
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
