import moment from "moment";
import {Moment} from "moment";
import {Scanner} from "./utils/TextFileScanner";
import {fetchTextFile, formatDateIso} from "./utils/MiscUtils";

// URLs for Johns Hopkins data repository in GitHub:
const regionTableUrl            = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv";
const globalCasesTimeSeriesUrl  = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv";
const globalDeathsTimeSeriesUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv";
const usCasesTimeSeriesUrl      = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv";
const usDeathsTimeSeriesUrl     = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv";

export interface RegionDataRecord {
   uid:                      number;                       // "UID": permanent unique region ID
   countryCode2?:            string;                       // "iso2": 2-character ISO country code
   countryCode3?:            string;                       // "iso3": 3-character ISO country code
   countryNo?:               number;                       // "code3": 3-digit ISO country number
   fipsCode?:                number;                       // "FIPS": FIPS US county code (number)
   admin2?:                  string;                       // "Admin2": US admin region name
   provinceOrState?:         string;                       // "Province_State": province or state
   countryOrRegion:          string;                       // "Country_Region": country or region name
   latitude?:                number;                       // "lat": geographic latitude
   longitude?:               number;                       // "Long_": geographic longitude
   combinedName:             string;                       // "Combined_Key": Combination of provice/state and country/region
   population?:              number;                       // "Population": pupulation size
   isCountry:                boolean;                      // true if this entry is for a country
   cases?:                   Float64Array;                 // reported cases time series
   deaths?:                  Float64Array; }               // reported deaths time series

export var regions:          number;                       // number of regionDataTable entries
export var days:             number;                       // number of days in time series
export var regionDataTable:  RegionDataRecord[];
export var firstDay:         Moment;                       // first day in time series
export var lastDay:          Moment;                       // last day in time series

var regionDataTableIndex1:   Map<string,RegionDataRecord>; // maps countryOrRegion+provinceOrState to regionDataTable entries
var regionDataTableIndex2:   Map<number,RegionDataRecord>; // maps uid to regionDataTable entries

function cachedUrl (s: string) : string {
   if (window.location.protocol == "file:") {
      return s; }
   const fileName = s.substring(s.lastIndexOf("/") + 1);
   return "dataCache/" + fileName; }

async function loadRegionDataTable() {
   const text = await fetchTextFile(cachedUrl(regionTableUrl));
   const scanner = new Scanner(text, ",");
   scanner.skipEol();                                      // skip header line
   regionDataTable = [];
   regionDataTableIndex1 = new Map();
   regionDataTableIndex2 = new Map();
   while (!scanner.eof()) {
      const r = parseLine();
      scanner.skipEol();
      if (!r) {
         continue; }
      regionDataTable.push(r);
      regionDataTableIndex1.set(r.countryOrRegion + "|" + (r.provinceOrState ?? ""), r);
      regionDataTableIndex2.set(r.uid, r); }

   function parseLine() : RegionDataRecord | undefined {
      scanner.skipBlanks();
      if (scanner.eol()) {
         return; }
      const r = <RegionDataRecord>{};
      r.uid             = scanner.scanNumberFieldReq();
      r.countryCode2    = scanner.scanStringFieldOpt();
      r.countryCode3    = scanner.scanStringFieldOpt();
      r.countryNo       = scanner.scanNumberFieldOpt();
      r.fipsCode        = scanner.scanNumberFieldOpt();
      r.admin2          = scanner.scanStringFieldOpt();
      r.provinceOrState = scanner.scanStringFieldOpt();
      r.countryOrRegion = scanner.scanStringFieldReq();
      r.latitude        = scanner.scanNumberFieldOpt();
      r.longitude       = scanner.scanNumberFieldOpt();
      r.combinedName    = scanner.scanStringFieldReq();
      r.population      = scanner.scanNumberFieldOpt();
      r.isCountry       = !!r.countryCode2 && !r.provinceOrState;
      return r; }}

function decodeTimeSeriesDate (s: string) : Moment {
   const d = moment.utc(s, ["M/D/YY", "M/D/YYYY"], true);
   if (!d.isValid()) {
      throw new Error(`Parse error for date value "${s}".`); }
   return d; }

function processTimeSeriesHeader (text: string, prefixFields: number) {
   const scanner = new Scanner(text, ",");
   scanner.skipFields(prefixFields);
   const d = decodeTimeSeriesDate(scanner.scanStringFieldReq());
   if (!firstDay) {
      firstDay = d.clone(); }
    else {
      if (!firstDay.isSame(d)) {
         throw new Error(`First day of time series does not match (${formatDateIso(firstDay)}, ${formatDateIso(d)}).`); }}
   while (true) {
      scanner.skipBlanks();
      if (scanner.eol()) {
         break; }
      d.add(1, "d");
      const d2 = decodeTimeSeriesDate(scanner.scanStringFieldReq());
      if (!d.isSame(d2)) {
         throw new Error("Date mismatch in time series header."); }}
   if (!lastDay) {
      lastDay = d; }
    else {
      lastDay = moment.min(lastDay, d); }}

