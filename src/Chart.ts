import {regions, firstDay, lastDay, days, regionDataTable, RegionDataRecord} from "./DataSource";
import {formatNumber, formatPercent} from "./utils/MiscUtils";
import {calcParms, regionCalcTable, RegionCalcRecord} from "./Calc";
import * as Calc from "./Calc";
import * as ChartJs from "chart.js";
import moment from "moment";
import "chartjs-adapter-moment";                           // imported for side-effects only

export interface ChartParms {                              // chart parameters
   source:                   string;                       // "deaths", "cases", "cfr"
   mode:                     string;                       // "daily", "dailyAvg", "cumulative", "cleaned" (only for testing), "dailyAvgCum", "trend"
   absRel:                   string;                       // "abs" = absolute, "rel" = relative values
   scale:                    string; }                     // "lin" = linear, "log" = logarithmic

export interface XyMinMax {
   xMin?:                    number;
   xMax?:                    number;
   yMin?:                    number;
   yMax?:                    number; }

var chartControllers:        (ChartController | undefined)[];
var activeCharts:            number = 0;

class ChartController {

   private canvas:           HTMLCanvasElement;
   private regionNdx:        number;
   private dataRecord:       RegionDataRecord;
   private calcRecord:       RegionCalcRecord;
   private chartParms:       ChartParms;
   private chart?:           ChartJs.Chart;
   private dataPoints:       ChartJs.Point[];
   public  dataMinMax:       XyMinMax;

   public constructor (canvas: HTMLCanvasElement, regionNdx: number) {
      this.canvas = canvas;
      this.regionNdx = regionNdx;
      this.dataRecord = regionDataTable[this.regionNdx];
      this.calcRecord = regionCalcTable[this.regionNdx]; }

   // Creates the data points and sets `dataMinMax`.
   public prepare (chartParms: ChartParms) {
      this.destroyChart();
      this.chartParms = chartParms;
      this.dataPoints = this.genChartDataPoints();
      this.dataMinMax = this.findDataPointsMinMax(this.dataPoints); }

   // Displays the chart.
   public complete (xySync: XyMinMax) {
      this.destroyChart();
      const chartConfig = this.createChartConfig(xySync);
      const ctx = this.canvas.getContext('2d')!;
      this.chart = new ChartJs.Chart(ctx, chartConfig); }

   public destroy() {
      this.destroyChart(); }

   private destroyChart() {
      if (this.chart) {
         this.chart.destroy();
         this.chart = undefined; }}

   //--- Data points -----------------------------------------------------------

   private genChartDataPoints() : ChartJs.Point[] {
      const chartParms = this.chartParms;
      if (chartParms.mode == "dailyAvgCum" && chartParms.source != "cfr") {
         return this.genXyChartDataPoints(); }
       else {
         return this.genTimeChartDataPoints(); }}

   private genTimeChartDataPoints() : ChartJs.Point[] {
      const day = firstDay.clone();
      const yVals = this.prepTimeSeriesValues(this.chartParms.mode);
      const points: ChartJs.Point[] = Array(days);
      for (let i = 0; i < days; i++) {
         points[i] = {
            x: <any>day.clone(),                           // TODO: Remove <any> then chart.js 3 is corrected
            y: yVals[i] };
         day.add(1, "d"); }
      return points; }

   private genXyChartDataPoints() : ChartJs.Point[] {
      const yAxisMode = (this.chartParms.mode == "dailyAvgCum") ? "dailyAvg" : "daily";
      const xVals = this.prepTimeSeriesValues("cumulative");
      const yVals = this.prepTimeSeriesValues(yAxisMode);
      const points: ChartJs.Point[] = Array(days);
      for (let i = 0; i < days; i++) {
         points[i] = {
            x: xVals[i],
            y: yVals[i] }; }
      return points; }

