import {regions, firstDay, lastDay, days, regionDataTable, RegionDataRecord} from "./DataSource";
import {formatNumber, formatPercent} from "./utils/MiscUtils";
import {calcParms} from "./Calc";
import * as Calc from "./Calc";
import ChartJs_Chart from "chart.js";
import * as ChartJs from "chart.js";
import moment from "moment";
import "./tempExtSource/chartjs-adapter-moment.js";        // imported for side-effects only

export interface ChartParms {                              // chart parameters
   source:                   string;                       // "deaths", "cases"
   mode:                     string;                       // "daily", "dailyAvg", "cumulative", "dailyAvgCum", "trend"
   absRel:                   string;                       // "abs" = absolute, "rel" = relative values
   scale:                    string; }                     // "lin" = linear, "log" = logarithmic

var chartControllers:        (ChartController | undefined)[];

class ChartController {

   private regionNdx:        number;
   private dataRecord:       RegionDataRecord;
   private chartParms:       ChartParms;
   private chart:            ChartJs_Chart;

   constructor (canvas: HTMLCanvasElement, regionNdx: number, chartParms: ChartParms) {
      this.regionNdx = regionNdx;
      this.dataRecord = regionDataTable[this.regionNdx];
      this.chartParms = chartParms;
      const ctx = canvas.getContext('2d')!;
      const chartConfig = this.createChartConfig();
      this.chart = new ChartJs_Chart(ctx, chartConfig); }

   public destroy() {
      this.chart.destroy(); }

   private createChartConfig() : ChartJs.ChartConfiguration {
      const chartParms = this.chartParms;
      const isTrend = chartParms.mode == "trend";
      const isXy = chartParms.mode == "dailyAvgCum";
      const fontColor = "#000";
      const dateFormat = "YYYY-MM-DD";
      const dataPoints = this.genChartDataPoints();
      const yDataSet: /* ChartJs.ChartDataSets */ any = {
         borderColor:     (chartParms.source == "deaths") ? "#FF6B5F" : "#0066FF",
         backgroundColor: isTrend ? "rgba(0,0,0,0.15)" : (chartParms.source == "deaths") ? "#FDDED6" : "#D8E7FE",
         lineTension: 0,
         borderJoinStyle: "round",
         parsing: false,
         data: dataPoints };
      const datasets: ChartJs.ChartDataSets[] = [yDataSet];
      const yAxisType = (chartParms.scale == "log" && !isTrend) ? "logarithmic" : "linear";
      const {yMin, yMax} = this.findDataPointsMinMax(dataPoints);
      const yAbsMax = Math.max(Math.abs(yMin), Math.abs(yMax));
      const yMaxTrend = Math.ceil(Math.max(1, yAbsMax));
      const yAxisMin =
         isTrend ? undefined :
         (chartParms.scale == "lin") ? 0 :
         (chartParms.absRel == "abs") ? 1 :
         100 / (this.dataRecord.population ?? 1000);
      const yAxisMax = undefined;
      const yAxisSuggestedMin = isTrend ? -yMaxTrend : undefined;
      const yAxisSuggestedMax = isTrend ? yMaxTrend : undefined;
      const isXAsisLog = isXy && chartParms.scale == "log";
      const isYAsisLog = chartParms.scale == "log" && !isTrend;
      const scales: /* ChartJs.ChartScales */ any = {
         x: {
            type: isXy ? yAxisType : "time",
            min: isXy ? yAxisMin : firstDay.format(dateFormat),
            max: isXy ? undefined : lastDay.clone().add(1, "d").format(dateFormat),
            time: {
               parser: dateFormat,
               unit: "week",
               isoWeekday: true,
               displayFormats: {
                  week: "MMM D" }},
            ticks: {
               maxTicksLimit: isXAsisLog ? 12 : undefined,
               fontColor,
               callback: (value: any, index: number, values: any) => this.ticksCallback(value, index, values, false, isXAsisLog) }},
         y: {
            type: yAxisType,
            min: yAxisMin,
            max: yAxisMax,
            suggestedMin: yAxisSuggestedMin,
            suggestedMax: yAxisSuggestedMax,
      //    scaleLabel: {
      //       display: true,
      //       labelString: "...",
      //       fontColor },
            ticks: {
      //       beginAtZero: true,
               maxTicksLimit: isYAsisLog ? 9 : 11,
               fontColor,
               callback: (value: any, index: number, values: any) => this.ticksCallback(value, index, values, true, isYAsisLog) }}};
      const elementsOptions: ChartJs.ChartElementsOptions = {
      // point: {
      //    radius: 0 }
         };
      const legendOptions: ChartJs.ChartLegendOptions = {
         display: false };
      const tooltipOptions: ChartJs.ChartTooltipOptions = {
         displayColors: false,
         callbacks: {
            title: (items: ChartJs.ChartTooltipItem[], data: ChartJs.ChartData) => this.tooltipTitleCallback(items, data),
            label: (item: ChartJs.ChartTooltipItem, data: ChartJs.ChartData) => this.tooltipLabelCallback(item, data, isXy) }};
      const options: ChartJs.ChartOptions = {
      // animation: {duration: 0},
         scales,
         elements: elementsOptions,
         legend: legendOptions,
         tooltips: tooltipOptions,
         responsive: false };
      return {
         type: "line",
         data: { datasets },
         options }; }