function processTimeSeriesData (text: string, kind1: number, kind2: number) {
   const scanner = new Scanner(text, ",");
   scanner.skipEol();                                      // skip header line
   while (!scanner.eof()) {
      processTimeSeriesLine();
      scanner.skipEol(); }

   function processTimeSeriesLine() {
      scanner.skipBlanks();
      if (scanner.eol()) {
         return; }
      let r: RegionDataRecord | undefined;
      switch (kind2) {
         case 0: {                                         // global time series format
            const provinceOrState = scanner.scanStringFieldOpt();
            if (provinceOrState == "Recovered") {
               return; }                                   // ignore "Recovered" entries
            const countryOrRegion = scanner.scanStringFieldReq();
            r = regionDataTableIndex1.get(countryOrRegion + "|" + (provinceOrState ?? ""));
            if (!r) {
               console.log(`Region not found for global time series (countryOrRegion="${countryOrRegion}", provinceOrState="${provinceOrState ?? ""}").`);
               return; }
            scanner.skipFields(2);                         // skip "Lat"+"Long" fields
            break; }
         case 1: {                                         // US time series format
            const uid = scanner.scanNumberFieldOpt();
            if (!uid) {
               console.log(`Missing UID in US time series record at line ${scanner.lineNo}.`);
               return; }
            r = regionDataTableIndex2.get(uid);
            if (!r) {
               console.log(`UID not found for US time series (UID=${uid}).`);
               return; }
            scanner.skipFields(kind1 == 0 ? 10 : 11);      // skip unused fields
            break; }
         default: {
            throw new Error("Unknown kind2."); }}
      const a = scanner.scanFloat64Array(days);
      switch (kind1) {
         case 0: r.cases  = a; break;
         case 1: r.deaths = a; break; }}}

async function loadTimeSeries() {
   const globalCasesText  = await fetchTextFile(cachedUrl(globalCasesTimeSeriesUrl));
   const globalDeathsText = await fetchTextFile(cachedUrl(globalDeathsTimeSeriesUrl));
   const usCasesText      = await fetchTextFile(cachedUrl(usCasesTimeSeriesUrl));
   const usDeathsText     = await fetchTextFile(cachedUrl(usDeathsTimeSeriesUrl));
   processTimeSeriesHeader(globalCasesText,   4);
   processTimeSeriesHeader(globalDeathsText,  4);
   processTimeSeriesHeader(usCasesText,      11);
   processTimeSeriesHeader(usDeathsText,     12);
   days = lastDay.diff(firstDay, "d") + 1;
   // console.log("Days: " + days + " " + formatDateIso(firstDay) + " " + formatDateIso(lastDay));
   processTimeSeriesData(globalCasesText,  0, 0);
   processTimeSeriesData(globalDeathsText, 1, 0);
   processTimeSeriesData(usCasesText,      0, 1);
   processTimeSeriesData(usDeathsText,     1, 1); }

// Some countries with provinces have no totals.
// Currently: Australia, Canada, China
// See https://github.com/CSSEGISandData/COVID-19/issues/1743
function generateMissingTimeSeries() {
   for (const r of regionDataTable) {
      if (r.isCountry && (!r.cases || !r.deaths)) {
         // console.log("Time series missing for: " + r.countryOrRegion);
         if (!r.cases) {
            r.cases  = sumTimeSeriesForCountry(r.countryCode2!, 0); }
         if (!r.deaths) {
            r.deaths = sumTimeSeriesForCountry(r.countryCode2!, 1); }}}}

function sumTimeSeriesForCountry (countryCode2: string, kind: number) : Float64Array {
   const a = new Float64Array(days);
   for (const r of regionDataTable) {
      if (r.countryCode2 == countryCode2 && r.provinceOrState ) {
         switch (kind) {
            case 0: addFloat64Array(a, r.cases);  break;
            case 1: addFloat64Array(a, r.deaths); break; }}}
   return a; }

function createWorldEntry() {
   let worldPopulation = 0;
   const worldCases = new Float64Array(days);
   const worldDeaths = new Float64Array(days);
   for (const r of regionDataTable) {
      if (r.isCountry) {
         worldPopulation += r.population ?? 0;
         addFloat64Array(worldCases, r.cases);
         addFloat64Array(worldDeaths, r.deaths); }}
   regionDataTable.push({
      uid:             -1,
      countryOrRegion: "World",
      combinedName:    "World",
      population:      worldPopulation,
      isCountry:       false,
      cases:           worldCases,
      deaths:          worldDeaths }); }

function addFloat64Array (a1: Float64Array, a2: Float64Array | undefined) {
   if (!a2) {
      return; }
   if (a1.length != a2.length) {
      throw new Error("Array size mismatch."); }
   for (let i = 0; i < a1.length; i++) {
      a1[i] += a2[i]; }}

export async function init() {
   await loadRegionDataTable();
   await loadTimeSeries();
   generateMissingTimeSeries();
   createWorldEntry();
   regions = regionDataTable.length; }