   private prepTimeSeriesValues (mode2: string) : Float64Array {
      const chartParms = this.chartParms;
      let sourceVals: Float64Array | undefined;
      switch (chartParms.source) {
         case "deaths": {
            sourceVals = (mode2 == "cumulative") ? this.dataRecord.deaths : this.calcRecord.deathsCleaned;
            break; }
         case "cases": {
            sourceVals = (mode2 == "cumulative") ? this.dataRecord.cases : this.calcRecord.casesCleaned;
            break; }
         case "cfr": {
            return Calc.getCfrSeries(this.regionNdx); }
         default: {
            throw new Error("Unknown source."); }}
      if (!sourceVals) {
         throw new Error("No source data values available."); }
      let vals: Float64Array;
      switch (mode2) {
         case "daily":    vals = Calc.differentiate(sourceVals, 1); break;
         case "dailyAvg": vals = Calc.differentiate(sourceVals, calcParms.dailyAvgDays); break;
         case "trend":    return Calc.getTrendSeries(sourceVals, chartParms.absRel == "rel");
         default:         vals = sourceVals; }
      return this.prepRelLogValues(vals); }

   private findDataPointsMinMax (dataPoints: ChartJs.Point[]) : XyMinMax {
      const mm = <XyMinMax>{};
      for (const p of dataPoints) {
         mm.xMin = min(mm.xMin, p.x);
         mm.xMax = max(mm.xMax, p.x);
         mm.yMin = max(mm.yMin, p.y);
         mm.yMax = max(mm.yMax, p.y); }
      return mm;
      function min (v1: number|undefined, v2: any) : number | undefined {
         if (typeof v2 == "number" && isFinite(v2)) {
            return (v1 == undefined || v2 < v1) ? v2 : v1; }
         return v1; }
      function max (v1: number|undefined, v2: any) : number | undefined {
         if (typeof v2 == "number" && isFinite(v2)) {
            return (v1 == undefined || v2 > v1) ? v2 : v1; }
         return v1; }}

   //---------------------------------------------------------------------------