   private findDataPointsMinMax (dataPoints: ChartJs.ChartPoint[]) {
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const p of dataPoints) {
         if (typeof p.y == "number" && isFinite(p.y)) {
            yMin = Math.min(yMin, p.y);
            yMax = Math.max(yMax, p.y); }}
      return {yMin, yMax}; }

   private genChartDataPoints() : ChartJs.ChartPoint[] {
      if (this.chartParms.mode == "dailyAvgCum") {
         return this.genXyChartDataPoints(); }
       else {
         return this.genTimeChartDataPoints(); }}

   private genTimeChartDataPoints() : ChartJs.ChartPoint[] {
      const day = firstDay.clone();
      const yVals = this.prepTimeSeriesValues(this.chartParms.mode);
      const points = Array(days);
      for (let i = 0; i < days; i++) {
         points[i] = {
            x: day.clone(),
            y: yVals[i] };
         day.add(1, "d"); }
      return points; }

   private genXyChartDataPoints() : ChartJs.ChartPoint[] {
      const yAxisMode = (this.chartParms.mode == "dailyAvgCum") ? "dailyAvg" : "daily";
      const xVals = this.prepTimeSeriesValues("cumulative");
      const yVals = this.prepTimeSeriesValues(yAxisMode);
      const points = Array(days);
      for (let i = 0; i < days; i++) {
         points[i] = {
            x: xVals[i],
            y: yVals[i] }; }
      return points; }

   private prepTimeSeriesValues (mode2: string) : Float64Array {
      const chartParms = this.chartParms;
      let sourceVals: Float64Array | undefined;
      switch (chartParms.source) {
         case "deaths": sourceVals = this.dataRecord.deaths; break;
         case "cases":  sourceVals = this.dataRecord.cases;  break;
         default: throw new Error("Unknown source."); }
      if (!sourceVals) {
         throw new Error("Not source data values available."); }
      let vals: Float64Array;
      switch (mode2) {
         case "daily":    vals = Calc.differentiate(sourceVals, 1); break;
         case "dailyAvg": vals = Calc.differentiate(sourceVals, calcParms.dailyAvgDays); break;
         case "trend":    return Calc.getTrendSeries(sourceVals, chartParms.absRel == "rel");
         default:         vals = sourceVals; }
      return this.prepRelLogValues(vals); }

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

   private ticksCallback (_valueFmt: any, index: number, values: any, isYAxis: boolean, isLog: boolean) : any {
      const value = values[index].value;
      let unit: number;
      if (isLog) {
         // For log axis, we ignore the lowest value (valueAxisMin), because it's not a regularly distributed value.
         if (isYAxis) {
            unit = values[values.length - 3].value - values[values.length - 2].value; }
          else {
            unit = values[2].value - values[1].value; }}
       else {
         unit = Math.abs(values[0].value - values[values.length - 1].value) / (values.length - 1); }
      return this.formatLabel(value, isYAxis, false, unit); }

   private formatLabel (value: any, isYAxis: boolean, extendedFormat: boolean, unit?: any) : string {
      const chartParms = this.chartParms;
      const isTrend = chartParms.mode == "trend";
      const type =
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
      const isTrend = isYAxis && chartParms.mode == "trend";
      const avg = chartParms.mode == "dailyAvg" || (chartParms.mode == "dailyAvgCum" && isYAxis) || isTrend;
      const avgDays = isTrend ? calcParms.trendDays : calcParms.dailyAvgDays;
      const cumulative = chartParms.mode == "cumulative" || chartParms.mode == "dailyAvgCum" && !isYAxis;
      const daily = !cumulative;
      return (cumulative ? "cumulative " : "") +
         chartParms.source +
         (isTrend ? " trend growth" : "") +
         (daily ? " per day" : "") +
         (avg ? ` (average over the previous ${avgDays} days)` : ""); }

   private tooltipTitleCallback (items: ChartJs.ChartTooltipItem[], _data: ChartJs.ChartData) : string | string[] {
      const p = items[0].index!;
      const d = firstDay.clone().add(p, "d");
      return d.format("MMM D, YYYY"); }

   private tooltipLabelCallback (item: ChartJs.ChartTooltipItem, data: ChartJs.ChartData, isXy: boolean) : string | string[] {
      const point = <ChartJs.ChartPoint>data.datasets![item.datasetIndex!].data![item.index!];
      if (isXy) {
         return [this.formatLabel(point.y, true, true), this.formatLabel(point.x, false, true)]; }
       else {
         return this.formatLabel(point.y, true, true); }}

   }

//------------------------------------------------------------------------------

export function createChart (canvas: HTMLCanvasElement, regionNdx: number, chartParms: ChartParms) {
   destroyChart(regionNdx);
   chartControllers[regionNdx] = new ChartController(canvas, regionNdx, chartParms); }

export function destroyChart (regionNdx: number) {
   const chartController = chartControllers[regionNdx];
   if (!chartController) {
      return; }
   chartController.destroy();
   chartControllers[regionNdx] = undefined; }

export function destroyAllCharts() {
   for (let regionNdx = 0; regionNdx < regions; regionNdx++) {
      destroyChart(regionNdx); }}

export function init() {
   chartControllers = Array(regions); }
