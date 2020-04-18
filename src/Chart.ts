import {regions, firstDay, lastDay, days, regionDataTable} from "./DataSource";
import {formatNumber, formatPercent} from "./utils/MiscUtils";
import ChartJs_Chart from "chart.js";
import * as ChartJs from "chart.js";
import "./tempExtSource/chartjs-adapter-moment.js";        // imported for side-effects only

export interface ChartParms {
   absRel:         string;                                 // "abs" = absolute, "rel" = relative values
   mode:           string;                                 // "daily", "cumulative", "dailyCum" (x/y-combined)
   source:         string;                                 // "deaths", "cases"
   scale:          string; }                               // "lin" = linear, "log" = logarithmic

var charts:        (ChartJs_Chart | undefined)[];

function prepTimeSeriesValues (regionNdx: number, chartParms: ChartParms) : Float64Array {
   const dr = regionDataTable[regionNdx];
// const cr = regionCalcTable[regionNdx];
   let sourceVals: Float64Array;
   switch (chartParms.source) {
      case "deaths": sourceVals = dr.deaths!; break;
      case "cases":  sourceVals = dr.cases!;  break;
      default: throw new Error("Unknown source."); }
   const derivative = chartParms.mode == "daily";
   const outVals = new Float64Array(days);
   const relative = chartParms.absRel == "rel";
   const log = chartParms.scale == "log";
   for (let i = 0; i < days; i++) {
      let v = sourceVals[i];
      if (derivative && i > 0) {
         v = v - sourceVals[i - 1]; }
      if (log && v < 1) {
         v = 1E-3; }
      if (relative) {
         v = v * 100 / (dr.population ?? NaN); }
      outVals[i] = v; }
   return outVals; }

function genTimeSeriesChartDataPoints (regionNdx: number, chartParms: ChartParms) : ChartJs.ChartPoint[] {
   const day = firstDay.clone();
   const yVals = prepTimeSeriesValues(regionNdx, chartParms);
   const points = Array(days);
   for (let i = 0; i < days; i++) {
      points[i] = {
         x: day.clone(),
         y: yVals[i] };
      day.add(1, "d"); }
   return points; }

function genXyChartDataPoints (regionNdx: number, chartParms: ChartParms) : ChartJs.ChartPoint[] {
   const xVals = prepTimeSeriesValues(regionNdx, chartParms);
   const yVals = prepTimeSeriesValues(regionNdx, {...chartParms, mode: "daily"});
   const points = Array(days);
   for (let i = 0; i < days; i++) {
      points[i] = {
         x: xVals[i],
         y: yVals[i] }; }
   return points; }

function genChartDataPoints (regionNdx: number, chartParms: ChartParms) : ChartJs.ChartPoint[] {
   if (chartParms.mode == "dailyCum") {
      return genXyChartDataPoints(regionNdx, chartParms); }
    else {
      return genTimeSeriesChartDataPoints(regionNdx, chartParms); }}

function ticksCallback (value: any, _index: number, _values: any, chartParms: ChartParms, isYAxis: boolean): any {
   // console.log(value, index, values);
   const type = (isYAxis || chartParms.mode == "dailyCum") ? chartParms.absRel : "time";
   switch (type) {
      case "abs": {
         return formatNumber(<number>value); }
      case "rel": {
         return formatPercent(<number>value / 100, 3); }
      default: {
         return value; }}}

function createChartConfig (regionNdx: number, chartParms: ChartParms) : ChartJs.ChartConfiguration {
   const fontColor = "#000";
   const dateFormat = "YYYY-MM-DD";
   const yDataSet: /* ChartJs.ChartDataSets */ any = {
      borderColor:     "#ff8080",
      backgroundColor: "#ffe0e0",
      lineTension: 0,
      borderJoinStyle: "round",
      parsing: false,
      data: genChartDataPoints(regionNdx, chartParms) };
   const datasets: ChartJs.ChartDataSets[] = [yDataSet];
   const valueAxisType = (chartParms.scale == "log") ? "logarithmic" : "linear";
   const valueAxisMin = (chartParms.scale == "lin") ? 0 : (chartParms.absRel == "abs") ? 1 : 0.001;
   const isXy = chartParms.mode == "dailyCum";
   const scales: /* ChartJs.ChartScales */ any = {
      x: {
         type: isXy ? valueAxisType : "time",
         min: isXy ? valueAxisMin : firstDay.format(dateFormat),
         max: isXy ? undefined : lastDay.clone().add(1, "d").format(dateFormat),
         time: {
            parser: dateFormat,
            unit: "week",
            isoWeekday: true,
            displayFormats: {
               week: "MMM D" }},
         ticks: {
            maxTicksLimit: (isXy && chartParms.scale == "log") ? 12 : undefined,
            fontColor,
            callback: (value: any, index: number, values: any) => ticksCallback(value, index, values, chartParms, false) }},
      y: {
         type: valueAxisType,
         min: valueAxisMin,
//       scaleLabel: {
//          display: true,
//          labelString: "...",
//          fontColor },
         ticks: {
//          beginAtZero: true,
            maxTicksLimit: (chartParms.scale == "log") ? 9 : 11,
            fontColor,
            callback: (value: any, index: number, values: any) => ticksCallback(value, index, values, chartParms, true) }}};
   const elementsOptions: ChartJs.ChartElementsOptions = {
//    point: {
//       radius: 0 }
      };
   const legendOptions: ChartJs.ChartLegendOptions = {
      display: false };
   const options: ChartJs.ChartOptions = {
//    animation: {duration: 0},
      scales,
      elements: elementsOptions,
      legend: legendOptions,
      responsive: false };
   return {
      type: "line",
      data: { datasets },
      options }; }

export function createChart (canvas: HTMLCanvasElement, regionNdx: number, chartParms: ChartParms) {
   destroyChart(regionNdx);
   const ctx = canvas.getContext('2d')!;
   const chartConfig = createChartConfig(regionNdx, chartParms);
   charts[regionNdx] = new ChartJs_Chart(ctx, chartConfig); }

export function destroyChart (regionNdx: number) {
   if (!charts[regionNdx]) {
      return; }
   charts[regionNdx]!.destroy();
   charts[regionNdx] = undefined; }

export function destroyAllCharts() {
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      destroyChart(regionNdx); }}

export function init() {
   charts = Array(regions); }