   private createChartConfig (xySync: XyMinMax) : ChartJs.ChartConfiguration {
      const chartParms = this.chartParms;
      const isCfr = chartParms.source == "cfr";
      const isTrend = !isCfr && chartParms.mode == "trend";
      const isXy = !isCfr && chartParms.mode == "dailyAvgCum";
      const isRelative = chartParms.absRel == "rel";
      const isRelTrend = isTrend && isRelative;
      const fontColor = "#000";
      const dateFormat = "YYYY-MM-DD";
      const yDataSet: Partial<ChartJs.ChartDataset<"line">> = {
         borderColor:     isCfr ? "rgb(247,213,0)" : (chartParms.source == "deaths") ? "#FF6B5F" : "#0066FF",
         backgroundColor: isCfr ? "rgba(247,213,0,0.15)" : isTrend ? "rgba(0,0,0,0.15)" : (chartParms.source == "deaths") ? "#FDDED6" : "#D8E7FE",
         fill: "origin",
         tension: 0,
         borderJoinStyle: "round",
         parsing: false,
         data: this.dataPoints };
      const datasets: Partial<ChartJs.ChartDataset<"line">>[] = [yDataSet];
      const isXAxisLog = isXy && chartParms.scale == "log";
      const isYAxisLog = !isTrend && !isCfr && chartParms.scale == "log";
      const valAxisType = (!isTrend && !isCfr && chartParms.scale == "log") ? "logarithmic" : "linear";
      const valAxisMin =
         (isCfr || chartParms.scale == "lin") ? 0 :
         (chartParms.absRel == "abs") ? 1 :
         xySync.yMin ?? (100 / (this.dataRecord.population ?? 1000));
      const xAxisType = isXy ? valAxisType : "time";
      const yAxisType = valAxisType;
      const xAxisMin = isXy ? valAxisMin : firstDay.format(dateFormat);
      const xAxisMax = isXy ? undefined : lastDay.clone().add(1, "d").format(dateFormat);
      const xAxisSuggestedMin = xySync.xMin;
      const xAxisSuggestedMax = xySync.xMax;
      const yAbsMax = Math.max(Math.abs(this.dataMinMax.yMin ?? 0), Math.abs(this.dataMinMax.yMax ?? 0));
      const yMaxTrend = Math.ceil(Math.max(1, yAbsMax));
      const fixedMaxRelTrend = 20;
      const yAxisMin = isRelTrend ? -fixedMaxRelTrend : isTrend ? undefined : valAxisMin;
      const yAxisMax = isRelTrend ?  fixedMaxRelTrend : isYAxisLog ? roundAxisLogMax(xySync.yMax) : undefined;
      const yAxisSuggestedMin = xySync.yMin ?? (isTrend ? -yMaxTrend : undefined);
      const yAxisSuggestedMax = xySync.yMax ?? (isTrend ?  yMaxTrend : undefined);
         // Note: yAxisSuggestedMax seems to have no effect for log axes.
      const xScale: any /* ChartJs.ScaleOptions<"linear"> | ChartJs.ScaleOptions<"logarithmic"> | ChartJs.ScaleOptions<"time"> */ = {  // TODO: Remove <any> after Chart.js v3.0.0-beta.7
         type: <any>xAxisType,
         min: <any>xAxisMin,
         max: <any>xAxisMax,
         suggestedMin: xAxisSuggestedMin,
         suggestedMax: xAxisSuggestedMax,
         time: {
            parser: dateFormat,
            unit: "week",
            isoWeekday: 1,
            displayFormats: {
               week: "MMM D" }},
         ticks: {
            maxTicksLimit: <any>(isXAxisLog ? 12 : undefined),
            color: fontColor,
            callback: (value: any, index: number, values: any) => this.ticksCallback(value, index, values, false, isXAxisLog) }};
      const yScale: any /* ChartJs.ScaleOptions<"linear"> | ChartJs.ScaleOptions<"logarithmic"> */ = { // TODO: Remove <any> after Chart.js v3.0.0-beta.7
         type: <any>yAxisType,
         min: yAxisMin,
         max: yAxisMax,
         suggestedMin: yAxisSuggestedMin,
         suggestedMax: yAxisSuggestedMax,
         ticks: {
            maxTicksLimit: isYAxisLog ? 9 : 11,
            color: fontColor,
            callback: (value: any, index: number, values: any) => this.ticksCallback(value, index, values, true, isYAxisLog) }};
      const scales = {x: xScale, y: yScale};
      const tooltipCallbacks: Partial<ChartJs.TooltipCallbacks<"line">> = {
            title: (items: ChartJs.TooltipItem<"line">[]) => this.tooltipTitleCallback(items),
            label: (item: ChartJs.TooltipItem<"line">) => this.tooltipLabelCallback(item, isXy) };
      const tooltipOptions: Partial<ChartJs.TooltipOptions> = {
         displayColors: false,
         callbacks: <ChartJs.TooltipCallbacks<"line">>tooltipCallbacks };
      const pluginOptions: Partial<ChartJs.PluginOptionsByType<"line">> = {
         tooltip: <ChartJs.TooltipOptions>tooltipOptions };
      const options: ChartJs.ChartOptions<"line"> = {
         scales,
         plugins: pluginOptions,
         responsive: true,
         maintainAspectRatio: false };
      return {
         type: "line",
         data: <ChartJs.ChartData>{ datasets },
         options }; }

   private prepRelLogValues (a1: Float64Array) : Float64Array {
      const chartParms = this.chartParms;
      const n = a1.length;
      const a2 = new Float64Array(n);
      const relative = chartParms.absRel == "rel";
      const log = chartParms.scale == "log";
      for (let i = 0; i < days; i++) {
         let v = a1[i];
         if (log) {
            v = Math.max(v, 1E-3); }
         if (relative) {
            v = v * 100 / (this.dataRecord.population ?? NaN); }
         a2[i] = v; }
      return a2; }

   private ticksCallback (_valueFmt: any, index: number, values: any, isYAxis: boolean, isLog: boolean) : string {
      const value = values[index].value;
      let unit: number;
      if (isLog) {
         // For log axis, we ignore the lowest value (valueAxisMin), because it's not a regularly distributed value.
         unit = values[2].value - values[1].value; }
       else {
         unit = Math.abs(values[0].value - values[values.length - 1].value) / (values.length - 1); }
      return this.formatLabel(value, isYAxis, false, unit); }

   private formatLabel (value: any, isYAxis: boolean, extendedFormat: boolean, unit?: number) : string {
      const chartParms = this.chartParms;
      const isCfr = chartParms.source == "cfr";
      const isTrend = !isCfr && chartParms.mode == "trend";
      const type =
         isCfr ? (isYAxis ? "rel" : "time") :
         (isYAxis || chartParms.mode == "dailyAvgCum") ? chartParms.absRel :
         "time";
      switch (type) {
         case "abs": {
            let v = <number>value;
            const r = (v < 10) ? 10 : 1;
            v = Math.round(v * r) / r;                     // (rounding is done because averaging leads to non-integer values)
            return formatNumber(v, isTrend) + (extendedFormat ? " " + this.genLabelLegend(isYAxis) : ""); }
         case "rel": {
            const v = <number>value;
            const unit2 = unit ?? Math.abs(v) / 100;
            const d = Math.ceil(-Math.log10(unit2) - 0.001);
            const fractionDigits = (extendedFormat && v == 0) ? 0 : Math.max(0, Math.min(8, d));
            return formatPercent(v / 100, fractionDigits, isTrend) + (extendedFormat ? " " + this.genLabelLegend(isYAxis) : ""); }
         case "time": {
            const m = moment.isMoment(value) ? value : moment(value);      // (moment() and not moment.utc() must be used here)
            return m.format(extendedFormat ? "MMM D, YYYY" : "MMM D"); }
         default: {
            return String(value); }}}

   private genLabelLegend (isYAxis: boolean) {
      const chartParms = this.chartParms;
      // (not yet used for time values)
      if (chartParms.source == "cfr") {
         return `case fatality rate (${Calc.calcParms.caseDeathTimeLag} days cases/deaths time-lag, ${Calc.calcParms.dailyAvgDays} days average)`; }
      const isTrend = isYAxis && chartParms.mode == "trend";
      const avg = chartParms.mode == "dailyAvg" || (chartParms.mode == "dailyAvgCum" && isYAxis) || isTrend;
      const avgDays = isTrend ? calcParms.trendDays : calcParms.dailyAvgDays;
      const cumulative = chartParms.mode == "cumulative" || chartParms.mode == "cleaned" || chartParms.mode == "dailyAvgCum" && !isYAxis;
      const daily = !cumulative;
      return (cumulative ? "cumulative " : "") +
         chartParms.source +
         (isTrend ? " trend growth" : "") +
         (daily ? " per day" : "") +
         (avg ? ` (average over the previous ${avgDays} days)` : ""); }

   private tooltipTitleCallback (items: ChartJs.TooltipItem<"line">[]) : string | string[] {
      const p = items[0].dataIndex;
      const d = firstDay.clone().add(p, "d");
      return d.format("MMM D, YYYY"); }

   private tooltipLabelCallback (item: ChartJs.TooltipItem<"line">, isXy: boolean) : string | string[] {
      // const point = <ChartJs.Point>data.datasets![item.datasetIndex!].data![item.index!];
      // const point = item.dataset.data[item.dataIndex];
      const point = this.dataPoints[item.dataIndex];
      if (isXy) {
         return [this.formatLabel(point.y, true, true), this.formatLabel(point.x, false, true)]; }
       else {
         return this.formatLabel(point.y, true, true); }}

   }

//------------------------------------------------------------------------------

function roundAxisLogMax (v: number | undefined) {
   if (v == undefined || !isFinite(v) || v <= 0) {
      return; }
   const v2 = v * 1.1;
   const v3 = 10 ** Math.ceil(Math.log10(v2));
   const v4 = v3 / 2;
   return (v4 >= v2) ? v4 : v3; }

function prepareAllCharts (chartParms: ChartParms) {
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      const chartController = chartControllers[regionNdx];
      if (!chartController) {
         continue; }
      chartController.prepare(chartParms); }}

function completeAllCharts (xySync: XyMinMax) {
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      const chartController = chartControllers[regionNdx];
      if (!chartController) {
         continue; }
      chartController.complete(xySync); }}

function getOverallDataMinMax() : XyMinMax {
   const mm = <XyMinMax>{};
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      const chartController = chartControllers[regionNdx];
      if (!chartController) {
         continue; }
      const mm2 = chartController.dataMinMax;
      mm.xMin = min(mm.xMin, mm2.xMin);
      mm.xMax = max(mm.xMax, mm2.xMax);
      mm.yMin = min(mm.yMin, mm2.yMin);
      mm.yMax = max(mm.yMax, mm2.yMax); }
   return mm;
   function min (v1: number|undefined, v2: number|undefined) {
      return (v1 == undefined) ? v2 : (v2 == undefined) ? v1 : Math.min(v1, v2); }
   function max (v1: number|undefined, v2: number|undefined) {
      return (v1 == undefined) ? v2 : (v2 == undefined) ? v1 : Math.max(v1, v2); }}

function genXySync (chartParms: ChartParms) : XyMinMax {
   if (activeCharts <= 1) {
      return {}; }
   const mm = getOverallDataMinMax();
   if (chartParms.source == "cfr") {
      return {yMax: mm.yMax}; }
   const valAxisMin = (chartParms.scale == "log" && chartParms.absRel == "rel") ? 1E-5 : undefined;
   switch (chartParms.mode) {
      case "trend": {
         const absMax = Math.max(Math.abs(mm.yMin ?? 0), Math.abs(mm.yMax ?? 0));
         const maxTrend = Math.ceil(Math.max(1, absMax));
         return {yMin: -maxTrend, yMax: maxTrend}; }
      case "dailyAvgCum": {
         return {xMin: valAxisMin, xMax: mm.xMax, yMin: valAxisMin, yMax: mm.yMax}; }
      default: {
         return {yMin: valAxisMin, yMax: mm.yMax}; }}}

export function createChart (canvas: HTMLCanvasElement, regionNdx: number, chartParms: ChartParms, sync: boolean, updateAll: boolean) {
   if (!chartControllers[regionNdx]) {
      chartControllers[regionNdx] = new ChartController(canvas, regionNdx);
      activeCharts++; }
   if (updateAll) {
      prepareAllCharts(chartParms); }
    else {
      chartControllers[regionNdx]!.prepare(chartParms); }
   const xySync = sync ? genXySync(chartParms) : {};
   if (updateAll) {
      completeAllCharts(xySync); }
    else {
      chartControllers[regionNdx]!.complete(xySync); }}

export function syncCharts (chartParms: ChartParms) {
   prepareAllCharts(chartParms);
   const xySync = genXySync(chartParms);
   completeAllCharts(xySync); }

export function destroyChart (regionNdx: number) {
   const chartController = chartControllers[regionNdx];
   if (!chartController) {
      return; }
   chartController.destroy();
   chartControllers[regionNdx] = undefined;
   activeCharts--; }

export function destroyAllCharts() {
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      destroyChart(regionNdx); }}

export function init() {
   ChartJs.Chart.register(ChartJs.LineController, ChartJs.LineElement, ChartJs.LinearScale, ChartJs.LogarithmicScale, ChartJs.TimeScale, ChartJs.Title, ChartJs.PointElement, ChartJs.Tooltip, ChartJs.Filler);
   chartControllers = Array(regions); }
